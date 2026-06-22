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
const CREATOR_FILE = path.join(DATA_DIR, "platform-creators.json");
const CATEGORY_FILE = path.join(DATA_DIR, "tiktok-categories.json");
const CREATOR_JOB_FILE = path.join(DATA_DIR, "platform-creator-job.json");
const CREATOR_MARKET_PRIORITY = (process.env.KOL_CREATOR_MARKET_PRIORITY || "SG,MY,TH,VN,PH")
  .split(",")
  .map((x) => x.trim().toUpperCase())
  .filter(Boolean);
const CREATOR_AUTO_IMPORT_ENABLED = process.env.KOL_CREATOR_AUTO_IMPORT_ENABLED !== "false";
const CREATOR_AUTO_IMPORT_INTERVAL_MS = Number(process.env.KOL_CREATOR_AUTO_IMPORT_INTERVAL_MS || 60 * 60 * 1000);
const CREATOR_AUTO_IMPORT_INITIAL_DELAY_MS = Number(process.env.KOL_CREATOR_AUTO_IMPORT_INITIAL_DELAY_MS || 30 * 1000);
const CREATOR_AUTO_IMPORT_PAGE_SIZE = Number(process.env.KOL_CREATOR_AUTO_IMPORT_PAGE_SIZE || 20);
const CREATOR_AUTO_IMPORT_PAGES_PER_RUN = Number(process.env.KOL_CREATOR_AUTO_IMPORT_PAGES_PER_RUN || 2);
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
  const upstream = await tiktokFetch("/product/202309/products/search", { method: "POST", params, body });
  return enrichProductSearch(upstream, shopCipher);
}

async function getProduct(shopCipher, productId) {
  return tiktokFetch(`/product/202309/products/${productId}`, { params: { shop_cipher: shopCipher } });
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

async function getCategories(shop) {
  const params = {};
  const cipher = shopCipher(shop);
  const shopId = shop?.shop_id || shop?.id || "";
  if (cipher) params.shop_cipher = cipher;
  if (shopId) params.shop_id = shopId;
  return tiktokFetch("/product/202309/categories", { params });
}

function normalizeProducts(upstream) {
  const products = upstream.data?.products || upstream.products || [];
  return products.map((item, index) => {
    const skuPrice = item.skus?.[0]?.price || {};
    const priceValue = item.price?.sale_price || item.price?.tax_exclusive_price || item.price?.original_price || skuPrice.sale_price || skuPrice.tax_exclusive_price || skuPrice.original_price || "";
    const currency = item.price?.currency || skuPrice.currency || "";
    const price = priceValue && currency ? `${currency} ${priceValue}` : priceValue;
    const category = item.category_chains?.[0]?.local_name || item.category_name || item.category?.name || "TikTok Shop";
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
      whatsapp: "",
      notes: "来自 TikTok Shop Affiliate Seller 达人搜索 API。",
    };
  });
}

