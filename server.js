const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const tls = require("node:tls");
const { URL } = require("node:url");

loadEnvFile(".env.local");
loadEnvFile(".env");

const PORT = Number(process.env.KOL_COMPASS_API_PORT || 8015);
const API_BASE_URL = process.env.TIKTOK_SHOP_API_BASE_URL || "https://open-api.tiktokglobalshop.com";
const AUTH_BASE_URL = process.env.TIKTOK_SHOP_AUTH_BASE_URL || "https://auth.tiktok-shops.com";
const FRONTEND_URL = process.env.KOL_COMPASS_FRONTEND_URL || "http://127.0.0.1:5175";
const APP_KEY = process.env.TIKTOK_SHOP_APP_KEY || process.env.APP_KEY || "";
const APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET || process.env.APP_SECRET || "";
const REDIRECT_URI = process.env.TIKTOK_SHOP_REDIRECT_URI || "http://127.0.0.1:8015/api/tiktok/callback";
const DATA_DIR = path.join(__dirname, ".data");
const TOKEN_FILE = path.join(DATA_DIR, "tiktok-token.json");
const TOKENS_FILE = path.join(DATA_DIR, "tiktok-tokens.json");
const STATE_FILE = path.join(DATA_DIR, "tiktok-oauth-state.json");
const CREATOR_FILE = path.join(DATA_DIR, "platform-creators.json");
const CATEGORY_FILE = path.join(DATA_DIR, "tiktok-categories.json");
const CREATOR_JOB_FILE = path.join(DATA_DIR, "platform-creator-job.json");
const MERCHANT_CONTEXT_FILE = path.join(DATA_DIR, "merchant-context.json");
const LEGACY_IMPORT_FILE = path.join(DATA_DIR, "legacy-import", "sg-creators.json");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");
const CREATOR_MARKET_PRIORITY = (process.env.KOL_CREATOR_MARKET_PRIORITY || "SG,MY,TH,VN,PH")
  .split(",")
  .map((x) => x.trim().toUpperCase())
  .filter(Boolean);
const CREATOR_AUTO_IMPORT_ENABLED = process.env.KOL_CREATOR_AUTO_IMPORT_ENABLED !== "false";
// 实测：marketplace search 约每翻 4 页就被限流(36009002)。间隔放到 20s 让采集稳在限流线下持续爬，而不是疯狂撞墙触发长退避。
const CREATOR_AUTO_IMPORT_INTERVAL_MS = Number(process.env.KOL_CREATOR_AUTO_IMPORT_INTERVAL_MS || 20 * 1000);
const CREATOR_AUTO_IMPORT_INITIAL_DELAY_MS = Number(process.env.KOL_CREATOR_AUTO_IMPORT_INITIAL_DELAY_MS || 5 * 1000);
const CREATOR_AUTO_IMPORT_PAGE_SIZE = Number(process.env.KOL_CREATOR_AUTO_IMPORT_PAGE_SIZE || 20);
const CREATOR_AUTO_IMPORT_PAGES_PER_RUN = Number(process.env.KOL_CREATOR_AUTO_IMPORT_PAGES_PER_RUN || 1);
const CREATOR_SEARCH_PAGE_DELAY_MS = Number(process.env.KOL_CREATOR_SEARCH_PAGE_DELAY_MS || 5000);
const CREATOR_RATE_LIMIT_BACKOFF_MS = parseDurationSchedule(process.env.KOL_CREATOR_RATE_LIMIT_BACKOFF_MS || "60000,120000,300000,600000");
const CREATOR_SEARCH_REFRESH_INTERVAL_MS = Number(process.env.KOL_CREATOR_SEARCH_REFRESH_INTERVAL_MS || 10 * 60 * 1000);
let creatorJobRunning = false;

function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function parseDurationSchedule(value) {
  const values = String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  return values.length ? values : [60000, 120000, 300000, 600000];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function isoAfter(ms) {
  return new Date(Date.now() + Math.max(0, Number(ms) || 0)).toISOString();
}

function isFutureIso(value) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}

