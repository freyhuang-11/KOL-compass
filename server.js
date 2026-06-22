const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
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
const STATE_FILE = path.join(DATA_DIR, "tiktok-oauth-state.json");

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

function readToken() {
  return readJson(TOKEN_FILE, null);
}

function tokenSummary() {
  const token = readToken();
  if (!token) return null;
  return {
    open_id: token.open_id || null,
    seller_name: token.seller_name || null,
    access_token_expires_in: token.access_token_expires_in || token.expires_in || null,
    refresh_token_expires_in: token.refresh_token_expires_in || token.refresh_expires_in || null,
    saved_at: token.saved_at || null,
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
  writeJson(TOKEN_FILE, token);
  return token;
}

async function refreshToken() {
  const existing = readToken();
  if (!existing?.refresh_token) {
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
  url.searchParams.set("refresh_token", existing.refresh_token);
  url.searchParams.set("grant_type", "refresh_token");
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.code !== 0 || !data.data?.access_token) {
    const error = new Error(data.message || "Token refresh failed");
    error.statusCode = response.status || 502;
    error.payload = { ok: false, code: data.code || "TOKEN_REFRESH_FAILED", message: error.message, upstream: data };
    throw error;
  }
  const token = { ...data.data, saved_at: new Date().toISOString() };
  writeJson(TOKEN_FILE, token);
  return token;
}

async function getAuthorizedShops() {
  const data = await tiktokFetch("/authorization/202309/shops");
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
  return tiktokFetch("/product/202309/products/search", { method: "POST", params, body });
}

async function searchCreators(shopCipher, keyword = "", pageSize = 12, pageToken = "") {
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
  const body = keyword ? { query: keyword } : {};
  return tiktokFetch("/affiliate_seller/202508/marketplace_creators/search", { method: "POST", params, body });
}

function normalizeProducts(upstream) {
  const products = upstream.data?.products || upstream.products || [];
  return products.map((item, index) => {
    const skuPrice = item.skus?.[0]?.price || {};
    const priceValue = item.price?.sale_price || item.price?.tax_exclusive_price || item.price?.original_price || skuPrice.sale_price || skuPrice.tax_exclusive_price || skuPrice.original_price || "";
    const currency = item.price?.currency || skuPrice.currency || "";
    const price = priceValue && currency ? `${currency} ${priceValue}` : priceValue;
    const category = item.category_chains?.[0]?.local_name || item.category_name || item.category?.name || "TikTok Shop";
    return {
      id: Number(String(item.id || item.product_id || Date.now() + index).replace(/\D/g, "").slice(-9)) || Date.now() + index,
      sourceId: item.id || item.product_id || "",
      name: item.title || item.name || item.product_name || `TikTok Shop 商品 ${index + 1}`,
      category,
      price: price ? String(price) : "-",
      commission: item.commission?.rate || item.open_collaboration?.commission_rate || "-",
      mode: item.open_collaboration ? "公开合作" : "店铺商品",
      status: item.status || item.audit_status || "已同步",
    };
  });
}

function normalizeCreators(upstream) {
  const data = upstream.data || {};
  const creators = data.creators || data.marketplace_creators || data.creator_profiles || data.results || [];
  return creators.map((item, index) => {
    const profile = item.profile || item.creator_profile || item;
    const username = profile.username || profile.handle || profile.creator_username || profile.tiktok_username || profile.nick_name || `creator_${index + 1}`;
    const nickname = profile.display_name || profile.nickname || profile.name || username;
    const followers = Number(profile.follower_count || profile.followers || profile.fans || 0);
    const category = profile.category || profile.main_category || profile.vertical || "TikTok Shop";
    const region = profile.region || profile.country || profile.market || "-";
    const gmv = profile.gmv || profile.monthly_gmv || profile.sales_amount || "-";
    const replyRate = profile.reply_rate || profile.response_rate || "-";
    return {
      id: Number(String(profile.creator_id || profile.open_id || profile.id || Date.now() + index).replace(/\D/g, "").slice(-9)) || Date.now() + index,
      sourceId: profile.creator_id || profile.open_id || profile.id || "",
      username: String(username).replace(/^@/, ""),
      nickname,
      type: "联盟达人",
      category,
      region,
      followers,
      gmv: String(gmv),
      replyRate: String(replyRate),
      tags: ["TikTok API"],
      status: "待联系",
      email: "",
      whatsapp: "",
      notes: "来自 TikTok Shop Affiliate Seller 达人搜索 API。",
    };
  });
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
      if (!code) return html(res, 400, "<h1>TikTok Shop 授权失败</h1><p>回调缺少 code。</p>");
      if (storedState?.state && state && storedState.state !== state) {
        return html(res, 400, "<h1>TikTok Shop 授权失败</h1><p>state 校验不一致，请重新绑定店铺。</p>");
      }
      const token = await exchangeToken(code);
      return html(res, 200, `<h1>TikTok Shop 店铺绑定成功</h1><p>token 已保存到本地后端。可以回到 KOL Compass 同步店铺和商品。</p><script>setTimeout(function(){ location.href=${JSON.stringify(`${FRONTEND_URL}/#admin`)}; }, 1200);</script><pre>${escapeHtml(JSON.stringify(tokenSummary() || token, null, 2))}</pre>`);
    }

    if (requestUrl.pathname === "/api/tiktok/refresh") {
      await refreshToken();
      return json(res, 200, { ok: true, token: tokenSummary() });
    }

    if (requestUrl.pathname === "/api/tiktok/shops") {
      const shops = await getAuthorizedShops();
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

    if (requestUrl.pathname === "/api/tiktok/creators/search") {
      const body = req.method === "POST" ? await readRequestBody(req) : {};
      const shopCipher = body.shop_cipher || requestUrl.searchParams.get("shop_cipher") || "";
      const keyword = body.keyword || requestUrl.searchParams.get("keyword") || "";
      const pageSize = body.page_size || requestUrl.searchParams.get("page_size") || 12;
      const pageToken = body.page_token || requestUrl.searchParams.get("page_token") || "";
      const upstream = await searchCreators(shopCipher, keyword, pageSize, pageToken);
      return json(res, 200, { ok: true, upstream, creators: normalizeCreators(upstream) });
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
  });
}

module.exports = { generateSign, normalizeProducts, normalizeCreators, handle };