function normalizeCreatorCategory(profile, categoryMap = readCategoryMap(), categoryLabels = []) {
  if (profile.category || profile.main_category || profile.vertical) return profile.category || profile.main_category || profile.vertical;
  const ids = Array.isArray(profile.category_ids) ? profile.category_ids.filter(Boolean) : [];
  const labels = categoryLabels.length ? categoryLabels : ids.map((id) => categoryMap[String(id)]).filter(Boolean);
  if (labels.length) return labels[0];
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
  const keys = [];
  const shopKey = row.sourceShopCipher || "";
  const identity = row.sourceId || row.username || "";
  if (shopKey && identity) keys.push(`${shopKey}:${identity}`);
  if (row.sourceId) keys.push(row.sourceId);
  if (row.username) keys.push(row.username);
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

function upsertPlatformCreators(incoming, shop = null) {
  const rows = readPlatformCreators();
  const existing = new Map();
  for (const row of rows) {
    for (const key of platformCreatorKeys(row)) existing.set(key, row);
  }

  const sourceShopCipher = shop ? shopCipher(shop) : "";
  const sourceShopName = shop ? shopLabel(shop) : "";
  const sourceShopRegion = shop ? normalizeCreatorRegion(shopRegion(shop)) : "";
  let changed = 0;

  for (const creator of incoming || []) {
    const region = normalizeCreatorRegion(creator.region || sourceShopRegion);
    const payload = normalizeStoredCreator({
      ...creator,
      region,
      sourceShopCipher: creator.sourceShopCipher || sourceShopCipher,
      sourceShopName: creator.sourceShopName || sourceShopName,
      sourceShopRegion: creator.sourceShopRegion || sourceShopRegion || region,
      librarySource: "platform",
      updatedAt: new Date().toISOString(),
    });
    const current = platformCreatorKeys(payload).map((key) => existing.get(key)).find(Boolean);
    if (current) {
      Object.assign(current, {
        ...payload,
        id: current.id,
        email: payload.email || current.email || "",
        whatsapp: payload.whatsapp || current.whatsapp || "",
        notes: current.notes && current.notes !== creator.notes ? current.notes : payload.notes,
      });
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
  const shops = await getAuthorizedShops();
  const categoryMap = await refreshCategoryMap(shops);
  relabelPlatformCreators(categoryMap);
  const pageSize = [12, 20].includes(Number(options.page_size)) ? Number(options.page_size) : 12;
  const maxPages = Math.max(1, Math.min(Number(options.max_pages) || 1, 10));
  const keyword = options.keyword || "";
  let imported = 0;
  let successMarkets = 0;
  const failures = [];

  for (const shop of shops) {
    const cipher = shopCipher(shop);
    if (!cipher) continue;
    let pageToken = "";
    let page = 0;
    let marketImported = 0;
    try {
      do {
        const upstream = await searchCreators(cipher, keyword, pageSize, pageToken);
        const normalized = normalizeCreators(upstream, categoryMap);
        const result = upsertPlatformCreators(normalized, shop);
        marketImported += normalized.length;
        pageToken = upstream.data?.next_page_token || upstream.data?.nextPageToken || upstream.data?.pagination?.next_page_token || "";
        page += 1;
        if (pageToken) await new Promise((resolve) => setTimeout(resolve, 700));
        if (result.total >= 20000) break;
      } while (pageToken && page < maxPages);
      imported += marketImported;
      successMarkets += 1;
    } catch (error) {
      imported += marketImported;
      if (marketImported > 0) successMarkets += 1;
      failures.push({ shop: shopLabel(shop), message: error.message || "Import failed" });
    }
  }

  return {
    imported,
    successMarkets,
    failures,
    total: readPlatformCreators().length,
    creators: readPlatformCreators(),
  };
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

async function runCreatorAutoImportOnce(reason = "scheduled") {
  if (creatorJobRunning) return { skipped: true, reason: "job_already_running" };
  creatorJobRunning = true;
  const startedAt = new Date().toISOString();
  const jobState = readCreatorJobState();
  let imported = 0;
  const failures = [];
  const processed = [];

  try {
    const shops = sortShopsByCreatorPriority(await getAuthorizedShops());
    const categoryMap = await refreshCategoryMap(shops);
    relabelPlatformCreators(categoryMap);

    for (const shop of shops) {
      const code = marketCode(shop);
      const cipher = shopCipher(shop);
      if (!cipher || !CREATOR_MARKET_PRIORITY.includes(code)) continue;

      const key = cipher;
      const marketState = jobState.markets[key] || {};
      let pageToken = marketState.nextPageToken || "";
      let marketImported = 0;
      let pages = 0;

      try {
        while (pages < CREATOR_AUTO_IMPORT_PAGES_PER_RUN) {
          const upstream = await searchCreators(cipher, "", CREATOR_AUTO_IMPORT_PAGE_SIZE, pageToken);
          const normalized = normalizeCreators(upstream, categoryMap);
          upsertPlatformCreators(normalized, shop);
          marketImported += normalized.length;
          imported += normalized.length;
          pageToken = upstream.data?.next_page_token || upstream.data?.nextPageToken || upstream.data?.pagination?.next_page_token || "";
          pages += 1;
          if (!pageToken) break;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        jobState.markets[key] = {
          market: code,
          shop: shopLabel(shop),
          nextPageToken: pageToken,
          lastImported: marketImported,
          lastRunAt: new Date().toISOString(),
          exhausted: !pageToken,
          lastError: "",
        };
        processed.push({ market: code, shop: shopLabel(shop), imported: marketImported, nextPageToken: Boolean(pageToken) });
      } catch (error) {
        const message = error.message || "Creator import failed";
        jobState.markets[key] = {
          ...marketState,
          market: code,
          shop: shopLabel(shop),
          nextPageToken: pageToken || marketState.nextPageToken || "",
          lastRunAt: new Date().toISOString(),
          exhausted: false,
          lastError: message,
        };
        failures.push({ market: code, shop: shopLabel(shop), message });
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
    failures,
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
  }, Math.max(60_000, CREATOR_AUTO_IMPORT_INTERVAL_MS));
}

function formatMoney(value) {
  if (!value) return "-";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.formatted_range) return `${value.formatted_range}${value.currency ? ` ${value.currency}` : ""}`;
  if (value.amount) {
    const amount = Number(value.amount);
    const formatted = Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(value.amount);
    return `${value.currency || ""} ${formatted}`.trim();
  }
  return "-";
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
    startCreatorAutoImportScheduler();
  });
}

module.exports = { generateSign, normalizeProducts, normalizeCreators, readPlatformCreators, upsertPlatformCreators, handle };