function msSinceIso(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? Date.now() - time : Number.POSITIVE_INFINITY;
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readPlatformCreators() {
  const rows = readJson(CREATOR_FILE, []);
  return Array.isArray(rows) ? rows.map(normalizeStoredCreator) : [];
}

function writePlatformCreators(rows) {
  writeJson(CREATOR_FILE, Array.isArray(rows) ? rows.map(normalizeStoredCreator) : []);
}

// 头像缓存：TikTok 签名 CDN 链接会过期/防盗链，落到本地再服务，避免裂图
const AVATAR_EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
function findCachedAvatar(cid) {
  for (const [type, ext] of Object.entries(AVATAR_EXT_BY_TYPE)) {
    const file = path.join(AVATAR_DIR, `${cid}.${ext}`);
    if (fs.existsSync(file)) return { file, type };
  }
  return null;
}
// 头像 key：前端达人 id 是重排序号（1,2,3…），跨刷新不稳，会全裂。
// 改用 username 当 key（TikTok 用户名稳定、跨市场唯一），大小写不敏感。
function avatarKey(cid) {
  return String(cid || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
}
async function serveCreatorAvatar(res, cid) {
  if (!cid) return json(res, 400, { ok: false, code: "BAD_CID" });
  const key = avatarKey(cid);
  let cached = findCachedAvatar(key);
  if (!cached) {
    const raw = String(cid || "").trim().toLowerCase();
    // 兼容老调用：cid 既可能是 username，也可能是历史的 id
    const creator = readPlatformCreators().find(
      (c) => String(c.username || "").trim().toLowerCase() === raw || String(c.id) === String(cid)
    );
    const url = creator && creator.avatarUrl;
    if (!url) return json(res, 404, { ok: false, code: "NO_AVATAR" });
    try {
      // TikTok CDN 头像：必须带浏览器 UA + Referer 过防盗链，并加超时防止裸 fetch 永久挂起
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      let upstream;
      try {
        upstream = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://www.tiktok.com/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*",
          },
        });
      } finally { clearTimeout(timer); }
      if (!upstream.ok) return json(res, 404, { ok: false, code: "AVATAR_FETCH_FAILED" });
      const type = (upstream.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      const ext = AVATAR_EXT_BY_TYPE[type] || "jpg";
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
      const file = path.join(AVATAR_DIR, `${key}.${ext}`);
      fs.writeFileSync(file, buf);
      cached = { file, type: AVATAR_EXT_BY_TYPE[ext] ? type : "image/jpeg" };
    } catch {
      return json(res, 404, { ok: false, code: "AVATAR_FETCH_ERROR" });
    }
  }
  const data = fs.readFileSync(cached.file);
  res.writeHead(200, {
    "Content-Type": cached.type,
    "Cache-Control": "public, max-age=604800",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(data);
}

function metricNumber(value) {
  const number = Number(String(value || "").replaceAll(",", ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function metricFromTags(tags, label) {
  const values = Array.isArray(tags) ? tags : [];
  const row = values.find((tag) => String(tag || "").trim().startsWith(label));
  if (!row) return 0;
  const match = String(row).replaceAll(",", "").match(/(\d+(?:\.\d+)?)/);
  return match ? metricNumber(match[1]) : 0;
}

function normalizeCreatorType(type, metrics = {}) {
  if (type === "短视频+直播达人" || type === "短视频/直播达人") return "短视频+直播达人";
  if (type === "直播达人") return "直播达人";
  if (type === "短视频达人") return "短视频达人";
  const hasVideo = metricNumber(metrics.avgVideoViews) > 0;
  const hasLive = metricNumber(metrics.avgLiveUv) > 0;
  if (hasVideo && hasLive) return "短视频+直播达人";
  if (hasLive) return "直播达人";
  return "短视频达人";
}

function normalizeCreatorTags(tags) {
  const blocked = new Set(["TikTok API", "平台达人库", "联盟达人"]);
  const values = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !blocked.has(tag) && !/^均播\s*/.test(tag) && !/^直播UV\s*/i.test(tag));
  return Array.from(new Set(values));
}

function normalizeStoredCreator(row = {}) {
  const avgVideoViews = metricNumber(row.avgVideoViews ?? row.avgVideoViewCount ?? row.averageVideoViews) || metricFromTags(row.tags, "均播");
  const avgLiveUv = metricNumber(row.avgLiveUv ?? row.avgLiveUvCount ?? row.averageLiveUv) || metricFromTags(row.tags, "直播UV");
  return {
    ...row,
    type: normalizeCreatorType(row.type, { avgVideoViews, avgLiveUv }),
    avgVideoViews,
    avgLiveUv,
    category: normalizeCategoryLabel(row.category),
    categoryLabels: Array.isArray(row.categoryLabels) ? row.categoryLabels.map(normalizeCategoryLabel).filter(Boolean) : [],
    gmv: sanitizeGmvValue(row.gmv || "-"),
    tags: normalizeCreatorTags(row.tags),
  };
}

function readCategoryMap() {
  const value = readJson(CATEGORY_FILE, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function writeCategoryMap(map) {
  writeJson(CATEGORY_FILE, map && typeof map === "object" ? map : {});
}

function readCreatorJobState() {
  const fallback = { markets: {}, runs: [] };
  const state = readJson(CREATOR_JOB_FILE, fallback);
  if (!state || typeof state !== "object") return fallback;
  if (!state.markets || typeof state.markets !== "object") state.markets = {};
  if (!Array.isArray(state.runs)) state.runs = [];
  return state;
}

function writeCreatorJobState(state) {
  writeJson(CREATOR_JOB_FILE, state || { markets: {}, runs: [] });
}

function creatorNextPageToken(upstream) {
  return upstream?.data?.next_page_token
    || upstream?.data?.nextPageToken
    || upstream?.data?.pagination?.next_page_token
    || upstream?.data?.pagination?.nextPageToken
    || "";
}

function isTikTokRateLimitError(error) {
  const payload = error?.payload || {};
  const upstream = payload.upstream || {};
  const code = String(payload.code || upstream.code || "");
  const message = String(error?.message || payload.message || upstream.message || "").toLowerCase();
  return error?.statusCode === 429
    || code === "36009002"
    || message.includes("too many request")
    || message.includes("rate limit")
    || message.includes("downstream");
}

function creatorBackoffMs(rateLimitCount) {
  const index = Math.max(0, Math.min((Number(rateLimitCount) || 1) - 1, CREATOR_RATE_LIMIT_BACKOFF_MS.length - 1));
  return CREATOR_RATE_LIMIT_BACKOFF_MS[index];
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function html(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function requiredConfig() {
  const missing = [];
  if (!APP_KEY) missing.push("TIKTOK_SHOP_APP_KEY");
  if (!APP_SECRET) missing.push("TIKTOK_SHOP_APP_SECRET");
  return missing;
}

function generateSign(apiPath, params, headers, requestBody, appSecret) {
  const excluded = new Set(["access_token", "sign"]);
  const paramString = Object.entries(params)
    .filter(([key]) => !excluded.has(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  let signString = `${apiPath}${paramString}`;
  const contentType = String(headers["content-type"] || headers["Content-Type"] || "");
  if (!contentType.includes("multipart/form-data") && requestBody !== null && requestBody !== undefined) {
    signString += JSON.stringify(requestBody);
  }
  signString = `${appSecret}${signString}${appSecret}`;
  return crypto.createHmac("sha256", appSecret).update(signString).digest("hex");
}

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function tiktokFetch(apiPath, { method = "GET", params = {}, body = null, token = null } = {}) {
  const missing = requiredConfig();
  if (missing.length) {
    const error = new Error(`Missing config: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.payload = { ok: false, code: "CONFIG_MISSING", message: error.message, missing };
    throw error;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const query = { ...params, app_key: APP_KEY, timestamp };
  const headers = {
    "Content-Type": "application/json",
    "x-tts-access-token": token || readToken()?.access_token || "",
  };
  if (!headers["x-tts-access-token"]) {
    const error = new Error("TikTok Shop token not found. Bind a shop first.");
    error.statusCode = 401;
    error.payload = { ok: false, code: "TOKEN_MISSING", message: error.message };
    throw error;
  }

  const sign = generateSign(apiPath, query, headers, body, APP_SECRET);
  const url = new URL(apiPath, API_BASE_URL);
  for (const [key, value] of Object.entries({ ...query, sign })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok || (data && typeof data.code !== "undefined" && data.code !== 0)) {
    const error = new Error(data.message || `TikTok Shop API failed: HTTP ${response.status}`);
    error.statusCode = response.status || 502;
    error.payload = { ok: false, code: data.code || "TIKTOK_API_ERROR", message: error.message, upstream: data };
    throw error;
  }
  return data;
}

// ——— 多店铺 token 存储（按 open_id 存多份，支持单商家多店并存） ———
function readTokenStore() {
  const store = readJson(TOKENS_FILE, null);
  if (store && store.tokens && typeof store.tokens === "object") return store;
  // 迁移旧单 token 文件
  const legacy = readJson(TOKEN_FILE, null);
  if (legacy && legacy.access_token) {
    const oid = legacy.open_id || "default";
    return { tokens: { [oid]: { ...legacy, shops: legacy.shops || [] } }, activeOpenId: oid };
  }
  return { tokens: {}, activeOpenId: "" };
}
function writeTokenStore(store) {
  writeJson(TOKENS_FILE, store && typeof store === "object" ? store : { tokens: {}, activeOpenId: "" });
}
function activeToken() {
  const store = readTokenStore();
  return store.tokens[store.activeOpenId] || Object.values(store.tokens)[0] || null;
}
function readToken() {
  return activeToken();
}
function shopCipherField(shop) {
  return shop?.cipher || shop?.shop_cipher || "";
}
function upsertTokenEntry(tokenData, shops) {
  const store = readTokenStore();
  const oid = tokenData.open_id || tokenData.seller_name || "default";
  const prev = store.tokens[oid] || {};
  store.tokens[oid] = {
    ...prev,
    ...tokenData,
    shops: Array.isArray(shops) && shops.length ? shops : (prev.shops || []),
    saved_at: new Date().toISOString(),
  };
  store.activeOpenId = oid;
  writeTokenStore(store);
  writeJson(TOKEN_FILE, store.tokens[oid]); // 兼容仍读旧单文件的零散调用
  return store.tokens[oid];
}
// 按 shop_cipher 找到对应店铺的 access_token；找不到回落 active
function accessTokenForCipher(cipher) {
  if (cipher) {
    const store = readTokenStore();
    for (const t of Object.values(store.tokens)) {
      if ((t.shops || []).some((s) => shopCipherField(s) === cipher)) return t.access_token;
    }
  }
  return activeToken()?.access_token || null;
}
// 所有已授权店铺并集（每个标 owner 卖家）
function allAuthorizedShops() {
  const store = readTokenStore();
  const out = [];
  for (const t of Object.values(store.tokens)) {
    for (const s of (t.shops || [])) out.push({ ...s, ownerOpenId: t.open_id || null, ownerSellerName: t.seller_name || null });
  }
  return out;
}

function tokenSummary() {
  const store = readTokenStore();
  const token = activeToken();
  const sellers = Object.values(store.tokens).map((t) => ({
    open_id: t.open_id || null,
    seller_name: t.seller_name || null,
    shops: (t.shops || []).length,
    active: (t.open_id || "") === store.activeOpenId,
  }));
  if (!token) return sellers.length ? { sellers } : null;
  return {
    open_id: token.open_id || null,
    seller_name: token.seller_name || null,
    access_token_expires_in: token.access_token_expires_in || token.expires_in || null,
    refresh_token_expires_in: token.refresh_token_expires_in || token.refresh_expires_in || null,
    saved_at: token.saved_at || null,
    sellers,
  };
}

async function exchangeToken(code) {
  const missing = requiredConfig();
  if (missing.length) {
    const error = new Error(`Missing config: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.payload = { ok: false, code: "CONFIG_MISSING", message: error.message, missing };
    throw error;
  }
  const url = new URL("/api/v2/token/get", AUTH_BASE_URL);
  url.searchParams.set("app_key", APP_KEY);
  url.searchParams.set("app_secret", APP_SECRET);
  url.searchParams.set("auth_code", code);
  url.searchParams.set("grant_type", "authorized_code");
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.code !== 0 || !data.data?.access_token) {
    const error = new Error(data.message || "Token exchange failed");
    error.statusCode = response.status || 502;
    error.payload = { ok: false, code: data.code || "TOKEN_EXCHANGE_FAILED", message: error.message, upstream: data };
    throw error;
  }
  const token = { ...data.data, saved_at: new Date().toISOString() };
  // 用新 token 拉它名下店铺，按 open_id 存进多店铺 store（不覆盖其它店）
  let shops = [];
  try { shops = await getAuthorizedShops(token.access_token); } catch { shops = []; }
  return upsertTokenEntry(token, shops);
}

async function refreshToken(openId) {
  const store = readTokenStore();
  const target = openId ? store.tokens[openId] : activeToken();
  if (!target?.refresh_token) {
    const error = new Error("Refresh token not found. Bind a shop first.");
    error.statusCode = 401;
    error.payload = { ok: false, code: "REFRESH_TOKEN_MISSING", message: error.message };
    throw error;
  }
  const missing = requiredConfig();
  if (missing.length) {
    const error = new Error(`Missing config: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.payload = { ok: false, code: "CONFIG_MISSING", message: error.message, missing };
    throw error;
  }
  const url = new URL("/api/v2/token/refresh", AUTH_BASE_URL);
  url.searchParams.set("app_key", APP_KEY);
  url.searchParams.set("app_secret", APP_SECRET);
  url.searchParams.set("refresh_token", target.refresh_token);
  url.searchParams.set("grant_type", "refresh_token");
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.code !== 0 || !data.data?.access_token) {
    const error = new Error(data.message || "Token refresh failed");
    error.statusCode = response.status || 502;
    error.payload = { ok: false, code: data.code || "TOKEN_REFRESH_FAILED", message: error.message, upstream: data };
    throw error;
  }
  const token = { ...target, ...data.data, saved_at: new Date().toISOString() };
  // 刷新保留原店铺列表
  return upsertTokenEntry(token, target.shops || []);
}

async function getAuthorizedShops(accessToken = null) {
  const data = await tiktokFetch("/authorization/202309/shops", accessToken ? { token: accessToken } : {});
  const shops = data.data?.shops || [];
  return shops;
}

async function searchProducts(shopCipher, pageSize = 20, pageToken = "") {
  if (!shopCipher) {
    const shops = await getAuthorizedShops();
    shopCipher = shops[0]?.cipher || shops[0]?.shop_cipher;
  }
  if (!shopCipher) {
    const error = new Error("No authorized shop cipher found. Bind a shop first.");
    error.statusCode = 404;
    error.payload = { ok: false, code: "SHOP_CIPHER_MISSING", message: error.message };
    throw error;
  }
  const params = { shop_cipher: shopCipher, page_size: Math.min(Number(pageSize) || 20, 100) };
  if (pageToken) params.page_token = pageToken;
  const body = { status: "ALL" };
  const upstream = await tiktokFetch("/product/202309/products/search", { method: "POST", params, body, token: accessTokenForCipher(shopCipher) });
  return enrichProductSearch(upstream, shopCipher);
}

async function getProduct(shopCipher, productId) {
  return tiktokFetch(`/product/202309/products/${productId}`, { params: { shop_cipher: shopCipher }, token: accessTokenForCipher(shopCipher) });
}

async function enrichProductSearch(upstream, shopCipher) {
  const products = upstream.data?.products || [];
  const detailed = await Promise.all(products.map(async (item) => {
    const productId = item.id || item.product_id;
    if (!productId) return item;
    try {
      const detail = await getProduct(shopCipher, productId);
      const detailProduct = detail.data?.product || detail.data || {};
      return { ...item, ...detailProduct, id: item.id || detailProduct.id || detailProduct.product_id };
    } catch {
      return item;
    }
  }));
  return { ...upstream, data: { ...(upstream.data || {}), products: detailed } };
}

async function searchCreators(shopCipher, keyword = "", pageSize = 12, pageToken = "", extraBody = null) {
  if (!shopCipher) {
    const shops = await getAuthorizedShops();
    shopCipher = shops[0]?.cipher || shops[0]?.shop_cipher;
  }
  if (!shopCipher) {
    const error = new Error("No authorized shop cipher found. Bind a shop first.");
    error.statusCode = 404;
    error.payload = { ok: false, code: "SHOP_CIPHER_MISSING", message: error.message };
    throw error;
  }
  const params = { shop_cipher: shopCipher, page_size: [12, 20].includes(Number(pageSize)) ? Number(pageSize) : 12 };
  if (pageToken) params.page_token = pageToken;
  // extraBody：实验/分区用，传任意筛选结构（如 {filter:{category_ids:[...]}}）；否则退回文本 query
  const body = (extraBody && typeof extraBody === "object") ? extraBody : (keyword ? { query: keyword } : {});
  return tiktokFetch("/affiliate_seller/202508/marketplace_creators/search", { method: "POST", params, body, token: accessTokenForCipher(shopCipher) });
}

function extractConversationId(upstream) {
  return upstream?.data?.conversation_id
    || upstream?.data?.conversation?.id
    || upstream?.data?.id
    || upstream?.conversation_id
    || upstream?.conversation?.id
    || "";
}

async function createCreatorConversation(shopCipher, creatorOpenId) {
  if (!shopCipher || !creatorOpenId) {
    const error = new Error("Missing shop_cipher or creator_open_id for TikTok IM conversation.");
    error.statusCode = 400;
    error.payload = { ok: false, code: "IM_PARAM_MISSING", message: error.message };
    throw error;
  }
  return tiktokFetch("/affiliate_seller/202508/conversations", {
    method: "POST",
    params: { shop_cipher: shopCipher },
    body: { creator_open_id: creatorOpenId },
    token: accessTokenForCipher(shopCipher),
  });
}

async function sendCreatorImMessage(conversationId, message) {
  if (!conversationId || !message) {
    const error = new Error("Missing conversation_id or message for TikTok IM sending.");
    error.statusCode = 400;
    error.payload = { ok: false, code: "IM_MESSAGE_PARAM_MISSING", message: error.message };
    throw error;
  }
  return tiktokFetch(`/affiliate_seller/202412/conversations/${conversationId}/messages`, {
    method: "POST",
    body: {
      type: "TEXT",
      content: JSON.stringify({ content: message }),
    },
  });
}

// ——— 寄样/履约 API（建联后·样品成功率）。官方端点，零手填。———
async function resolveShopCipher(shopCipher) {
  if (shopCipher) return shopCipher;
  const shops = await getAuthorizedShops();
  return shops[0] ? shopCipherField(shops[0]) : "";
}

async function searchSampleApplications(shopCipher, { pageSize = 20, pageToken = "", status = "" } = {}) {
  shopCipher = await resolveShopCipher(shopCipher);
  if (!shopCipher) {
    const error = new Error("No authorized shop cipher. Bind a shop first.");
    error.statusCode = 404;
    error.payload = { ok: false, code: "SHOP_CIPHER_MISSING", message: error.message };
    throw error;
  }
  const params = { shop_cipher: shopCipher, page_size: Math.min(Number(pageSize) || 20, 50) };
  if (pageToken) params.page_token = pageToken;
  const body = {};
  if (status) body.status = status;
  return tiktokFetch("/affiliate_seller/202508/sample_applications/search", {
    method: "POST", params, body, token: accessTokenForCipher(shopCipher),
  });
}

async function searchSampleFulfillments(shopCipher, applicationId) {
  shopCipher = await resolveShopCipher(shopCipher);
  if (!shopCipher || !applicationId) {
    const error = new Error("Missing shop_cipher or application_id for fulfillments.");
    error.statusCode = 400;
    error.payload = { ok: false, code: "SAMPLE_FULFILLMENT_PARAM_MISSING", message: error.message };
    throw error;
  }
  return tiktokFetch(`/affiliate_seller/202409/sample_applications/${encodeURIComponent(applicationId)}/fulfillments/search`, {
    method: "POST", params: { shop_cipher: shopCipher, page_size: 20 }, body: {}, token: accessTokenForCipher(shopCipher),
  });
}

// 拉申请 + 各自履约，算"拿样未产出=骗样嫌疑"风险旗标
async function sampleOverview(shopCipher, options = {}) {
  shopCipher = await resolveShopCipher(shopCipher);
  const upstream = await searchSampleApplications(shopCipher, options);
  const apps = upstream?.data?.sample_applications || upstream?.data?.applications || upstream?.data?.list || [];
  const enriched = await Promise.all(apps.slice(0, 20).map(async (app) => {
    const appId = app.id || app.application_id || app.sample_application_id || "";
    let fulfillments = [];
    if (appId) {
      try {
        const f = await searchSampleFulfillments(shopCipher, appId);
        fulfillments = f?.data?.fulfillments || f?.data?.list || [];
      } catch { fulfillments = []; }
    }
    // 履约判断：寄出/签收 + 是否产出内容(VIDEO)
    const blob = JSON.stringify(fulfillments).toUpperCase();
    const shipped = /SHIP|DELIVER|TRANSIT|SIGNED|RECEIV/.test(blob);
    const producedContent = /"VIDEO"|CONTENT|PUBLISHED|POSTED/.test(blob);
    const riskNoOutput = shipped && !producedContent; // 拿样未产出
    return { ...app, fulfillments, _shipped: shipped, _producedContent: producedContent, _riskNoOutput: riskNoOutput };
  }));
  return { ok: true, applications: enriched, next_page_token: upstream?.data?.next_page_token || "", total: apps.length };
}

function outreachChannelType(outreachOrChannel) {
  if (outreachOrChannel && typeof outreachOrChannel === "object") {
    const explicit = String(outreachOrChannel.channel_type || outreachOrChannel.channelType || "");
    if (explicit) return explicit;
    return outreachChannelType(outreachOrChannel.channel);
  }
  const channel = String(outreachOrChannel || "");
  if (channel === "TikTok\u79c1\u4fe1" || channel.includes("\u79c1\u4fe1")) return "tiktok_im";
  if (channel === "TikTok\u5b9a\u5411\u9080\u7ea6" || channel.includes("\u5b9a\u5411\u9080\u7ea6")) return "target_invite";
  return channel;
}

function isTikTokImChannel(outreachOrChannel) {
  return outreachChannelType(outreachOrChannel) === "tiktok_im";
}

function commissionPercentToApiRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 100;
  return Math.round(Math.min(80, numeric) * 100);
}

function officialCommissionRate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric >= 100) return Math.round(Math.min(8000, numeric));
  return commissionPercentToApiRate(numeric);
}

function productTargetCommissionRate(product = {}) {
  const explicit = officialCommissionRate(product.target_commission_rate);
  if (explicit) return explicit;
  return commissionPercentToApiRate(
    product.standardCommissionRate
      ?? product.targetCommissionRate
      ?? product.commissionRate
      ?? product.commission
  );
}

function productAdsCommissionRate(product = {}) {
  const explicit = officialCommissionRate(product.shop_ads_commission_rate);
  if (explicit) return explicit;
  return commissionPercentToApiRate(
    product.adCommissionRate
      ?? product.adsCommissionRate
      ?? product.shopAdsCommissionRate
      ?? product.adsCommission
  );
}

function unixSeconds(value) {
  if (!value) return "";
  if (/^\d+$/.test(String(value))) return String(value);
  const time = new Date(`${String(value).trim()}T23:59:59+08:00`).getTime();
  if (!Number.isFinite(time)) return "";
  return String(Math.floor(time / 1000));
}

function freeSampleRule(sampleRule) {
  const text = String(sampleRule || "");
  if (text.includes("不寄样")) {
    return { has_free_sample: false, is_sample_approval_exempt: false };
  }
  return {
    has_free_sample: true,
    is_sample_approval_exempt: text.includes("自动"),
  };
}

function targetCollaborationRequestBody(target = {}, outreach = {}) {
  const creatorIds = Array.from(new Set([
    ...(target.creator_user_open_ids || []),
    ...(target.creator_open_ids || []),
    outreach.creator_open_id || "",
  ].filter(Boolean))).slice(0, 50);
  return {
    name: String(target.name || "").slice(0, 100),
    message: String(outreach.message || target.message || "").slice(0, 5000),
    end_time: unixSeconds(target.expiresAt || target.end_time || target.expires_at),
    products: (target.products || []).slice(0, 100).map((product) => {
      const row = {
        id: String(product.sourceId || product.product_id || product.id || ""),
        target_commission_rate: productTargetCommissionRate(product),
      };
      if (
        product.adCommissionEnabled
        || product.adsEnabled
        || product.shop_ads_commission_rate
        || product.adCommissionRate
        || product.adsCommission
      ) {
        row.shop_ads_commission_rate = productAdsCommissionRate(product);
      }
      return row;
    }).filter((product) => product.id),
    creator_user_open_ids: creatorIds,
    seller_contact_info: {
      email: target.contactEmail || target.email || "",
      phone_number: target.phoneNumber || "",
      whatsapp: target.whatsapp || "",
      telegram: target.telegram || "",
      line: target.line || "",
    },
    free_sample_rule: freeSampleRule(target.sampleRule),
  };
}

function targetCollaborationPayloadPreview(target = {}, outreach = {}) {
  return {
    shop_cipher: outreach.shop_cipher || target.shop_cipher || "",
    endpoint: "POST /affiliate_seller/202508/target_collaborations",
    body: targetCollaborationRequestBody(target, outreach),
    source: {
      deliverables: target.deliverables || [],
      contact_name: target.contactName || "",
    },
  };
}

function validateTargetCollaborationBody(body) {
  const missing = [];
  if (!body.name) missing.push("name");
  if (!body.end_time) missing.push("end_time");
  if (!body.products?.length) missing.push("products");
  if (!body.creator_user_open_ids?.length) missing.push("creator_user_open_ids");
  if (!body.seller_contact_info?.email) missing.push("seller_contact_info.email");
  if (!body.free_sample_rule) missing.push("free_sample_rule");
  if (missing.length) {
    const error = new Error(`Missing target collaboration fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.payload = { ok: false, code: "TARGET_COLLABORATION_PARAM_MISSING", message: error.message, missing };
    throw error;
  }
}

async function createTargetCollaboration(target = {}, outreach = {}) {
  if (target.officialId || target.official_id) {
    return {
      ok: true,
      skipped: true,
      official_id: target.officialId || target.official_id,
      message: "Target collaboration already has an official id; skipped duplicate create.",
    };
  }
  const shopCipher = outreach.shop_cipher || target.shop_cipher || "";
  const body = targetCollaborationRequestBody(target, outreach);
  validateTargetCollaborationBody(body);
  const upstream = await tiktokFetch("/affiliate_seller/202508/target_collaborations", {
    method: "POST",
    params: { shop_cipher: shopCipher },
    body,
    token: accessTokenForCipher(shopCipher),
  });
  return {
    ok: true,
    endpoint: "POST /affiliate_seller/202508/target_collaborations",
    request_body: body,
    upstream,
  };
}

async function submitTikTokOutreach(payload = {}) {
  const outreach = payload.outreach || {};
  const target = payload.target_collaboration || null;
  const result = {
    ok: true,
    dry_run: Boolean(payload.dry_run),
    channel: outreach.channel || "",
    target_collaboration: null,
    im: null,
  };

  if (target) {
    result.target_collaboration = payload.dry_run
      ? {
        ok: true,
        dry_run: true,
        endpoint: "POST /affiliate_seller/202508/target_collaborations",
        payload_preview: targetCollaborationPayloadPreview(target, outreach),
      }
      : await createTargetCollaboration(target, outreach);
  }

  if (isTikTokImChannel(outreach)) {
    if (payload.dry_run) {
      result.im = {
        ok: true,
        dry_run: true,
        endpoint: "POST /affiliate_seller/202412/conversations/{conversation_id}/messages",
      };
    } else {
      const conversation = await createCreatorConversation(outreach.shop_cipher, outreach.creator_open_id);
      const conversationId = extractConversationId(conversation);
      if (!conversationId) {
        const error = new Error("TikTok did not return conversation_id after creating creator conversation.");
        error.statusCode = 502;
        error.payload = { ok: false, code: "CONVERSATION_ID_MISSING", message: error.message, upstream: conversation };
        throw error;
      }
      const sent = await sendCreatorImMessage(conversationId, outreach.message);
      result.im = {
        ok: true,
        conversation_id: conversationId,
        create_conversation: conversation,
        send_message: sent,
      };
    }
  }

  return result;
}

function smtpBase64(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64");
}

function smtpHeader(value) {
  const text = String(value || "");
  return /^[\x00-\x7F]*$/.test(text) ? text : `=?UTF-8?B?${smtpBase64(text)}?=`;
}

function smtpEscapeBody(text) {
  return String(text || "")
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => line.startsWith(".") ? `.${line}` : line)
    .join("\r\n");
}

function buildEmailMessage({ from, to, subject, text }) {
  const now = new Date().toUTCString();
  return [
    `From: <${from}>`,
    `To: <${to}>`,
    `Subject: ${smtpHeader(subject || "KOL Compass outreach")}`,
    `Date: ${now}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    smtpEscapeBody(text),
  ].join("\r\n");
}

function smtpConnect({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host, rejectUnauthorized: false })
      : net.connect({ host, port });
    socket.setTimeout(30_000);
    socket.once("connect", () => resolve(socket));
    socket.once("secureConnect", () => resolve(socket));
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out."));
    });
    socket.once("error", reject);
  });
}

function createSmtpSession(socket) {
  let buffer = "";
  const waiters = [];
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    flush();
  });
  function completeReply() {
    const lines = buffer.split(/\r?\n/);
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));
    if (completeIndex === -1) return null;
    const reply = lines.slice(0, completeIndex + 1).join("\n");
    buffer = lines.slice(completeIndex + 1).join("\n");
    return reply;
  }
  function flush() {
    while (waiters.length) {
      const reply = completeReply();
      if (!reply) return;
      waiters.shift().resolve(reply);
    }
  }
  return {
    read() {
      const reply = completeReply();
      if (reply) return Promise.resolve(reply);
      return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
    },
    async command(command, expected = [250]) {
      socket.write(`${command}\r\n`);
      const reply = await this.read();
      const code = Number(reply.slice(0, 3));
      if (!expected.includes(code)) throw new Error(`SMTP command failed: ${command} -> ${reply}`);
      return reply;
    },
  };
}

async function sendSmtpEmail(payload = {}) {
  const smtp = payload.smtp || {};
  const message = payload.message || {};
  const host = String(smtp.host || "").trim();
  const port = Number(smtp.port || 587);
  const username = String(smtp.username || message.from || "").trim();
  const password = String(smtp.password || "").trim();
  const from = String(message.from || username).trim();
  const to = String(message.to || "").trim();
  const subject = String(message.subject || "KOL Compass outreach");
  const text = String(message.text || "").trim();
  if (!host || !port || !username || !password || !from || !to || !text) {
    const error = new Error("Missing SMTP host, port, username, password, from, to or message text.");
    error.statusCode = 400;
    error.payload = { ok: false, code: "SMTP_PARAM_MISSING", message: error.message };
    throw error;
  }
  if (payload.dry_run) {
    return {
      ok: true,
      dry_run: true,
      smtp: { host, port, secure: Boolean(smtp.secure || port === 465) },
      envelope: { from, to },
      subject,
    };
  }

  let socket = await smtpConnect({ host, port, secure: Boolean(smtp.secure || port === 465) });
  let session = createSmtpSession(socket);
  try {
    await session.read();
    await session.command(`EHLO ${smtp.helo || "kol-compass.local"}`);
    if (port !== 465 && smtp.starttls !== false) {
      await session.command("STARTTLS", [220]);
      socket = tls.connect({ socket, servername: host, rejectUnauthorized: false });
      session = createSmtpSession(socket);
      await session.command(`EHLO ${smtp.helo || "kol-compass.local"}`);
    }
    await session.command("AUTH LOGIN", [334]);
    await session.command(smtpBase64(username), [334]);
    await session.command(smtpBase64(password), [235]);
    await session.command(`MAIL FROM:<${from}>`);
    await session.command(`RCPT TO:<${to}>`, [250, 251]);
    await session.command("DATA", [354]);
    socket.write(`${buildEmailMessage({ from, to, subject, text })}\r\n.\r\n`);
    const finalReply = await session.read();
    const finalCode = Number(finalReply.slice(0, 3));
    if (finalCode !== 250) throw new Error(`SMTP DATA failed: ${finalReply}`);
    await session.command("QUIT", [221, 250]).catch(() => "");
    socket.end();
    return { ok: true, dry_run: false, smtp: { host, port }, envelope: { from, to }, reply: finalReply };
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

async function getCategories(shop) {
  const params = {};
  const cipher = shopCipher(shop);
  const shopId = shop?.shop_id || shop?.id || "";
  if (cipher) params.shop_cipher = cipher;
  if (shopId) params.shop_id = shopId;
  // 请英文目录而非店铺所在地语言（避免越南语）；本地再映射成中文。
  params.locale = "en-US";
  return tiktokFetch("/product/202309/categories", { params, token: accessTokenForCipher(cipher) });
}

function normalizeProducts(upstream) {
  const products = upstream.data?.products || upstream.products || [];
  return products.map((item, index) => {
    const skuPrice = item.skus?.[0]?.price || {};
    const priceValue = item.price?.sale_price || item.price?.tax_exclusive_price || item.price?.original_price || skuPrice.sale_price || skuPrice.tax_exclusive_price || skuPrice.original_price || "";
    const currency = item.price?.currency || skuPrice.currency || "";
    const price = priceValue && currency ? `${currency} ${priceValue}` : priceValue;
    const category = normalizeCategoryLabel(item.category_chains?.[0]?.local_name || item.category_name || item.category?.name || "TikTok Shop");
    const imageUrl = item.main_images?.[0]?.urls?.[0] || item.main_images?.[0]?.url || item.images?.[0]?.urls?.[0] || item.images?.[0]?.url || item.product_images?.[0]?.urls?.[0] || item.cover_image?.url || "";
    const rawStatus = item.status || item.audit_status || "SYNCED";
    const normalizedStatus = normalizeProductStatus(rawStatus);
    const stock = (item.skus || []).flatMap((sku) => sku.inventory || []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    return {
      id: Number(String(item.id || item.product_id || Date.now() + index).replace(/\D/g, "").slice(-9)) || Date.now() + index,
      sourceId: item.id || item.product_id || "",
      name: item.title || item.name || item.product_name || `TikTok Shop 商品 ${index + 1}`,
      category,
      price: price ? String(price) : "-",
      commission: item.commission?.rate || item.open_collaboration?.commission_rate || "-",
      mode: item.open_collaboration ? "公开合作" : "店铺商品",
      status: normalizedStatus,
      rawStatus,
      stock,
      imageUrl,
      salesRegions: item.sales_regions || [],
    };
  });
}

function detectCreatorType(profile, metrics = {}) {
  return normalizeCreatorType(profile.creator_type || profile.content_type || profile.type, metrics);
}

function isMcnCreator(profile) {
  const text = [
    profile.creator_type,
    profile.account_type,
    profile.organization_type,
    profile.agency_name,
    profile.mcn_name,
    profile.partner_type,
  ].filter(Boolean).join(" ").toLowerCase();
  return Boolean(profile.is_mcn || profile.is_mcn_creator || profile.mcn_id || profile.agency_id || /\bmcn\b|agency|network/.test(text));
}

function normalizeProductStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (["ACTIVATE", "ACTIVE", "ONLINE", "SELLING", "LIVE"].includes(normalized)) return "可选";
  if (["DRAFT", "DEACTIVATED", "SUSPENDED", "FREEZE", "FROZEN", "DELETED", "FAILED"].includes(normalized)) return "不可选";
  return status || "已同步";
}

function normalizeCreators(upstream, categoryMap = readCategoryMap()) {
  const data = upstream.data || {};
  const creators = data.creators || data.marketplace_creators || data.creator_profiles || data.results || [];
  return creators.map((item, index) => {
    const profile = item.profile || item.creator_profile || item;
    const username = profile.username || profile.handle || profile.creator_username || profile.tiktok_username || profile.nick_name || `creator_${index + 1}`;
    const nickname = profile.display_name || profile.nickname || profile.name || username;
    const followers = Number(profile.follower_count || profile.followers || profile.fans || 0);
    const categoryIds = Array.isArray(profile.category_ids) ? profile.category_ids.filter(Boolean).map(String) : [];
    const categoryLabels = categoryIds.map((id) => categoryMap[id]).filter(Boolean);
    const category = normalizeCreatorCategory(profile, categoryMap, categoryLabels);
    const region = normalizeCreatorRegion(profile.selection_region || profile.region || profile.country || profile.market || "");
    const gmv = formatMoney(profile.gmv || profile.monthly_gmv || profile.sales_amount || profile.gmv_range || "");
    const replyRate = profile.reply_rate || profile.response_rate || "-";
    const sourceId = profile.creator_open_id || profile.creator_id || profile.open_id || profile.id || "";
    const avatarUrl = profile.avatar?.url || profile.avatar_url || profile.profile_image?.url || "";
    const avgVideoViews = Number(profile.avg_ec_video_view_count || profile.avg_video_view_count || 0);
    const avgLiveUv = Number(profile.avg_ec_live_uv || profile.avg_live_uv || 0);
    const tags = [];
    if (isMcnCreator(profile)) tags.push("MCN达人");
    return {
      id: Number(String(sourceId || Date.now() + index).replace(/\D/g, "").slice(-9)) || Date.now() + index,
      sourceId,
      username: String(username).replace(/^@/, ""),
      nickname,
      type: detectCreatorType(profile, { avgVideoViews, avgLiveUv }),
      category,
      region,
      followers,
      gmv,
      replyRate: String(replyRate),
      avatarUrl,
      avgVideoViews,
      avgLiveUv,
      categoryIds,
      categoryLabels,
      tags,
      status: "待联系",
      email: "",
      notes: "来自 TikTok Shop Affiliate Seller 达人搜索 API。",
    };
  });
}

function normalizeCreatorCategory(profile, categoryMap = readCategoryMap(), categoryLabels = []) {
  const ids = Array.isArray(profile.category_ids) ? profile.category_ids.filter(Boolean) : [];
  const labels = categoryLabels.length ? categoryLabels : ids.map((id) => categoryMap[String(id)]).filter(Boolean);
  if (labels.length) return normalizeCategoryLabel(labels[0]);
  const raw = profile.category || profile.main_category || profile.vertical;
  if (raw) return normalizeCategoryLabel(raw);
  if (ids.length) return "TikTok Shop";
  return "TikTok Shop";
}

function normalizeCreatorRegion(region) {
  const map = {
    SG: "新加坡",
    VN: "越南",
    MY: "马来西亚",
    TH: "泰国",
    PH: "菲律宾",
    ID: "印尼",
    US: "美国",
    GB: "英国",
    UK: "英国",
    SA: "沙特",
    MX: "墨西哥",
  };
  return map[String(region || "").toUpperCase()] || region || "-";
}

function shopCipher(shop) {
  return shop?.cipher || shop?.shop_cipher || shop?.shopCipher || "";
}

function shopRegion(shop) {
  return shop?.region || shop?.seller_region || shop?.shop_region || shop?.market || shop?.country || "";
}

function shopLabel(shop) {
  return shop?.shop_name || shop?.name || shop?.seller_name || shop?.shop_id || shopCipher(shop) || "TikTok Shop";
}

function platformCreatorKeys(row) {
  // username 大小写不敏感（老库 IamJamieYeo vs 平台 iamjamieyeo 是同一人）
  const keys = [];
  const shopKey = row.sourceShopCipher || "";
  const uname = String(row.username || "").trim().toLowerCase();
  const identity = row.sourceId || uname;
  if (shopKey && identity) keys.push(`${shopKey}:${identity}`);
  if (row.sourceId) keys.push(String(row.sourceId));
  if (uname) keys.push(`u:${uname}`);
  return keys.filter(Boolean);
}

function categoryDisplayName(node) {
  return node?.local_name || node?.name || node?.display_name || node?.category_name || node?.localized_name || "";
}

function normalizeCategoryLabel(name) {
  const text = String(name || "").trim();
  const map = {
    "Phụ kiện thời trang": "时尚配饰",
    "Trang phục nữ & Đồ lót": "女装与内衣",
    "Chăm sóc sắc đẹp & Chăm sóc cá nhân": "美妆个护",
    "Đồ gia dụng": "家居日用",
    "Thời trang trẻ em": "童装童鞋",
    "Trẻ sơ sinh & thai sản": "母婴用品",
    "Giày": "鞋靴",
    "Thể thao & Ngoài trời": "户外运动",
    "Đồ chơi & Sở thích": "玩具爱好",
    "Điện thoại & Điện tử": "手机数码",
    "Thiết bị điện gia dụng": "家用电器",
    "Máy tính & Thiết bị văn phòng": "电脑办公",
    "Thực phẩm & Đồ uống": "食品饮料",
    "Sức khỏe": "健康保健",
    "Chăm sóc thú cưng": "宠物用品",
    "Ô tô & Xe máy": "汽车摩托",
    "Sách, Tạp chí & Âm thanh": "图书文娱",
    "Đồ nội thất": "家具",
    "Nam giới": "男装与运动",
    "Túi xách": "箱包",
    "Nhà bếp": "厨房用品",
    "Đồ dùng nhà bếp": "厨房用品",
    "Đồ ăn & Đồ uống": "食品饮料",
    "Điện thoại & đồ điện tử": "手机数码",
    "Thiết bị gia dụng": "家用电器",
    "Hành lý & Túi xách": "箱包",
    "Trang phục nam & Đồ lót": "男装与内衣",
    "Ô tô & xe máy": "汽车摩托",
    "Đồ chơi & sở thích": "玩具爱好",
    "Hàng dệt & Đồ nội thất mềm": "家纺布艺",
    "Sửa chữa nhà cửa": "家装维修",
    "Sữa chữa nhà cửa": "家装维修",
    "Công cụ & Phần cứng": "工具五金",
    "Máy tính & Thiết bị Văn phòng": "电脑办公",
    "Bộ sưu tập": "收藏品",
    "Thời trang Hồi giáo": "穆斯林时尚",
    "Phụ kiện trang sức & Phái sinh": "珠宝配饰",
    // 英文目录(locale=en-US)→中文，顶级类目
    "Womenswear & Underwear": "女装与内衣",
    "Menswear & Underwear": "男装与内衣",
    "Beauty & Personal Care": "美妆个护",
    "Phones & Electronics": "手机数码",
    "Fashion Accessories": "时尚配饰",
    "Home Supplies": "家居日用",
    "Kids' Fashion": "童装童鞋",
    "Baby & Maternity": "母婴用品",
    "Shoes": "鞋靴",
    "Sports & Outdoor": "户外运动",
    "Toys & Hobbies": "玩具爱好",
    "Household Appliances": "家用电器",
    "Computers & Office Equipment": "电脑办公",
    "Food & Beverages": "食品饮料",
    "Health": "健康保健",
    "Pet Supplies": "宠物用品",
    "Automotive & Motorcycle": "汽车摩托",
    "Books, Magazines & Audio": "图书文娱",
    "Furniture": "家具",
    "Luggage & Bags": "箱包",
    "Kitchenware": "厨房用品",
    "Textiles & Soft Furnishings": "家纺布艺",
    "Home Improvement": "家装维修",
    "Tools & Hardware": "工具五金",
    "Collectibles": "收藏品",
    "Muslim Fashion": "穆斯林时尚",
    "Jewellery Accessories & Derivatives": "珠宝配饰",
    "Jewelry Accessories & Derivatives": "珠宝配饰",
  };
  return map[text] || text;
}

function collectCategoryMap(value, map = {}) {
  if (Array.isArray(value)) {
    for (const item of value) collectCategoryMap(item, map);
    return map;
  }
  if (!value || typeof value !== "object") return map;
  const id = value.id || value.category_id || value.categoryId;
  const name = categoryDisplayName(value);
  if (id && name) map[String(id)] = normalizeCategoryLabel(name);
  for (const key of ["children", "child_categories", "sub_categories", "categories"]) {
    if (value[key]) collectCategoryMap(value[key], map);
  }
  return map;
}

async function refreshCategoryMap(shops) {
  const next = { ...readCategoryMap() };
  for (const shop of shops || []) {
    try {
      const upstream = await getCategories(shop);
      collectCategoryMap(upstream.data?.categories || upstream.data || upstream, next);
      if (Object.keys(next).length) writeCategoryMap(next);
      return next;
    } catch {
      // Category names are a display enhancement; creator import should still continue.
    }
  }
  return next;
}

function relabelPlatformCreators(categoryMap) {
  const rows = readPlatformCreators();
  let changed = false;
  for (const row of rows) {
    const ids = Array.isArray(row.categoryIds) ? row.categoryIds.map(String) : [];
    const labels = ids.map((id) => categoryMap[id]).filter(Boolean);
    if (!labels.length) continue;
    row.categoryLabels = labels;
    row.category = labels[0];
    changed = true;
  }
  if (changed) writePlatformCreators(rows);
  return rows;
}

function upsertPlatformCreators(incoming, shop = null, options = {}) {
  const rows = readPlatformCreators();
  const existing = new Map();
  for (const row of rows) {
    for (const key of platformCreatorKeys(row)) existing.set(key, row);
  }

  const sourceShopCipher = shop ? shopCipher(shop) : "";
  const sourceShopName = shop ? shopLabel(shop) : "";
  const sourceShopRegion = shop ? normalizeCreatorRegion(shopRegion(shop)) : "";
  const defaultSource = options.librarySource || "platform";
  let changed = 0;

  for (const creator of incoming || []) {
    const region = normalizeCreatorRegion(creator.region || sourceShopRegion);
    const payload = normalizeStoredCreator({
      ...creator,
      region,
      sourceShopCipher: creator.sourceShopCipher || sourceShopCipher,
      sourceShopName: creator.sourceShopName || sourceShopName,
      sourceShopRegion: creator.sourceShopRegion || sourceShopRegion || region,
      librarySource: creator.librarySource || defaultSource,
      updatedAt: new Date().toISOString(),
    });
    const current = platformCreatorKeys(payload).map((key) => existing.get(key)).find(Boolean);
    if (current) {
      // 联系方式/建联历史：补缺不抹真值（空值不覆盖已有），双向保护
      const contacts = {
        email: payload.email || current.email || "",
        whatsapp: payload.whatsapp || current.whatsapp || "",
        instagram: payload.instagram || current.instagram || "",
        wechat: payload.wechat || current.wechat || "",
        contactPerson: payload.contactPerson || current.contactPerson || "",
        legacyOutreach: current.legacyOutreach || payload.legacyOutreach || null,
      };
      const incomingIsFresh = payload.librarySource !== "legacy-import";
      if (incomingIsFresh) {
        // 新鲜 TikTok：指标用新值覆盖、清除估算标，联系方式/建联历史保留
        Object.assign(current, {
          ...payload,
          id: current.id,
          ...contacts,
          metricsEstimated: false,
          notes: current.notes && current.notes !== creator.notes ? current.notes : payload.notes,
        });
      } else {
        // 老库导入：只补联系方式/历史 + 缺失指标，绝不覆盖已有(尤其新鲜)指标
        Object.assign(current, contacts);
        const currentEstimated = current.metricsEstimated === true || !current.sourceId;
        if (currentEstimated) {
          if (!current.followers) current.followers = payload.followers;
          if (!current.gmv || current.gmv === "-") current.gmv = payload.gmv;
          if (!current.avgVideoViews) current.avgVideoViews = payload.avgVideoViews;
          if (!current.category || current.category === "TikTok Shop") current.category = payload.category;
          if (!Array.isArray(current.categoryLabels) || !current.categoryLabels.length) current.categoryLabels = payload.categoryLabels;
          if (current.metricsEstimated == null) current.metricsEstimated = true;
        }
      }
    } else {
      const next = {
        ...payload,
        id: Number(String(payload.sourceId || Date.now() + rows.length).replace(/\D/g, "").slice(-9)) || Date.now() + rows.length,
      };
      rows.push(next);
      for (const key of platformCreatorKeys(next)) existing.set(key, next);
    }
    changed += 1;
  }

  writePlatformCreators(rows);
  return { changed, total: rows.length, creators: rows };
}

async function importPlatformCreatorsFromTikTok(options = {}) {
  const run = await runCreatorAutoImportOnce("manual-import", {
    pagesPerRun: options.max_pages,
    pageSize: options.page_size,
    force: options.force === true,
  });
  return {
    imported: run.imported || 0,
    successMarkets: Array.isArray(run.processed) ? run.processed.filter((row) => row.imported > 0 || row.status === "processed").length : 0,
    failures: run.failures || [],
    skipped: run.skippedMarkets || [],
    nextRunAt: run.nextRunAt || "",
    total: readPlatformCreators().length,
    creators: readPlatformCreators(),
  };
}

// 一次性导入老系统历史库（联系方式 + 建联历史为真值，指标为估算待刷新）
function importLegacyCreators() {
  const items = readJson(LEGACY_IMPORT_FILE, []);
  if (!Array.isArray(items) || !items.length) {
    const err = new Error("未找到老库导入文件或为空，请先跑 scripts/export-legacy-creators.py");
    err.statusCode = 404;
    err.payload = { ok: false, code: "LEGACY_FILE_MISSING", file: LEGACY_IMPORT_FILE };
    throw err;
  }
  const incoming = items.map((it) => ({
    username: String(it.username || "").replace(/^@/, ""),
    nickname: it.nickname || it.username,
    email: it.email || "",
    whatsapp: it.whatsapp || "",
    instagram: it.instagram || "",
    wechat: it.wechat || "",
    contactPerson: it.contactPerson || "",
    region: it.region || "SG",
    followers: Number(it.followers || 0),
    gmv: it.gmv || 0,
    avgVideoViews: Number(it.avgVideoViews || 0),
    category: it.category || "",
    categoryLabels: Array.isArray(it.categoryLabels) ? it.categoryLabels : [],
    creatorLevel: it.creatorLevel || "",
    metricsEstimated: true,
    librarySource: "legacy-import",
    legacyOutreach: it.legacyOutreach || null,
    status: "待联系",
    notes: "来自老系统历史库：联系方式与建联历史为真值，粉丝/GMV/类目为估算待刷新。",
  })).filter((c) => c.username);
  const result = upsertPlatformCreators(incoming, null, { librarySource: "legacy-import" });
  return { ok: true, file: LEGACY_IMPORT_FILE, source: items.length, changed: result.changed, total: result.total };
}

// 接收 Chrome 扩展（建联前分析）采集的达人内容信号，并入达人库
function ingestExtensionCreators(payload = {}) {
  const list = Array.isArray(payload.creators) ? payload.creators : (payload.creator ? [payload.creator] : []);
  if (!list.length) {
    const err = new Error("ingest 缺少 creators 数据");
    err.statusCode = 400;
    err.payload = { ok: false, code: "INGEST_EMPTY" };
    throw err;
  }
  const incoming = list.map((it) => {
    const username = String(it.username || it.handle || "").replace(/^@/, "").trim();
    if (!username) return null;
    const captions = Array.isArray(it.recentCaptions) ? it.recentCaptions.filter(Boolean).slice(0, 30) : [];
    const topics = Array.isArray(it.contentTopics) ? it.contentTopics.filter(Boolean).slice(0, 20) : [];
    // 建联前体检（扩展钩 item_list 算的近期表现）——清洗后存档
    let recentPerf = null;
    if (it.recentPerf && typeof it.recentPerf === "object") {
      const p = it.recentPerf;
      recentPerf = {
        sampleCount: Number(p.sampleCount || 0) || 0,
        avgPlay: Number(p.avgPlay || 0) || 0,
        avgLike: Number(p.avgLike || 0) || 0,
        avgComment: Number(p.avgComment || 0) || 0,
        avgEngagement: Number(p.avgEngagement || 0) || 0,
        playMin: Number(p.playMin || 0) || 0,
        playMax: Number(p.playMax || 0) || 0,
        postsPerWeek: Number(p.postsPerWeek || 0) || 0,
        lastPostAt: String(p.lastPostAt || ""),
        // 带货信号（替代评论率）：近期挂商品的视频数 / 占比 + 在带的商品名（产品级匹配用）
        ecVideoCount: Number(p.ecVideoCount || 0) || 0,
        ecVideoRatio: Number(p.ecVideoRatio || 0) || 0,
        ecProductNames: Array.isArray(p.ecProductNames) ? p.ecProductNames.filter(Boolean).map((s) => String(s).slice(0, 80)).slice(0, 20) : [],
      };
    }
    return {
      username,
      nickname: it.nickname || username,
      followers: Number(it.followers || 0) || 0,
      region: it.region || "",
      bio: String(it.bio || "").slice(0, 600),
      recentCaptions: captions,
      contentTopics: topics,
      avgVideoViews: Number(it.avgVideoViews || (recentPerf && recentPerf.avgPlay) || 0) || 0,
      recentPerf,
      commentIntent: (it.commentIntent && typeof it.commentIntent === "object") ? {
        sampled: Number(it.commentIntent.sampled || 0) || 0,
        intentCount: Number(it.commentIntent.intentCount || 0) || 0,
        intentRatio: Number(it.commentIntent.intentRatio || 0) || 0,
        samples: Array.isArray(it.commentIntent.samples) ? it.commentIntent.samples.filter(Boolean).slice(0, 5).map((s) => String(s).slice(0, 120)) : [],
      } : null,
      sourceUrl: it.sourceUrl || "",
      extensionCapturedAt: it.capturedAt || new Date().toISOString(),
      librarySource: "extension",
    };
  }).filter(Boolean);
  if (!incoming.length) {
    const err = new Error("ingest creators 均缺少 username");
    err.statusCode = 400;
    err.payload = { ok: false, code: "INGEST_NO_USERNAME" };
    throw err;
  }
  const result = upsertPlatformCreators(incoming, null, { librarySource: "extension" });
  return { ok: true, received: list.length, changed: result.changed, total: result.total };
}

// 达人广场钩子回流：把扩展钩到的达人列表（真实广场数据）入库，扩大达人库广度
function ingestMarketplaceCreators(payload = {}) {
  const list = Array.isArray(payload.creators) ? payload.creators : [];
  if (!list.length) {
    const err = new Error("marketplace ingest 缺少 creators");
    err.statusCode = 400;
    err.payload = { ok: false, code: "MARKET_INGEST_EMPTY" };
    throw err;
  }
  const incoming = list.map((it) => {
    const username = String(it.username || "").replace(/^@/, "").trim();
    if (!username) return null;
    const label = normalizeCategoryLabel(String(it.category || "").split(/[,，]/)[0].trim());
    const categoryLabels = label ? [label] : [];
    return {
      username,
      nickname: it.nickname || username,
      followers: Number(it.followers || 0) || 0,
      avatarUrl: String(it.avatarUrl || ""),
      gmv: it.gmv || "",
      avgVideoViews: Number(it.avgVideoViews || 0) || 0,
      region: normalizeCreatorRegion(it.region || "SG") || "新加坡",
      category: label || "",
      categoryLabels,
      sourceId: it.sourceId ? String(it.sourceId) : "",
      sourceUrl: it.sourceUrl || ("https://www.tiktok.com/@" + username),
      librarySource: "marketplace",
      metricsEstimated: false,
      // 建联前评估信号（达人广场 find 接口返回，有真实值）
      unitsSold: Number(it.unitsSold || 0) || 0,
      videoEngagement: Number(it.videoEngagement || 0) || 0,
      hasCollaborated: it.hasCollaborated === true,
      topFollowerAge: String(it.topFollowerAge || ""),
      topFollowerGender: String(it.topFollowerGender || ""),
    };
  }).filter(Boolean);
  if (!incoming.length) {
    const err = new Error("marketplace ingest 均缺少 username");
    err.statusCode = 400;
    err.payload = { ok: false, code: "MARKET_INGEST_NO_USERNAME" };
    throw err;
  }
  const result = upsertPlatformCreators(incoming, null, { librarySource: "marketplace" });
  return { ok: true, received: list.length, changed: result.changed, total: result.total };
}

function marketCode(shop) {
  const raw = String(shopRegion(shop) || "").toUpperCase();
  const aliases = { SGP: "SG", MYS: "MY", THA: "TH", VNM: "VN", PHL: "PH" };
  return aliases[raw] || raw;
}

function sortShopsByCreatorPriority(shops) {
  return [...(shops || [])].sort((a, b) => {
    const ai = CREATOR_MARKET_PRIORITY.indexOf(marketCode(a));
    const bi = CREATOR_MARKET_PRIORITY.indexOf(marketCode(b));
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    return ar - br || shopLabel(a).localeCompare(shopLabel(b));
  });
}

// 达人库分片抓取：单次搜索会到顶，按类目名做 query 分片轮搜以扩大覆盖（复用已验证的 keyword 搜索路径）。
function buildCreatorShardKeywords(categoryMap = {}) {
  const names = Array.from(new Set(Object.values(categoryMap || {}).map((x) => String(x || "").trim()).filter(Boolean)));
  return ["", ...names].slice(0, 30);
}

async function runCreatorAutoImportOnce(reason = "scheduled", options = {}) {
  if (creatorJobRunning) return { skipped: true, reason: "job_already_running" };
  creatorJobRunning = true;
  const startedAt = new Date().toISOString();
  const jobState = readCreatorJobState();
  let imported = 0;
  const failures = [];
  const processed = [];
  const skippedMarkets = [];
  const pageSize = [12, 20].includes(Number(options.pageSize)) ? Number(options.pageSize) : CREATOR_AUTO_IMPORT_PAGE_SIZE;
  const pagesPerRun = Math.max(1, Math.min(Number(options.pagesPerRun) || CREATOR_AUTO_IMPORT_PAGES_PER_RUN, 5));
  const force = options.force === true;

  try {
    // 多店铺：用 store 里所有卖家的店铺并集（按 cipher 各自取 token 抓取）
    const allShops = allAuthorizedShops();
    const shops = sortShopsByCreatorPriority(allShops.length ? allShops : await getAuthorizedShops());
    const categoryMap = await refreshCategoryMap(shops);
    relabelPlatformCreators(categoryMap);
    const shardKeywords = buildCreatorShardKeywords(categoryMap);

    for (const shop of shops) {
      const code = marketCode(shop);
      const cipher = shopCipher(shop);
      if (!cipher || !CREATOR_MARKET_PRIORITY.includes(code)) continue;

      const key = cipher;
      const marketState = jobState.markets[key] || {};
      const wasSearchCursorExhausted = marketState.exhausted === true;
      const shouldRefreshSearch = wasSearchCursorExhausted && msSinceIso(marketState.lastExhaustedAt || marketState.lastRunAt) >= CREATOR_SEARCH_REFRESH_INTERVAL_MS;
      if (!force && wasSearchCursorExhausted && !shouldRefreshSearch) {
        const nextRunAt = marketState.nextRunAt || isoAfter(CREATOR_SEARCH_REFRESH_INTERVAL_MS - msSinceIso(marketState.lastExhaustedAt || marketState.lastRunAt));
        jobState.markets[key] = { ...marketState, market: code, shop: shopLabel(shop), nextRunAt, exhaustedReason: "search_cursor_exhausted" };
        skippedMarkets.push({ market: code, shop: shopLabel(shop), reason: "search_cursor_exhausted", nextRunAt });
        continue;
      }
      if (!force && !shouldRefreshSearch && isFutureIso(marketState.nextRunAt)) {
        skippedMarkets.push({ market: code, shop: shopLabel(shop), reason: "waiting_for_next_run", nextRunAt: marketState.nextRunAt });
        continue;
      }
      let pageToken = marketState.nextPageToken || "";
      if (shouldRefreshSearch || force) pageToken = "";
      const shardIndex = (Number(marketState.shardIndex) || 0) % shardKeywords.length;
      const shardKw = shardKeywords[shardIndex] || "";
      let marketImported = 0;
      let pages = 0;

      try {
        while (pages < pagesPerRun) {
          if (pages > 0) await sleep(CREATOR_SEARCH_PAGE_DELAY_MS);
          const upstream = await searchCreators(cipher, shardKw, pageSize, pageToken);
          const normalized = normalizeCreators(upstream, categoryMap);
          upsertPlatformCreators(normalized, shop);
          marketImported += normalized.length;
          imported += normalized.length;
          pageToken = creatorNextPageToken(upstream);
          pages += 1;
          if (!pageToken) break;
        }
        // 当前分片这一页游标结束 → 轮到下一个类目分片（持续扩大覆盖，而不是停在一个搜索）。
        const cursorDone = !pageToken;
        const nextShardIndex = cursorDone ? (shardIndex + 1) % shardKeywords.length : shardIndex;
        const nextRunAt = isoAfter(CREATOR_AUTO_IMPORT_INTERVAL_MS);
        jobState.markets[key] = {
          market: code,
          shop: shopLabel(shop),
          nextPageToken: cursorDone ? "" : pageToken,
          shardIndex: nextShardIndex,
          lastImported: marketImported,
          lastRunAt: new Date().toISOString(),
          nextRunAt,
          exhausted: false,
          rateLimitCount: 0,
          lastError: "",
        };
        processed.push({ market: code, shop: shopLabel(shop), imported: marketImported, pages, shard: shardKw || "(默认)", advancedShard: cursorDone, nextRunAt, status: "processed" });
      } catch (error) {
        const message = error.message || "Creator import failed";
        const rateLimited = isTikTokRateLimitError(error);
        const rateLimitCount = rateLimited ? (Number(marketState.rateLimitCount) || 0) + 1 : Number(marketState.rateLimitCount) || 0;
        const nextRunAt = rateLimited ? isoAfter(creatorBackoffMs(rateLimitCount)) : isoAfter(CREATOR_AUTO_IMPORT_INTERVAL_MS);
        jobState.markets[key] = {
          ...marketState,
          market: code,
          shop: shopLabel(shop),
          nextPageToken: pageToken || marketState.nextPageToken || "",
          lastRunAt: new Date().toISOString(),
          nextRunAt,
          exhausted: false,
          rateLimitCount,
          lastRateLimitedAt: rateLimited ? new Date().toISOString() : marketState.lastRateLimitedAt || "",
          lastError: message,
        };
        failures.push({ market: code, shop: shopLabel(shop), message, rateLimited, nextRunAt });
      }
    }
  } finally {
    creatorJobRunning = false;
  }

  const run = {
    reason,
    startedAt,
    finishedAt: new Date().toISOString(),
    priority: CREATOR_MARKET_PRIORITY,
    imported,
    processed,
    skippedMarkets,
    failures,
    nextRunAt: Object.values(jobState.markets || {})
      .map((row) => row.nextRunAt)
      .filter(Boolean)
      .sort()[0] || "",
    total: readPlatformCreators().length,
  };
  jobState.lastRun = run;
  jobState.runs = [run, ...(jobState.runs || [])].slice(0, 20);
  writeCreatorJobState(jobState);
  return run;
}

function startCreatorAutoImportScheduler() {
  if (!CREATOR_AUTO_IMPORT_ENABLED) return;
  setTimeout(() => {
    runCreatorAutoImportOnce("startup").catch((error) => {
      const state = readCreatorJobState();
      state.lastRun = { reason: "startup", finishedAt: new Date().toISOString(), imported: 0, failures: [{ message: error.message }] };
      writeCreatorJobState(state);
    });
  }, Math.max(0, CREATOR_AUTO_IMPORT_INITIAL_DELAY_MS));
  setInterval(() => {
    runCreatorAutoImportOnce("scheduled").catch((error) => {
      const state = readCreatorJobState();
      state.lastRun = { reason: "scheduled", finishedAt: new Date().toISOString(), imported: 0, failures: [{ message: error.message }] };
      writeCreatorJobState(state);
    });
  }, Math.max(5_000, CREATOR_AUTO_IMPORT_INTERVAL_MS));
}

function formatMoney(value) {
  if (!value) return "-";
  if (typeof value === "string" || typeof value === "number") return sanitizeGmvValue(String(value));
  if (value.formatted_range) return sanitizeGmvValue(`${value.formatted_range}${value.currency ? ` ${value.currency}` : ""}`);
  if (value.amount) {
    const amount = Number(value.amount);
    const formatted = Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(value.amount);
    return sanitizeGmvValue(`${value.currency || ""} ${formatted}`.trim());
  }
  return "-";
}

function sanitizeGmvValue(value) {
  const text = String(value || "-").trim();
  if (!text) return "-";
  return text
    .replace(/\s*\/\s*月/g, "")
    .replace(/\/月/g, "")
    .replace(/^(\d+(?:[.,]\d+)?)([KMB]?)\s*[₫đ]\+?$/i, (_, amount, unit) => `VND ${amount}${unit.toUpperCase()}+`);
}

const TRANSLATE_LANG_CODES = {
  "中文": "zh-CN",
  "中文(简体)": "zh-CN",
  "简体中文": "zh-CN",
  "英语": "en",
  "越南语": "vi",
  "泰语": "th",
  "马来语": "ms",
  "印尼语": "id",
  "菲律宾语": "tl",
};

function translateLangCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (TRANSLATE_LANG_CODES[raw]) return TRANSLATE_LANG_CODES[raw];
  return raw.toLowerCase();
}

// 翻译平台可插拔：上正式只需设 TRANSLATE_PROVIDER + 对应 key，不改代码。
// 默认 mymemory（免费、有额度限制，仅过渡用）。google/deepl 上正式填 key 后启用。
const TRANSLATE_PROVIDER = (process.env.TRANSLATE_PROVIDER || "mymemory").toLowerCase();

function translateError(message, code = "TRANSLATE_FAILED", statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.payload = { ok: false, code, message };
  return error;
}

// —— Provider: MyMemory（免费过渡）——
async function translateViaMyMemory(q, sourceCode, targetCode) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", q);
  url.searchParams.set("langpair", `${sourceCode}|${targetCode}`);
  const email = process.env.MYMEMORY_EMAIL || "";
  if (email) url.searchParams.set("de", email);
  let response, data;
  try {
    response = await fetch(url);
    data = await response.json();
  } catch (cause) {
    throw translateError("翻译服务暂时无法访问，请稍后重试。", "TRANSLATE_UNREACHABLE");
  }
  const translated = data?.responseData?.translatedText || "";
  const status = Number(data?.responseStatus || response.status || 0);
  const looksLikeWarning = /MYMEMORY WARNING|PLEASE SELECT|INVALID/i.test(translated);
  if (!response.ok || status >= 400 || !translated || looksLikeWarning) {
    const detail = looksLikeWarning ? "翻译额度已用完，请稍后再试或更换语言。" : (data?.responseDetails || "翻译失败，请稍后重试。");
    throw translateError(detail);
  }
  return { ok: true, translatedText: translated, source: sourceCode, target: targetCode, provider: "mymemory", match: data?.responseData?.match };
}

// —— Provider: Google Cloud Translation v2（上正式候选，覆盖东南亚语言全）——
// 上正式：设 TRANSLATE_PROVIDER=google + GOOGLE_TRANSLATE_API_KEY。未实测，启用后需真机验证。
async function translateViaGoogle(q, sourceCode, targetCode) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY || "";
  if (!key) throw translateError("Google 翻译未配置 API key（GOOGLE_TRANSLATE_API_KEY）。", "TRANSLATE_NO_KEY", 500);
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", key);
  let response, data;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source: sourceCode.split("-")[0], target: targetCode.split("-")[0], format: "text" }),
    });
    data = await response.json();
  } catch (cause) {
    throw translateError("翻译服务暂时无法访问，请稍后重试。", "TRANSLATE_UNREACHABLE");
  }
  const translated = data?.data?.translations?.[0]?.translatedText || "";
  if (!response.ok || !translated) throw translateError(data?.error?.message || "翻译失败，请稍后重试。");
  return { ok: true, translatedText: translated, source: sourceCode, target: targetCode, provider: "google" };
}

// —— Provider: DeepL（上正式候选，质量高但东南亚语种覆盖有限）——
// 上正式：设 TRANSLATE_PROVIDER=deepl + DEEPL_API_KEY（free 用 api-free 域名）。未实测。
async function translateViaDeepL(q, sourceCode, targetCode) {
  const key = process.env.DEEPL_API_KEY || "";
  if (!key) throw translateError("DeepL 未配置 API key（DEEPL_API_KEY）。", "TRANSLATE_NO_KEY", 500);
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const body = new URLSearchParams();
  body.set("text", q);
  body.set("target_lang", targetCode.split("-")[0].toUpperCase());
  body.set("source_lang", sourceCode.split("-")[0].toUpperCase());
  let response, data;
  try {
    response = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: { "Authorization": `DeepL-Auth-Key ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    data = await response.json();
  } catch (cause) {
    throw translateError("翻译服务暂时无法访问，请稍后重试。", "TRANSLATE_UNREACHABLE");
  }
  const translated = data?.translations?.[0]?.text || "";
  if (!response.ok || !translated) throw translateError(data?.message || "翻译失败，请稍后重试。");
  return { ok: true, translatedText: translated, source: sourceCode, target: targetCode, provider: "deepl" };
}

async function translateText({ text, source, target } = {}) {
  const q = String(text || "").trim();
  if (!q) throw translateError("缺少要翻译的内容。", "TRANSLATE_TEXT_MISSING", 400);
  const sourceCode = translateLangCode(source) || "zh-CN";
  const targetCode = translateLangCode(target) || "en";
  if (sourceCode === targetCode) {
    return { ok: true, translatedText: q, source: sourceCode, target: targetCode, provider: "none" };
  }
  if (TRANSLATE_PROVIDER === "google") return translateViaGoogle(q, sourceCode, targetCode);
  if (TRANSLATE_PROVIDER === "deepl") return translateViaDeepL(q, sourceCode, targetCode);
  return translateViaMyMemory(q, sourceCode, targetCode);
}

async function handle(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  try {
    if (requestUrl.pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        service: "KOL Compass TikTok API",
        port: PORT,
        configured: requiredConfig().length === 0,
        missing: requiredConfig(),
        redirect_uri: REDIRECT_URI,
        token: tokenSummary(),
      });
    }

    if (requestUrl.pathname === "/api/tiktok/auth-url") {
      if (!APP_KEY) return json(res, 400, { ok: false, code: "CONFIG_MISSING", message: "Missing TIKTOK_SHOP_APP_KEY", missing: ["TIKTOK_SHOP_APP_KEY"] });
      const state = crypto.randomBytes(16).toString("hex");
      writeJson(STATE_FILE, { state, created_at: new Date().toISOString() });
      const authUrl = new URL("/oauth/authorize", AUTH_BASE_URL);
      authUrl.searchParams.set("app_key", APP_KEY);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("state", state);
      return json(res, 200, { ok: true, auth_url: authUrl.toString(), redirect_uri: REDIRECT_URI, state });
    }

    if (requestUrl.pathname === "/api/tiktok/callback") {
      const code = requestUrl.searchParams.get("code") || requestUrl.searchParams.get("auth_code");
      const state = requestUrl.searchParams.get("state");
      const storedState = readJson(STATE_FILE, null);
      console.log(`[oauth] callback hit: code=${code ? code.slice(0, 8) + "…" : "(none)"} state=${state ? "yes" : "no"} stateMatch=${storedState?.state ? (storedState.state === state) : "n/a"}`);
      if (!code) return html(res, 400, "<h1>TikTok Shop 授权失败</h1><p>回调缺少 code。</p>");
      if (storedState?.state && state && storedState.state !== state) {
        console.log("[oauth] callback rejected: state mismatch");
        return html(res, 400, "<h1>TikTok Shop 授权失败</h1><p>state 校验不一致，请重新绑定店铺。</p>");
      }
      let token;
      try {
        token = await exchangeToken(code);
      } catch (err) {
        console.log(`[oauth] exchange FAILED: ${err.message} ${JSON.stringify(err.payload?.upstream || {})}`);
        throw err;
      }
      console.log(`[oauth] exchange OK: seller=${token?.seller_name} open_id=${(token?.open_id || "").slice(0, 12)} shops=${(token?.shops || []).length} | store sellers=${Object.values(readTokenStore().tokens).map((t) => t.seller_name).join(",")}`);
      const sellerName = (token && token.seller_name) || (tokenSummary() && tokenSummary().seller_name) || "店铺";
      const backUrl = `${FRONTEND_URL}/#products`;
      return html(res, 200, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>店铺已绑定</title>
        <style>
          *{box-sizing:border-box} body{margin:0;font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#f1f5f9;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center}
          .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px 44px;max-width:420px;width:92%;text-align:center;box-shadow:0 10px 40px rgba(15,23,42,.08)}
          .tick{width:64px;height:64px;border-radius:50%;background:#dcfce7;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 18px}
          h1{font-size:22px;margin:0 0 8px} p{color:#475569;font-size:14px;line-height:1.6;margin:0 0 6px}
          .shop{font-weight:600;color:#0f172a}
          .btn{display:inline-block;margin-top:22px;background:#2563eb;color:#fff;text-decoration:none;padding:11px 26px;border-radius:10px;font-size:15px;font-weight:600}
          .muted{color:#94a3b8;font-size:12px;margin-top:14px}
        </style></head>
        <body><div class="card">
          <div class="tick">✓</div>
          <h1>店铺已绑定</h1>
          <p>已成功授权店铺 <span class="shop">${escapeHtml(sellerName)}</span></p>
          <p>正在返回 KOL Compass，可同步该店商品并开始建联。</p>
          <a class="btn" href="${escapeHtml(backUrl)}">返回 KOL Compass</a>
          <div class="muted">未自动跳转？点上方按钮即可。</div>
        </div>
        <script>setTimeout(function(){ location.href=${JSON.stringify(backUrl)}; }, 1500);</script>
        </body></html>`);
    }

    if (requestUrl.pathname === "/api/tiktok/refresh") {
      await refreshToken(requestUrl.searchParams.get("open_id") || "");
      return json(res, 200, { ok: true, token: tokenSummary() });
    }

    if (requestUrl.pathname === "/api/tiktok/shops") {
      // 多店铺并集（各卖家 token 名下店铺）。若 active token 还没存 shops（如旧单文件迁移来的），实时拉一次并回填 store。
      let shops = allAuthorizedShops();
      if (!shops.length) {
        const active = activeToken();
        if (active?.access_token) {
          try {
            const live = await getAuthorizedShops(active.access_token);
            if (live.length) upsertTokenEntry(active, live);
          } catch { /* ignore */ }
        }
        shops = allAuthorizedShops();
      }
      return json(res, 200, { ok: true, shops, token: tokenSummary() });
    }

    if (requestUrl.pathname === "/api/tiktok/products") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const shopCipher = body.shop_cipher || requestUrl.searchParams.get("shop_cipher") || "";
      const pageSize = body.page_size || requestUrl.searchParams.get("page_size") || 20;
      const pageToken = body.page_token || requestUrl.searchParams.get("page_token") || "";
      const upstream = await searchProducts(shopCipher, pageSize, pageToken);
      return json(res, 200, { ok: true, upstream, products: normalizeProducts(upstream) });
    }

    if (requestUrl.pathname === "/api/platform/creators") {
      return json(res, 200, { ok: true, creators: readPlatformCreators() });
    }

    if (requestUrl.pathname === "/api/platform/creators/job") {
      return json(res, 200, {
        ok: true,
        enabled: CREATOR_AUTO_IMPORT_ENABLED,
        running: creatorJobRunning,
        priority: CREATOR_MARKET_PRIORITY,
        state: readCreatorJobState(),
      });
    }

    if (requestUrl.pathname === "/api/platform/creators/import-tiktok") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = await importPlatformCreatorsFromTikTok(body);
      return json(res, 200, { ok: true, ...result });
    }

    if (requestUrl.pathname === "/api/platform/creators/job/run") {
      const result = await runCreatorAutoImportOnce("manual");
      return json(res, 200, { ok: true, ...result });
    }

    if (requestUrl.pathname === "/api/platform/creators/import-legacy") {
      const result = importLegacyCreators();
      return json(res, 200, result);
    }

    if (requestUrl.pathname === "/api/avatar") {
      return await serveCreatorAvatar(res, requestUrl.searchParams.get("cid") || "");
    }

    if (requestUrl.pathname === "/api/creators/ingest") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = ingestExtensionCreators(body);
      return json(res, 200, result);
    }

    // 达人广场钩子回流：扩展在卖家后台达人广场钩到的达人列表 → 入库（扩广度）
    if (requestUrl.pathname === "/api/creators/ingest-marketplace") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = ingestMarketplaceCreators(body);
      return json(res, 200, result);
    }

    // 商家上下文（当前店铺商品品类）——前端同步商品时写，扩展读来算"内容契合"红绿灯
    if (requestUrl.pathname === "/api/merchant/context") {
      if (req.method === "POST") {
        const body = await readRequestBody(req);
        const cats = Array.isArray(body.categories) ? body.categories.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 30) : [];
        // 产品级匹配：存客户产品名 + 提炼的关键词，供扩展做"内容贴近你的产品"判定（不只大类目）
        const productNames = Array.isArray(body.productNames) ? body.productNames.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 60) : [];
        const productKeywords = Array.isArray(body.productKeywords) ? body.productKeywords.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean).slice(0, 120) : [];
        writeJson(MERCHANT_CONTEXT_FILE, { categories: cats, productNames, productKeywords, shopName: String(body.shopName || ""), updatedAt: new Date().toISOString() });
        return json(res, 200, { ok: true, categories: cats, productKeywords });
      }
      const ctx = readJson(MERCHANT_CONTEXT_FILE, { categories: [] });
      return json(res, 200, {
        ok: true,
        categories: Array.isArray(ctx.categories) ? ctx.categories : [],
        productNames: Array.isArray(ctx.productNames) ? ctx.productNames : [],
        productKeywords: Array.isArray(ctx.productKeywords) ? ctx.productKeywords : [],
        shopName: ctx.shopName || "",
      });
    }

    if (requestUrl.pathname === "/api/tiktok/creators/search") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const shopCipher = body.shop_cipher || requestUrl.searchParams.get("shop_cipher") || "";
      const keyword = body.keyword || requestUrl.searchParams.get("keyword") || "";
      const pageSize = body.page_size || requestUrl.searchParams.get("page_size") || 12;
      const pageToken = body.page_token || requestUrl.searchParams.get("page_token") || "";
      const extraBody = body.raw && typeof body.raw === "object" ? body.raw : null; // 实验：透传任意搜索 body
      const upstream = await searchCreators(shopCipher, keyword, pageSize, pageToken, extraBody);
      return json(res, 200, { ok: true, upstream, creators: normalizeCreators(upstream) });
    }

    if (requestUrl.pathname === "/api/tiktok/samples") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const shopCipher = body.shop_cipher || requestUrl.searchParams.get("shop_cipher") || "";
      const result = await sampleOverview(shopCipher, { pageSize: body.page_size || 20, pageToken: body.page_token || "", status: body.status || "" });
      return json(res, 200, result);
    }

    if (requestUrl.pathname === "/api/tiktok/outreach/submit") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = await submitTikTokOutreach(body);
      return json(res, 200, result);
    }

    if (requestUrl.pathname === "/api/email/outreach/send") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = await sendSmtpEmail(body);
      return json(res, 200, result);
    }

    if (requestUrl.pathname === "/api/translate") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const result = await translateText(body);
      return json(res, 200, result);
    }

    return json(res, 404, { ok: false, code: "NOT_FOUND", message: "API route not found" });
  } catch (error) {
    return json(res, error.statusCode || 500, error.payload || { ok: false, code: "SERVER_ERROR", message: error.message });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (require.main === module) {
  http.createServer(handle).listen(PORT, "127.0.0.1", () => {
    console.log(`KOL Compass TikTok API listening on http://127.0.0.1:${PORT}`);
    if (requiredConfig().length) console.log(`Missing config: ${requiredConfig().join(", ")}`);
    startCreatorAutoImportScheduler();
  });
}

module.exports = { generateSign, normalizeProducts, normalizeCreators, readPlatformCreators, upsertPlatformCreators, handle };
