const STORAGE_KEY = "kol-compass-state-v1";
const API_BASE = "http://127.0.0.1:8015";
let platformCreatorLibraryLoaded = false;
let productAutoSyncInFlight = false;
const PRODUCT_AUTO_SYNC_INTERVAL_MS = 60 * 1000;

const pages = [
  ["运营", [
    ["dashboard", "控制台"],
    ["products", "产品管理"],
    ["kol", "达人库"],
    ["outreach", "建联记录"],
  ]],
  ["配置", [
    ["autoReply", "自动回复"],
    ["templates", "消息模板"],
    ["blacklist", "KOL黑名单"],
  ]],
  ["履约", [
    ["samples", "寄样管理"],
    ["cooperations", "合作管理"],
    ["messages", "系统消息"],
  ]],
  ["系统", [
    ["team", "账号与团队"],
    ["billing", "订阅计费"],
    ["admin", "平台管理端"],
  ]],
];

const pageKeys = new Set(pages.flatMap(([, items]) => items.map(([key]) => key)));
const fixedTags = ["高ROI", "可复投", "需催发", "内容优质", "低效合作"];
const outputStatuses = ["全部", "待产出", "已发视频", "已直播", "视频+直播", "逾期未产出", "有订单未匹配内容", "合作结束"];
const creatorTypeOptions = ["短视频达人", "直播达人", "短视频+直播达人"];
const tiktokCategoryOptions = ["美妆个护", "女装与内衣", "男装与运动", "鞋包配饰", "手机数码", "家居日用", "食品饮料", "母婴用品", "健康保健", "宠物用品", "汽车摩托", "图书文具", "玩具爱好", "户外运动"];
const marketOptions = ["新加坡", "越南", "马来西亚", "泰国", "菲律宾", "印尼", "美国", "英国", "沙特", "墨西哥"];
const marketRegionLabels = {
  SG: "新加坡",
  SGP: "新加坡",
  VN: "越南",
  VNM: "越南",
  MY: "马来西亚",
  MYS: "马来西亚",
  TH: "泰国",
  THA: "泰国",
  PH: "菲律宾",
  PHL: "菲律宾",
  ID: "印尼",
  IDN: "印尼",
  US: "美国",
  USA: "美国",
  UK: "英国",
  GB: "英国",
  GBR: "英国",
  SA: "沙特",
  SAU: "沙特",
  MX: "墨西哥",
  MEX: "墨西哥",
};
const followerTierOptions = ["<10K", "10K-100K", "100K-1M", ">1M"];
const replyRateOptions = [">=60%", "40%-60%", "<40%"];
const gmvRangeOptions = ["有GMV", "无GMV"];
const contactOptions = ["有Email", "有WhatsApp", "有Email或WhatsApp", "无联系方式"];
const tiktokScopeOptions = [["product", "商品"], ["affiliate", "联盟/达人"], ["messaging", "消息"], ["order", "订单"]];
const planQuotas = { "免费版": 100, "基础版": 1000, "专业版": 5000, "企业版": Infinity };
const rolePermissions = {
  "超级管理员": "全局数据、团队管理、订阅管理、全部业务操作",
  "运营经理": "全局数据、自动回复、模板、寄样审批、合作管理",
  "BD专员": "个人达人筛选、建联发送、沟通回复、寄样发起",
  "客服": "已建立联系达人回复、寄样物流跟进、只读合作记录",
};

const seed = {
  page: "dashboard",
  selectedCreatorId: null,
  bulkCreatorIds: [],
  filters: {
    productSearch: "",
    productSearchField: "商品名",
    kolSearch: "",
    kolTypes: [],
    kolCategories: [],
    kolRegions: [],
    kolFollowers: "全部",
    kolReplyRate: "全部",
    kolGmv: "全部",
    kolContact: "全部",
    kolInterest: "可建联",
    kolPage: 1,
    kolPageSize: 20,
    blacklistSearch: "",
    outreachSearch: "",
    outreachStatus: "全部",
    outreachChannel: "全部",
    sampleSearch: "",
    sampleStatus: "全部",
    coopSearch: "",
    coopOutput: "全部",
    coopStatus: "全部",
    coopTag: "全部",
    dashboardRange: "本月",
    dashboardOwner: "全部",
    messageType: "全部",
    messageRead: "全部",
  },
  settings: {
    tiktokConnected: false,
    apiStatus: "未连接",
    lastProductSync: "尚未同步",
    lastProductSyncAt: "",
    lastCreatorSync: "尚未同步",
    tiktokClientKey: "",
    tiktokRedirectUrl: "http://localhost:8015/api/tiktok/callback",
    tiktokScopes: "product,affiliate,messaging,order",
    tiktokLastAuthCheck: "尚未检查",
    tiktokBackendStatus: "未检查",
    tiktokShopName: "",
    tiktokShopCipher: "",
    tiktokShops: [],
    selectedTikTokShopCipher: "",
    tiktokTokenSavedAt: "",
    emailConnected: false,
    emailProvider: "Gmail",
    emailAddress: "",
    emailSmtpHost: "smtp.gmail.com",
    emailSmtpPort: "587",
    emailImapHost: "imap.gmail.com",
    emailImapPort: "993",
    planName: "专业版",
    featureSwitches: {
      tiktokMessaging: true,
      emailMessaging: true,
      whatsappMessaging: false,
      translation: true,
      stripePayment: false,
    },
    demoDataClearedVersion: 2,
  },
  products: [],
  creators: [],
  outreach: [],
  targetCollaborations: [],
  samples: [],
  cooperations: [],
  templates: [],
  autoReplies: [],
  systemMessages: [],
  syncLogs: [],
  team: [],
  merchantApplications: [],
  billingRecords: [],
  operationLogs: [],
};

let state = normalizeState(loadState());
applyRoute();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn(error);
  }
  return structuredClone(seed);
}

function normalizeState(next) {
  const merged = { ...structuredClone(seed), ...next };
  merged.filters = { ...seed.filters, ...(next.filters || {}) };
  merged.settings = { ...seed.settings, ...(next.settings || {}) };
  merged.settings.featureSwitches = { ...seed.settings.featureSwitches, ...((next.settings || {}).featureSwitches || {}) };
  if ((next.settings || {}).demoDataClearedVersion !== 2) purgeDemoData(merged);
  merged.settings.demoDataClearedVersion = 2;
  if (Array.isArray(merged.autoReplies)) merged.autoReplies = merged.autoReplies.map(normalizeAutoReply);
  if (Array.isArray(merged.team)) merged.team = merged.team.map(normalizeTeamMember);
  if (!Array.isArray(merged.merchantApplications)) merged.merchantApplications = [];
  if (!Array.isArray(merged.billingRecords)) merged.billingRecords = [];
  if (!Array.isArray(merged.bulkCreatorIds)) merged.bulkCreatorIds = [];
  if (!Array.isArray(merged.targetCollaborations)) merged.targetCollaborations = [];
  if (!Array.isArray(merged.syncLogs)) merged.syncLogs = [];
  if (!Array.isArray(merged.operationLogs)) merged.operationLogs = [];
  if (Array.isArray(merged.creators)) merged.creators = merged.creators.map(normalizeCreatorRecord);
  return merged;
}

function normalizeCreatorRecord(row = {}) {
  const avgVideoViews = metricNumber(row.avgVideoViews ?? row.avgVideoViewCount ?? row.averageVideoViews) || metricFromTags(row.tags, "均播");
  const avgLiveUv = metricNumber(row.avgLiveUv ?? row.avgLiveUvCount ?? row.averageLiveUv) || metricFromTags(row.tags, "直播UV");
  return {
    ...row,
    type: normalizeCreatorType(row.type, { avgVideoViews, avgLiveUv }),
    avgVideoViews,
    avgLiveUv,
    tags: normalizeCreatorTags(row.tags, { avgVideoViews, avgLiveUv }),
  };
}

function purgeDemoData(next) {
  next.products = (next.products || []).filter((row) => row.sourceId);
  next.creators = (next.creators || []).filter((row) => row.sourceId || row.librarySource === "platform");
  const productIds = new Set(next.products.map((row) => row.id));
  const creatorIds = new Set(next.creators.map((row) => row.id));
  next.outreach = (next.outreach || []).filter((row) => creatorIds.has(row.creatorId) && productIds.has(row.productId));
  next.targetCollaborations = (next.targetCollaborations || []).filter((row) => (row.creatorIds || []).some((id) => creatorIds.has(id)) && (row.productIds || []).some((id) => productIds.has(id)));
  next.samples = (next.samples || []).filter((row) => creatorIds.has(row.creatorId) && productIds.has(row.productId));
  next.cooperations = (next.cooperations || []).filter((row) => creatorIds.has(row.creatorId) && productIds.has(row.productId));
  next.templates = [];
  next.autoReplies = [];
  next.systemMessages = [];
  next.syncLogs = [];
  next.team = [];
  next.merchantApplications = [];
  next.billingRecords = [];
  next.operationLogs = [];
  next.bulkCreatorIds = [];
  next.selectedCreatorId = null;
}

function normalizeAutoReply(rule) {
  return {
    id: rule.id || Date.now(),
    name: rule.name || "未命名规则",
    matchType: rule.matchType || "包含关键词",
    keywords: rule.keywords || String(rule.condition || "").replace(/^包含\s*/, ""),
    creatorType: rule.creatorType === "全部" ? "全部" : normalizeCreatorType(rule.creatorType || "全部"),
    region: rule.region || "全部",
    minFollowers: Number(rule.minFollowers || 0),
    priority: Number(rule.priority || 50),
    replyContent: rule.replyContent || rule.action || "发送指定模板",
    enabled: rule.enabled !== false,
  };
}

function normalizeTeamMember(member) {
  return {
    id: member.id || Date.now(),
    name: member.name || "未命名成员",
    role: member.role || "BD专员",
    email: member.email || "",
    stores: member.stores || "全部店铺",
    status: member.status || "启用",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function routeFromHash() {
  const raw = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
  if (!raw) return { page: state.page || "dashboard", selectedCreatorId: null };
  const creatorMatch = raw.match(/^kol\/creator\/(\d+)$/);
  if (creatorMatch) return { page: "kol", selectedCreatorId: Number(creatorMatch[1]) };
  const page = raw.split("?")[0];
  return { page: pageKeys.has(page) ? page : "dashboard", selectedCreatorId: null };
}

function applyRoute() {
  const route = routeFromHash();
  state.page = route.page;
  state.selectedCreatorId = route.selectedCreatorId;
  saveState();
}

function navigateHash(hash) {
  const next = `#${hash}`;
  if (location.hash === next) {
    applyRoute();
    render();
  } else {
    location.hash = next;
  }
}

function setPage(page) {
  navigateHash(page);
}

function money(v) {
  const n = Number(v || 0);
  return "$" + n.toLocaleString();
}

function pct(v) {
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : "-";
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(value = new Date()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 7);
  return parsed.toISOString().slice(0, 7);
}

function dateOnly(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function datePlus(base, days) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function inActivityRange(value, range) {
  if (range === "全部") return true;
  const date = dateOnly(value);
  if (!date) return false;
  const today = dateOnly(new Date());
  if (range === "本月") return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  const days = range === "近7天" ? 7 : 30;
  return date >= datePlus(today, -(days - 1)) && date <= today;
}

function inDueRange(value, range) {
  if (range === "全部") return true;
  const date = dateOnly(value);
  if (!date) return false;
  const today = dateOnly(new Date());
  if (range === "本月") return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  const days = range === "近7天" ? 7 : 30;
  return date >= today && date <= datePlus(today, days);
}

function outreachQuota() {
  return planQuotas[state.settings.planName] ?? planQuotas["专业版"];
}

function monthlyOutreachUsed() {
  const current = monthKey();
  return state.outreach.filter((x) => monthKey(x.updatedAt || new Date()) === current && x.status !== "发送失败").length;
}

function quotaRemaining() {
  const quota = outreachQuota();
  if (!Number.isFinite(quota)) return Infinity;
  return Math.max(0, quota - monthlyOutreachUsed());
}

function quotaLabel() {
  const quota = outreachQuota();
  return Number.isFinite(quota) ? `${monthlyOutreachUsed()} / ${quota}` : `${monthlyOutreachUsed()} / 不限`;
}

function lastOutreachForCreator(creatorId) {
  return state.outreach
    .filter((x) => x.creatorId === creatorId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
}

function hoursSince(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return Infinity;
  return (Date.now() - time) / 36e5;
}

function isNotInterestedBlocked(c) {
  return c?.status === "不感兴趣" && (!c.notInterestedUntil || c.notInterestedUntil >= todayString());
}

function isOutreachCoolingDown(c) {
  const last = lastOutreachForCreator(c?.id);
  return last && hoursSince(last.updatedAt) < 24 && last.status !== "已关闭";
}

function creatorOutreachBlockReason(c) {
  if (!c) return "达人不存在";
  if (c.status === "黑名单") return "黑名单";
  if (isNotInterestedBlocked(c)) return `不感兴趣至 ${c.notInterestedUntil}`;
  if (isOutreachCoolingDown(c)) return "24小时内已建联";
  return "";
}

function creatorFollowerTierOk(followers, tier) {
  const value = Number(followers || 0);
  if (tier === "<10K") return value < 10000;
  if (tier === "10K-100K") return value >= 10000 && value <= 100000;
  if (tier === "100K-1M") return value > 100000 && value <= 1000000;
  if (tier === ">1M") return value > 1000000;
  return true;
}

function creatorReplyRateOk(replyRate, tier) {
  if (tier === "全部") return true;
  if (replyRate === "-" || replyRate === "" || replyRate === null || replyRate === undefined) return false;
  const value = Number(String(replyRate || "0").replace("%", ""));
  if (tier === ">=60%") return value >= 60;
  if (tier === "40%-60%") return value >= 40 && value < 60;
  if (tier === "<40%") return value < 40;
  return true;
}

function creatorGmvNumber(value) {
  const text = String(value || "").toUpperCase().replaceAll(",", "");
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (text.includes("M")) return amount * 1000000;
  if (text.includes("K")) return amount * 1000;
  return amount;
}

function creatorGmvRangeOk(gmv, range) {
  const value = creatorGmvNumber(gmv);
  if (range === "有GMV") return value > 0 || (gmv && gmv !== "-");
  if (range === "无GMV") return !value && (!gmv || gmv === "-");
  return true;
}

function creatorGmvDisplay(gmv) {
  const text = String(gmv || "-").trim();
  if (!text || text === "-") return "-";
  return normalizeGmvDisplay(text);
}

function normalizeGmvDisplay(value) {
  const text = String(value || "-").trim().replace(/\s*\/\s*月/g, "").replace(/\/月/g, "");
  if (!text || text === "-") return "-";
  return text
    .replace(/^(\d+(?:[.,]\d+)?)([KMB]?)\s*[₫đ]\+?$/i, (_, amount, unit) => `VND ${amount}${unit.toUpperCase()}+`)
    .replace(/\s+/g, " ");
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

function normalizeCreatorTags(tags, metrics = {}) {
  const blocked = new Set(["TikTok API", "平台达人库", "联盟达人"]);
  const values = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !blocked.has(tag) && !/^均播\s*/.test(tag) && !/^直播UV\s*/i.test(tag));
  return Array.from(new Set(values));
}

function creatorMetricValue(c, key) {
  const value = metricNumber(c?.[key]);
  return value ? value.toLocaleString() : "-";
}

function creatorVisibleTags(c) {
  return normalizeCreatorTags(c?.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
}

function creatorPortrait(c, className = "creator-portrait") {
  if (!c) return `<span class="${className}">?</span>`;
  const initial = escapeHtml(String(c.username || c.nickname || "?").slice(0, 1).toUpperCase());
  return c.avatarUrl
    ? `<span class="${className}"><img src="${escapeHtml(c.avatarUrl)}" alt="${escapeHtml(c.username || c.nickname || "达人头像")}" /></span>`
    : `<span class="${className}">${initial}</span>`;
}

function creatorContactOk(c, filter) {
  const hasEmail = Boolean(c?.email);
  const hasWa = Boolean(c?.whatsapp);
  if (filter === "有Email") return hasEmail;
  if (filter === "有WhatsApp") return hasWa;
  if (filter === "有Email或WhatsApp") return hasEmail || hasWa;
  if (filter === "无联系方式") return !hasEmail && !hasWa;
  return true;
}

function filterValues(value) {
  if (Array.isArray(value)) return value.filter((x) => x && x !== "全部");
  if (!value || value === "全部") return [];
  return [value];
}

function multiFilterOk(selected, value) {
  const values = filterValues(selected);
  return !values.length || values.includes(value);
}

function creatorCategoryValues(c) {
  const values = [c?.category, ...(Array.isArray(c?.categoryLabels) ? c.categoryLabels : [])];
  return Array.from(new Set(values.map(normalizeCreatorCategoryLabel).filter(Boolean)));
}

function normalizeCreatorCategoryLabel(value) {
  const text = String(value || "").trim();
  const map = {
    "Sửa chữa nhà cửa": "家装维修",
    "Sữa chữa nhà cửa": "家装维修",
    "Công cụ & Phần cứng": "工具五金",
    "Máy tính & Thiết bị Văn phòng": "电脑办公",
    "Bộ sưu tập": "收藏品",
    "Thời trang Hồi giáo": "穆斯林时尚",
    "Phụ kiện trang sức & Phái sinh": "珠宝配饰",
  };
  return map[text] || text;
}

function creatorCategoryFilterOk(selected, c) {
  const values = filterValues(selected);
  if (!values.length) return true;
  const creatorValues = creatorCategoryValues(c);
  return values.some((item) => creatorValues.includes(item));
}

function resetKolFilters() {
  state.filters.kolSearch = "";
  state.filters.kolTypes = [];
  state.filters.kolCategories = [];
  state.filters.kolFollowers = "全部";
  state.filters.kolReplyRate = "全部";
  state.filters.kolGmv = "全部";
  state.filters.kolContact = "全部";
  state.filters.kolInterest = "可建联";
  state.bulkCreatorIds = [];
  saveState();
  render();
}

function roi(row) {
  const spend = Number(row.commission || 0) + Number(row.adSpend || 0);
  if (!spend) return null;
  return Number(row.gmv || 0) / spend;
}

function creator(id) {
  return state.creators.find((x) => x.id === Number(id));
}

function product(id) {
  return state.products.find((x) => x.id === Number(id));
}

function badge(text) {
  const map = {
    "已发视频": "info",
    "已直播": "success",
    "视频+直播": "success",
    "待产出": "warning",
    "逾期未产出": "danger",
    "有订单未匹配内容": "danger",
    "合作结束": "neutral",
    "待回复": "warning",
    "待我方回复": "danger",
    "已签收": "success",
    "待发货": "warning",
    "在售": "success",
    "可选": "success",
    "不可选": "warning",
    "已下架": "neutral",
    "启用": "success",
    "黑名单": "danger",
  };
  return `<span class="badge ${map[text] || "neutral"}">${text}</span>`;
}

function detailCoopStage(cooperation) {
  if (!cooperation || cooperation.status === "合作结束") return "合作结束";
  if (cooperation.status === "待产出" || cooperation.status === "逾期未产出") return "合作执行中";
  if (cooperation.status === "有订单未匹配内容") return "合作待核对";
  return "合作中";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function appLayout(content) {
  const nav = pages.map(([group, items]) => `
    <div class="nav-group-title">${group}</div>
    ${items.map(([key, label]) => `
      <button class="nav-item ${state.page === key ? "active" : ""}" onclick="setPage('${key}')">
        ${svgIcon(key)}<span>${label}</span>
      </button>
    `).join("")}
  `).join("");

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">KOL Compass<small>TikTok Shop 达人建联后台</small></div>
        ${nav}
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="topbar-title">本地可用版本 · 端口建议 5175 · 不占用 5173/5174</div>
          <div class="filters">
            ${badge(state.settings.apiStatus)}
            <button class="btn" onclick="exportState()">导出数据</button>
            <button class="btn" onclick="importState()">导入数据</button>
            <button class="btn" onclick="resetDemo()">清空本地数据</button>
          </div>
        </div>
        <div class="content">${content}</div>
      </main>
    </div>
    ${modalRoot()}
  `;
}

const navIconPaths = {
  dashboard: `<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>`,
  products: `<path d="M6.5 8.5 12 5l5.5 3.5v7L12 19l-5.5-3.5z"></path><path d="M6.7 8.7 12 12l5.3-3.3"></path><path d="M12 12v6.8"></path>`,
  kol: `<circle cx="12" cy="8" r="3.2"></circle><path d="M5.5 19c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8"></path>`,
  outreach: `<path d="M4 6.5h16v11H4z"></path><path d="m4.5 7 7.5 6 7.5-6"></path>`,
  autoReply: `<path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9"></path><path d="M19.5 5.2V9h-3.8"></path><path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15"></path><path d="M4.5 18.8V15h3.8"></path>`,
  templates: `<path d="M6 3.5h9l3 3v14H6z"></path><path d="M14.5 3.5V7h3.5"></path><path d="M8.5 11h7"></path><path d="M8.5 14.5h7"></path><path d="M8.5 18h4.5"></path>`,
  blacklist: `<circle cx="12" cy="12" r="8"></circle><path d="m7 17 10-10"></path>`,
  samples: `<path d="M4.5 8h15v11.5h-15z"></path><path d="M8 8V6a4 4 0 0 1 8 0v2"></path><path d="M9 13h6"></path>`,
  cooperations: `<path d="M8.5 12.5 11 15a3 3 0 0 0 4.2 0l3.3-3.3a3 3 0 0 0 0-4.2l-.8-.8a3 3 0 0 0-4.2 0l-1.1 1.1"></path><path d="M15.5 11.5 13 9a3 3 0 0 0-4.2 0l-3.3 3.3a3 3 0 0 0 0 4.2l.8.8a3 3 0 0 0 4.2 0l1.1-1.1"></path>`,
  messages: `<path d="M4.5 5.5h15v10.8h-9L6.5 20v-3.7h-2z"></path><path d="M8 9.5h8"></path><path d="M8 12.5h5"></path>`,
  team: `<circle cx="9" cy="8" r="3"></circle><path d="M3.8 19c.9-3.2 2.6-4.8 5.2-4.8s4.3 1.6 5.2 4.8"></path><path d="M15.5 10.8a2.5 2.5 0 1 0-.2-5"></path><path d="M16.3 14.2c2.1.4 3.4 1.9 3.9 4.8"></path>`,
  billing: `<rect x="4" y="5.5" width="16" height="13" rx="2"></rect><path d="M4 9h16"></path><path d="M7.5 14.5h4"></path><path d="M15.5 14.5h1"></path>`,
  admin: `<circle cx="12" cy="12" r="3"></circle><path d="M19.2 13.5a7.6 7.6 0 0 0 0-3l2-1.2-2-3.4-2.1 1a7.5 7.5 0 0 0-2.6-1.5L14.2 3h-4.4l-.3 2.4A7.5 7.5 0 0 0 6.9 7L4.8 6 2.8 9.3l2 1.2a7.6 7.6 0 0 0 0 3l-2 1.2 2 3.4 2.1-1a7.5 7.5 0 0 0 2.6 1.5l.3 2.4h4.4l.3-2.4a7.5 7.5 0 0 0 2.6-1.5l2.1 1 2-3.4z"></path>`,
};

function svgIcon(key) {
  const paths = navIconPaths[key] || navIconPaths.dashboard;
  return `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function pageHead(title, desc, action = "") {
  return `
    <div class="page-head">
      <div>
        <h1 class="page-title">${title}</h1>
        <div class="page-desc">${desc}</div>
      </div>
      <div>${action}</div>
    </div>
  `;
}

function stat(label, value, note = "", action = "") {
  const attrs = action ? ` role="button" tabindex="0" onclick="${action}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${action}}"` : "";
  return `<div class="card stat-card ${action ? "clickable" : ""}"${attrs}><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`;
}

function trendBar(label, value, max, note = "", action = "") {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  const click = action ? ` onclick="${action}"` : "";
  return `
    <div class="trend-row ${action ? "clickable" : ""}"${click}>
      <div class="trend-head"><b>${label}</b><span>${value}</span></div>
      <div class="trend-track"><div class="trend-fill" style="width:${width}%"></div></div>
      ${note ? `<div class="muted">${note}</div>` : ""}
    </div>
  `;
}

function renderDashboard() {
  const range = state.filters.dashboardRange || "本月";
  const owner = state.filters.dashboardOwner || "全部";
  const owners = Array.from(new Set(state.cooperations.map((x) => x.owner).filter(Boolean)));
  const dashboardCoops = state.cooperations.filter((x) => {
    const ownerOk = owner === "全部" || x.owner === owner;
    return ownerOk && inDueRange(x.dueDate, range);
  });
  const dashboardOutreach = state.outreach.filter((x) => inActivityRange(x.updatedAt, range));
  const dashboardSamples = state.samples.filter((x) => inActivityRange(x.updatedAt, range));
  const totalOutreach = dashboardOutreach.length;
  const replied = dashboardOutreach.filter((x) => x.status === "待我方回复").length;
  const activeCoops = dashboardCoops.filter((x) => x.status !== "合作结束").length;
  const sampleOpen = dashboardSamples.filter((x) => x.status !== "已签收").length;
  const gmv = dashboardCoops.reduce((sum, x) => sum + Number(x.gmv || 0), 0);
  const output = dashboardCoops.filter((x) => x.videos > 0 || x.lives > 0).length;
  const riskCoops = dashboardCoops.filter((x) => ["逾期未产出", "有订单未匹配内容", "待产出"].includes(x.status));
  const statusCounts = outputStatuses
    .filter((x) => x !== "全部")
    .map((status) => ({ status, count: dashboardCoops.filter((x) => x.status === status).length }))
    .filter((x) => x.count > 0);
  const maxStatus = Math.max(0, ...statusCounts.map((x) => x.count));
  const ownerRows = owners.map((name) => {
    const rows = state.cooperations.filter((x) => x.owner === name && inDueRange(x.dueDate, range));
    const produced = rows.filter((x) => x.videos > 0 || x.lives > 0).length;
    return { name, rows, produced, gmv: rows.reduce((sum, x) => sum + Number(x.gmv || 0), 0) };
  }).filter((x) => x.rows.length > 0);
  const maxOwnerGmv = Math.max(0, ...ownerRows.map((x) => x.gmv));
  return `
    ${pageHead("控制台", "查看建联、寄样、合作履约和归因 GMV 的整体状态。")}
    <div class="toolbar">
      <div class="filters">
        <select class="select" onchange="setFilter('dashboardRange', this.value)" aria-label="控制台时间范围">
          ${["本月", "近7天", "近30天", "全部"].map((x) => `<option ${range === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('dashboardOwner', this.value)" aria-label="控制台负责人">
          ${["全部", ...owners].map((x) => `<option ${owner === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <span class="muted">活动按更新时间统计，合作按产出截止日统计。</span>
      </div>
      <div class="filters">
        <button class="btn" onclick="dashboardGo('messages')">查看系统消息</button>
        <button class="btn" onclick="dashboardGo('cooperations')">进入合作管理</button>
      </div>
    </div>
    <div class="grid grid-4">
      ${stat(`${range}建联数`, totalOutreach, "进入建联记录查看明细", "dashboardGo('outreach','outreachStatus','全部')")}
      ${stat("待我方回复", replied, "需要 BD 处理", "dashboardGo('outreach','outreachStatus','待我方回复')")}
      ${stat("合作中 KOL", activeCoops, owner === "全部" ? "全部负责人" : `负责人：${owner}`, "dashboardGo('cooperations','coopStatus','全部')")}
      ${stat("寄样中", sampleOpen, "待审核/待发货/运输中", "dashboardGo('samples')")}
      ${stat(`${range}预估 GMV`, money(gmv), "仅统计合作管理中的归因 GMV", "dashboardGo('cooperations','coopStatus','全部')")}
      ${stat("已产出合作", output, "视频或直播数大于 0", "dashboardGo('cooperations','coopOutput','已产出')")}
      ${stat("逾期未产出", dashboardCoops.filter((x) => x.status === "逾期未产出").length, "需要催发或终止", "dashboardGo('cooperations','coopStatus','逾期未产出')")}
      ${stat("API连接状态", state.settings.apiStatus, "未连接时使用本地数据", "dashboardGo('admin')")}
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>今日优先事项</h3>
        <div class="timeline">
          ${riskCoops.slice(0, 4).map((x) => `
            <div class="message">
              <b>${creator(x.creatorId)?.username || "-"}</b> · ${product(x.productId)?.name || "-"} · ${badge(x.status)}
              <div class="muted">${escapeHtml(x.notes)}</div>
              <div style="margin-top:8px"><button class="btn ghost" onclick="dashboardGo('cooperations','coopStatus','${escapeJs(x.status)}')">处理同类问题</button></div>
            </div>
          `).join("") || `<div class="empty">暂无需要处理的合作。</div>`}
        </div>
      </div>
      <div class="card">
        <h3>内容状态分布</h3>
        ${statusCounts.map((x) => trendBar(x.status, x.count, maxStatus, "点击筛选合作管理", `dashboardGo('cooperations','coopStatus','${escapeJs(x.status)}')`)).join("") || `<div class="empty">当前范围内暂无合作数据。</div>`}
      </div>
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>负责人概览</h3>
        ${ownerRows.map((x) => trendBar(escapeHtml(x.name), x.gmv, maxOwnerGmv, `${x.rows.length} 个合作 · 已产出 ${x.produced} 个 · ${money(x.gmv)}`, `setFilter('dashboardOwner','${escapeJs(x.name)}')`)).join("") || `<div class="empty">暂无负责人数据。</div>`}
      </div>
      <div class="card">
        <h3>TikTok API 接入状态</h3>
        <div class="notice">
          当前版本不会假设 API 已可用。你已登录 Partner 账号时，可以从“平台管理端”查看接入前置条件；授权、scope、验证码和回调配置需要人工完成。
        </div>
        <div style="margin-top:12px">
          <button class="btn primary" onclick="setPage('admin')">去平台管理端</button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts() {
  const shops = state.settings.tiktokShops || [];
  const selectedShop = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || shops[0];
  maybeAutoSyncProducts();
  const rows = state.products.filter((p) => {
    const kw = state.filters.productSearch.trim().toLowerCase();
    if (!kw) return true;
    if (state.filters.productSearchField === "商品ID") return String(p.sourceId || p.id || "").toLowerCase().includes(kw);
    return String(p.name || "").toLowerCase().includes(kw);
  });
  const activeCount = rows.filter((p) => ["可选", "在售"].includes(p.status)).length;
  return `
    ${pageHead("产品管理", "第一步绑定店铺并读取商品；第二步进入达人库筛选达人并发起建联。", `<button class="btn primary" onclick="setPage('kol')">下一步：筛选达人</button>`)}
    <section class="store-panel">
      <div>
        <div class="section-kicker">TikTok Shop 授权</div>
        <h3>${escapeHtml(selectedShop ? shopLabel(selectedShop) : "尚未绑定店铺")}</h3>
        <p>${shops.length ? `已授权 ${shops.length} 个店铺，当前商品源会自动用于建联、寄样和合作流程。下一步进入达人库同步并筛选 TikTok 达人。` : "完成店铺授权后，系统会自动同步店铺、商品，并开放达人库同步入口。"}</p>
        <div class="store-meta">
          <span>后端：${escapeHtml(state.settings.tiktokBackendStatus || "未检查")}</span>
          <span>上次同步：${escapeHtml(state.settings.lastProductSync)}</span>
        </div>
      </div>
      <div class="store-actions">
        ${shops.length ? `
          <select class="select" onchange="selectTikTokShop(this.value)">
            ${shops.map((shop) => {
              const cipher = shopCipher(shop);
              return `<option value="${escapeHtml(cipher)}" ${cipher === state.settings.selectedTikTokShopCipher ? "selected" : ""}>${escapeHtml(shopLabel(shop))}</option>`;
            }).join("")}
          </select>
          <button class="btn" onclick="setPage('admin')">管理授权</button>
          <button class="btn primary" onclick="syncProducts()">重新同步商品</button>
          <button class="btn" onclick="setPage('kol')">进入达人库</button>
        ` : `
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
          <button class="btn" onclick="setPage('admin')">API配置</button>
        `}
      </div>
    </section>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("已授权店铺", shops.length, "来自 TikTok OAuth")}
      ${stat("当前商品", rows.length, "按当前筛选统计")}
      ${stat("可售商品", activeCount, "状态为 可选 / 在售")}
      ${stat("商品源", selectedShop ? shopRegion(selectedShop) : "-", "当前同步市场")}
    </div>
    <div class="surface-panel">
    <div class="toolbar compact-toolbar">
      <div class="filters">
        <select class="select compact-select" onchange="setFilter('productSearchField', this.value)">
          ${["商品名", "商品ID"].map((x) => `<option ${state.filters.productSearchField === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <input class="input product-search-input" placeholder="请输入" value="${escapeHtml(state.filters.productSearch)}" oninput="setFilter('productSearch', this.value)" />
      </div>
      <div class="filters">
        <button class="btn" onclick="addProduct()">商品来源说明</button>
      </div>
    </div>
    ${productList(rows)}
    </div>
  `;
}

function renderKolPool() {
  const shops = state.settings.tiktokShops || [];
  const selectedShop = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || shops[0];
  const currentMarket = selectedShop ? selectedShopMarket(selectedShop) : "";
  const realCreators = state.creators.filter((c) => c.sourceId);
  const marketCreators = currentMarket ? state.creators.filter((c) => normalizeMarketRegion(c.region) === currentMarket || c.sourceShopCipher === shopCipher(selectedShop)) : state.creators;
  const realMarketCreators = marketCreators.filter((c) => c.sourceId);
  const localCreators = marketCreators.filter((c) => !c.sourceId);
  const typeOptions = creatorTypeOptions;
  const categories = fixedOptions(tiktokCategoryOptions, state.creators.flatMap((c) => creatorCategoryValues(c)));
  state.filters.kolTypes = filterValues(state.filters.kolTypes).filter((x) => typeOptions.includes(x));
  state.filters.kolCategories = filterValues(state.filters.kolCategories).filter((x) => categories.includes(x));
  const rows = marketCreators.filter((c) => {
    const kw = state.filters.kolSearch.trim().toLowerCase();
    const typeOk = multiFilterOk(state.filters.kolTypes, c.type);
    const categoryOk = creatorCategoryFilterOk(state.filters.kolCategories, c);
    const followersOk = creatorFollowerTierOk(c.followers, state.filters.kolFollowers);
    const replyRateOk = creatorReplyRateOk(c.replyRate, state.filters.kolReplyRate);
    const gmvOk = creatorGmvRangeOk(c.gmv, state.filters.kolGmv);
    const contactOk = creatorContactOk(c, state.filters.kolContact);
    const kwOk = !kw || [c.username, c.nickname, c.category, c.region, normalizeCreatorTags(c.tags).join(",")].join(" ").toLowerCase().includes(kw);
    const interestOk = state.filters.kolInterest === "显示不感兴趣" ? c.status !== "黑名单" : c.status !== "黑名单" && !isNotInterestedBlocked(c);
    return typeOk && categoryOk && followersOk && replyRateOk && gmvOk && contactOk && kwOk && interestOk;
  });
  const availableRows = rows.filter((c) => !creatorOutreachBlockReason(c));
  const blockedRows = rows.filter((c) => creatorOutreachBlockReason(c));
  state.bulkCreatorIds = (state.bulkCreatorIds || []).filter((id) => availableRows.some((c) => c.id === id));
  const pageSize = [20, 50, 100].includes(Number(state.filters.kolPageSize)) ? Number(state.filters.kolPageSize) : 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(state.filters.kolPage || 1)), totalPages);
  state.filters.kolPage = currentPage;
  state.filters.kolPageSize = pageSize;
  const pageStart = (currentPage - 1) * pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + pageSize);
  const pageAvailableRows = pagedRows.filter((c) => !creatorOutreachBlockReason(c));
  const selectedAvailableCount = (state.bulkCreatorIds || []).filter((id) => {
    const c = creator(id);
    return c && !creatorOutreachBlockReason(c);
  }).length;
  const pageAvailableIds = `[${pageAvailableRows.map((c) => c.id).join(",")}]`;
  const filteredAvailableIds = `[${availableRows.map((c) => c.id).join(",")}]`;
  const pageAllSelected = pageAvailableRows.length > 0 && pageAvailableRows.every((c) => state.bulkCreatorIds.includes(c.id));
  return `
    ${pageHead("达人库", "第二步：从平台达人库筛选达人；系统按当前绑定店铺市场自动展示对应国家达人。")}
    <section class="store-panel">
      <div>
        <div class="section-kicker">达人库来源</div>
        <h3>${escapeHtml(selectedShop ? shopLabel(selectedShop) : "请先绑定 TikTok Shop 店铺")}</h3>
        <p>${selectedShop ? `当前店铺市场：${escapeHtml(currentMarket || "未识别")}。系统只展示该市场达人，不再让客户手动选择国家；达人基础资料来自我们平台达人库。` : "客户第一步必须先完成店铺绑定，否则无法按店铺市场筛选达人。"}</p>
        <div class="store-meta">
          <span>当前市场真实达人：${realMarketCreators.length}</span>
          <span>全部真实达人：${realCreators.length}</span>
          <span>平台补充达人：${localCreators.length}</span>
          <span>资料来源：平台达人库</span>
        </div>
      </div>
      <div class="store-actions">
        ${shops.length ? `
          <select class="select" onchange="selectTikTokShop(this.value)">
            ${shops.map((shop) => {
              const cipher = shopCipher(shop);
              return `<option value="${escapeHtml(cipher)}" ${cipher === state.settings.selectedTikTokShopCipher ? "selected" : ""}>${escapeHtml(shopLabel(shop))}</option>`;
            }).join("")}
          </select>
        ` : `
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
        `}
        <button class="btn" onclick="setPage('products')">返回产品管理</button>
      </div>
    </section>
    ${selectedShop && !realMarketCreators.length ? `<div class="notice" style="margin-bottom:12px">当前店铺市场暂时没有平台真实达人数据。下方如果看到达人，是平台补充数据；客户侧不提供导入或新增达人入口。</div>` : ""}
    <div class="notice" style="margin-bottom:12px">当前套餐：${escapeHtml(state.settings.planName)}，本月建联配额已用 ${quotaLabel()}。同一达人 24 小时内只能建联一次；标记不感兴趣后 30 天内不可建联。</div>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("当前筛选", rows.length, "符合筛选条件的达人")}
      ${stat("可建联达人", availableRows.length, "未命中黑名单、冷却和不感兴趣规则")}
      ${stat("暂不可建联", blockedRows.length, "查看表格首列的拦截原因")}
      ${stat("已选择", selectedAvailableCount, "将进入一键建联")}
    </div>
    <div class="toolbar filter-toolbar">
      <div class="kol-filter-panel">
        <div class="filter-search-row">
          <input class="input kol-search-input" placeholder="搜索达人、用户名、标签..." value="${escapeHtml(state.filters.kolSearch)}" oninput="setFilter('kolSearch', this.value)" />
          ${singleFilterSelect("kolFollowers", "粉丝量级", followerTierOptions)}
          ${singleFilterSelect("kolGmv", "TikTok GMV", gmvRangeOptions)}
          ${singleFilterSelect("kolReplyRate", "回复率", replyRateOptions)}
          ${singleFilterSelect("kolContact", "联系方式", contactOptions)}
          <label class="filter-select">
            <span>建联状态</span>
            <select class="select" onchange="setFilter('kolInterest', this.value)">
              ${["可建联", "显示不感兴趣"].map((x) => `<option ${state.filters.kolInterest === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
            </select>
          </label>
        </div>
        ${multiFilterChips("kolTypes", "达人类型", typeOptions)}
        ${multiFilterChips("kolCategories", "TikTok 类目", categories)}
        <div class="filter-chip-row"><span>当前店铺市场</span><button class="chip active" type="button">${escapeHtml(currentMarket || "绑定店铺后自动识别")}</button></div>
      </div>
    </div>
    ${rows.length ? `
      <div class="bulk-action-bar">
        <div>
          <b>批量建联</b>
          <span class="muted">当前第 ${currentPage} / ${totalPages} 页，已选 ${selectedAvailableCount} 位达人</span>
        </div>
        <div class="filters">
          <button class="btn" onclick="selectVisibleCreators(${pageAvailableIds})">全选本页可建联</button>
          <button class="btn" onclick="selectVisibleCreators(${filteredAvailableIds})">全选筛选结果</button>
          <button class="btn ghost" onclick="clearBulkSelection()">清空选择</button>
          <button class="btn primary" onclick="openOutreachModal()">一键建联(${state.bulkCreatorIds.length})</button>
        </div>
      </div>
      ${table([`<label class="table-check"><input type="checkbox" ${pageAllSelected ? "checked" : ""} onchange="toggleCreatorPageSelection(${pageAvailableIds}, this.checked)" /> 本页</label>`, "达人", "类型", "类目/地区", "粉丝", "TikTok GMV（接口币种）", "内容表现", "回复率", "状态/标签", "操作"], pagedRows.map((c) => {
      const blockReason = creatorOutreachBlockReason(c);
      return [
      blockReason ? `<span class="muted">${escapeHtml(blockReason)}</span>` : `<input type="checkbox" ${state.bulkCreatorIds.includes(c.id) ? "checked" : ""} onchange="toggleCreatorSelection(${c.id}, this.checked)" aria-label="选择 @${escapeHtml(c.username)}" />`,
      personCell(c),
      normalizeCreatorType(c.type, c),
      `${creatorCategoryValues(c).map(escapeHtml).join(" / ")}<br><span class="muted">${escapeHtml(c.region)}</span>`,
      c.followers.toLocaleString(),
      creatorGmvDisplay(c.gmv),
      `<div class="metric-stack"><span>视频平均播放 ${creatorMetricValue(c, "avgVideoViews")}</span><span>直播观看人数 ${creatorMetricValue(c, "avgLiveUv")}</span></div>`,
      c.replyRate,
      `${c.status === "不感兴趣" ? badge("不感兴趣") : ""} ${creatorVisibleTags(c)}`,
      `${blockReason ? "" : `<button class="btn" onclick="openOutreachModal(${c.id})">建联</button>`} <button class="btn ghost" onclick="showCreator(${c.id})">详情</button> ${c.status === "不感兴趣" ? `<button class="btn ghost" onclick="clearNotInterested(${c.id})">恢复建联</button>` : `<button class="btn ghost" onclick="markNotInterested(${c.id})">不感兴趣</button>`} <button class="btn ghost" onclick="blacklistCreator(${c.id})">拉黑</button>`,
    ];
      }))}
      ${paginationBar("kol", currentPage, totalPages, pageSize, rows.length)}
    ` : `<div class="empty-state">当前市场有 ${realMarketCreators.length} 个平台达人，但被筛选条件过滤为空。<button class="btn" onclick="resetKolFilters()">清空筛选</button></div>`}
  `;
}

function outreachMessageCell(o) {
  const translated = o.translatedMessage ? `<div class="muted" style="margin-top:6px">翻译稿（${escapeHtml(o.translationLanguage || "目标语言")}）：${escapeHtml(o.translatedMessage)}</div>` : "";
  const target = targetCollaboration(o.targetCollaborationId);
  const targetInfo = target ? `<div class="target-summary"><b>${escapeHtml(target.name)}</b><span>${escapeHtml(targetCollaborationStatusText(target))}</span><span>商品 ${target.productIds.length} 个 · 达人 ${target.creatorIds.length} 位 · ${escapeHtml((target.deliverables || []).join("+") || "-")}</span></div>` : "";
  const invite = o.inviteLink ? `<div style="margin-top:8px"><a class="link" href="${escapeHtml(o.inviteLink)}">查看邀请链接</a> <button class="btn ghost" onclick="copyInviteLink(${o.id})">复制链接</button></div>` : "";
  return `${escapeHtml(o.lastMessage)}${targetInfo}${translated}${invite}`;
}

function renderOutreach() {
  const channels = Array.from(new Set(state.outreach.map((o) => o.channel).filter(Boolean)));
  const statuses = Array.from(new Set(state.outreach.map((o) => o.status).filter(Boolean)));
  const totalCount = state.outreach.length;
  const waitingCreatorCount = state.outreach.filter((o) => o.status === "待回复").length;
  const pendingApiCount = state.outreach.filter((o) => o.status === "待API发送").length;
  const convertedCount = state.outreach.filter((o) => o.status === "已转合作").length;
  const rows = state.outreach.filter((o) => {
    const c = creator(o.creatorId);
    const productNames = outreachProductNames(o);
    const kw = state.filters.outreachSearch.trim().toLowerCase();
    const kwOk = !kw || [c?.username, c?.nickname, productNames, o.lastMessage].join(" ").toLowerCase().includes(kw);
    const statusOk = state.filters.outreachStatus === "全部" || o.status === state.filters.outreachStatus;
    const channelOk = state.filters.outreachChannel === "全部" || o.channel === state.filters.outreachChannel;
    return kwOk && statusOk && channelOk;
  });
  return `
    ${pageHead("建联记录", "统一查看 TikTok 定向邀约、私信、Email 的沟通状态和待处理消息。")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("建联总数", totalCount, "全部沟通记录", "setFilter('outreachStatus','全部')")}
      ${stat("待达人回复", waitingCreatorCount, "已发出邀请，等待达人响应", "setFilter('outreachStatus','待回复')")}
      ${stat("待API发送", pendingApiCount, "定向邀约或 TikTok 私信尚未提交官方接口", "setFilter('outreachStatus','待API发送')")}
      ${stat("已转合作", convertedCount, "已进入合作管理履约", "setFilter('outreachStatus','已转合作')")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、产品、消息..." value="${escapeHtml(state.filters.outreachSearch)}" oninput="setFilter('outreachSearch', this.value)" />
        <select class="select" onchange="setFilter('outreachStatus', this.value)">
          ${["全部", ...statuses].map((x) => `<option ${state.filters.outreachStatus === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('outreachChannel', this.value)">
          ${["全部", ...channels].map((x) => `<option ${state.filters.outreachChannel === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <span class="muted">当前显示 ${rows.length} / ${totalCount} 条</span>
      </div>
    </div>
    ${table(["达人", "产品", "渠道", "状态", "最后消息", "更新时间", "操作"], rows.map((o) => [
      personCell(creator(o.creatorId)),
      outreachProductCell(o),
      o.channel,
      badge(o.status),
      outreachMessageCell(o),
      o.updatedAt,
      outreachActions(o),
    ]))}
  `;
}

function renderAutoReply() {
  const enabledCount = state.autoReplies.filter((r) => r.enabled).length;
  return `
    ${pageHead("自动回复", "配置关键词和条件触发后的自动回复动作；本地测试只验证规则命中，不发送真实外部消息。", `<button class="btn primary" onclick="openAutoReplyModal()">新增规则</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">
      ${stat("规则总数", state.autoReplies.length, "最多 50 条")}
      ${stat("启用规则", enabledCount, "按优先级命中第一条")}
      ${stat("触发渠道", "同来源", "真实收发接入后按消息来源回复")}
    </div>
    ${table(["规则名称", "规则类型", "触发条件", "回复内容", "优先级/状态", "操作"], [...state.autoReplies].sort((a, b) => a.priority - b.priority).map((r) => [
      escapeHtml(r.name),
      escapeHtml(r.matchType),
      autoReplyConditionText(r),
      escapeHtml(r.replyContent),
      `P${Number(r.priority || 50)}<br>${r.enabled ? badge("启用") : badge("停用")}`,
      `<button class="btn" onclick="openAutoReplyModal(${r.id})">编辑</button> <button class="btn ghost" onclick="openAutoReplyTest(${r.id})">测试</button> <button class="btn ghost" onclick="toggleAutoReply(${r.id})">${r.enabled ? "停用" : "启用"}</button> <button class="btn ghost" onclick="deleteAutoReply(${r.id})">删除</button>`,
    ]))}
  `;
}

function renderTemplates() {
  return `
    ${pageHead("消息模板", "维护 TikTok 私信、Email、WhatsApp 的建联与跟进模板。", `<button class="btn primary" onclick="openTemplateModal()">新增模板</button>`)}
    ${table(["模板名称", "渠道", "内容", "操作"], state.templates.map((t) => [
      t.name,
      t.channel,
      escapeHtml(t.content),
      `<button class="btn" onclick="openTemplateModal(${t.id})">编辑</button> <button class="btn ghost" onclick="deleteTemplate(${t.id})">删除</button>`,
    ]))}
  `;
}

function renderBlacklist() {
  const rows = state.creators.filter((c) => {
    if (c.status !== "黑名单") return false;
    const kw = state.filters.blacklistSearch.trim().toLowerCase();
    return !kw || [c.username, c.nickname, c.category, c.region, c.blacklistReason, c.notes, (c.tags || []).join(",")].join(" ").toLowerCase().includes(kw);
  });
  const total = state.creators.filter((c) => c.status === "黑名单").length;
  const withReason = state.creators.filter((c) => c.status === "黑名单" && (c.blacklistReason || c.notes)).length;
  return `
    ${pageHead("KOL黑名单", "管理不可再触达的达人，防止重复骚扰和低效合作。")}
    <div class="grid grid-3">
      ${stat("黑名单达人", total, "保存建联时自动拦截")}
      ${stat("有原因记录", withReason, "便于团队复盘")}
      ${stat("当前显示", rows.length, "受搜索条件影响")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、类目、地区、原因..." value="${escapeHtml(state.filters.blacklistSearch)}" oninput="setFilter('blacklistSearch', this.value)" />
      </div>
      <div class="filters">
        <span class="muted">移出黑名单后达人回到待联系，但仍受 24 小时限发和不感兴趣规则约束。</span>
      </div>
    </div>
    ${table(["达人", "类目/地区", "原因/备注", "拉黑时间", "操作"], rows.map((c) => [
      personCell(c),
      `${escapeHtml(c.category || "-")}<br><span class="muted">${escapeHtml(c.region || "-")}</span>`,
      escapeHtml(c.blacklistReason || c.notes || "-"),
      escapeHtml(c.blacklistedAt || "历史数据"),
      `<button class="btn" onclick="restoreCreator(${c.id})">移出黑名单</button>`,
    ]))}
  `;
}

function renderSamples() {
  const statuses = Array.from(new Set(state.samples.map((s) => s.status).filter(Boolean)));
  const rows = state.samples.filter((s) => {
    const c = creator(s.creatorId);
    const p = product(s.productId);
    const kw = state.filters.sampleSearch.trim().toLowerCase();
    const kwOk = !kw || [c?.username, c?.nickname, p?.name, s.status, s.tracking].join(" ").toLowerCase().includes(kw);
    const statusOk = state.filters.sampleStatus === "全部" || s.status === state.filters.sampleStatus;
    return kwOk && statusOk;
  });
  const openCount = state.samples.filter((s) => !["已签收", "已拒绝"].includes(s.status)).length;
  const signedCount = state.samples.filter((s) => s.status === "已签收").length;
  const rejectedCount = state.samples.filter((s) => s.status === "已拒绝").length;
  return `
    ${pageHead("寄样管理", "同步或手工维护样品申请、审核、发货和签收状态。", `<button class="btn primary" onclick="openSampleModal()">新增寄样</button>`)}
    <div class="grid grid-4">
      ${stat("寄样总数", state.samples.length, "本地样品台账")}
      ${stat("处理中", openCount, "待审核/待发货/已发货")}
      ${stat("已签收", signedCount, "可转合作")}
      ${stat("已拒绝", rejectedCount, "不再推进")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、产品、物流单号..." value="${escapeHtml(state.filters.sampleSearch)}" oninput="setFilter('sampleSearch', this.value)" />
        <select class="select" onchange="setFilter('sampleStatus', this.value)">
          ${["全部", ...statuses].map((x) => `<option ${state.filters.sampleStatus === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
      <div class="filters">
        <span class="muted">当前显示 ${rows.length} 条</span>
      </div>
    </div>
    ${table(["达人", "产品", "状态", "物流单号", "更新时间", "操作"], rows.map((s) => [
      personCell(creator(s.creatorId)),
      product(s.productId)?.name || "-",
      badge(s.status),
      s.tracking || "-",
      s.updatedAt,
      sampleActions(s),
    ]))}
  `;
}

function renderCooperations() {
  const rows = state.cooperations.filter((c) => {
    const cr = creator(c.creatorId);
    const p = product(c.productId);
    const kw = state.filters.coopSearch.trim().toLowerCase();
    const produced = Number(c.videos || 0) > 0 || Number(c.lives || 0) > 0;
    const kwOk = !kw || [cr?.username, cr?.nickname, p?.name, c.type, c.status, c.owner, c.notes, c.tags.join(",")].join(" ").toLowerCase().includes(kw);
    const outputOk = state.filters.coopOutput === "全部" || (state.filters.coopOutput === "已产出" ? produced : !produced);
    const statusOk = state.filters.coopStatus === "全部" || c.status === state.filters.coopStatus;
    const tagOk = state.filters.coopTag === "全部" || c.tags.includes(state.filters.coopTag);
    return kwOk && outputOk && statusOk && tagOk;
  });
  const produced = state.cooperations.filter((x) => x.videos > 0 || x.lives > 0).length;
  const unproduced = state.cooperations.length - produced;
  const gmv = state.cooperations.reduce((sum, x) => sum + Number(x.gmv || 0), 0);
  const visibleGmv = rows.reduce((sum, x) => sum + Number(x.gmv || 0), 0);
  const visibleOrders = rows.reduce((sum, x) => sum + Number(x.orders || 0), 0);
  const visibleSpend = rows.reduce((sum, x) => sum + Number(x.commission || 0) + Number(x.adSpend || 0), 0);
  const visibleRoi = visibleSpend > 0 ? visibleGmv / visibleSpend : 0;
  const focus = rows[0] || state.cooperations[0];
  const focusCreator = focus ? creator(focus.creatorId) : null;
  const focusProduct = focus ? product(focus.productId) : null;
  const focusRoi = focus ? roi(focus) : 0;
  const allTags = Array.from(new Set([...fixedTags, ...state.cooperations.flatMap((x) => x.tags)]));
  return `
    ${pageHead("合作管理", "内容追踪唯一主入口：视频、直播、GMV、订单、佣金、ROI 都在这里管理。", `<button class="btn primary" onclick="openCoopModal()">新增合作</button>`)}
    ${focus ? `<div class="warning-box" style="margin-bottom:14px">有 1 项内容追踪需要核对：${escapeHtml(focusCreator?.username || "-")} · ${escapeHtml(focusProduct?.name || "-")}</div>` : ""}
    <div class="grid grid-4">
      ${stat("合作总数", state.cooperations.length, "已进入履约阶段")}
      ${stat("已产出达人", produced, "已发视频或已直播")}
      ${stat("未产出达人", unproduced, "待产出/逾期/待匹配")}
      ${stat("归因 GMV", money(gmv), "来自合作台账或 API 同步")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、产品、负责人、备注..." value="${escapeHtml(state.filters.coopSearch)}" oninput="setFilter('coopSearch', this.value)" />
        <select class="select" onchange="setFilter('coopOutput', this.value)">
          ${["全部", "已产出", "未产出"].map((x) => `<option ${state.filters.coopOutput === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('coopStatus', this.value)">
          ${outputStatuses.map((x) => `<option ${state.filters.coopStatus === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('coopTag', this.value)">
          ${["全部", ...allTags].map((x) => `<option ${state.filters.coopTag === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <button class="btn" onclick="markOverdue()">检查逾期未产出</button>
      </div>
      <div class="filters">
        <button class="btn" onclick="downloadCoopsCsvTemplate()">下载合作模板</button>
        <button class="btn" onclick="importCoopsCsv()">导入合作 CSV</button>
        <button class="btn" onclick="syncCoopData()">同步 TikTok 内容/订单</button>
      </div>
    </div>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("当前视图GMV", money(visibleGmv), "按当前筛选结果汇总")}
      ${stat("当前订单", visibleOrders, "用于判断销售贡献")}
      ${stat("佣金+投流", money(visibleSpend), "佣金支出加投流支出")}
      ${stat("当前ROI", visibleRoi ? `${visibleRoi.toFixed(1)}x` : "-", "GMV / 佣金与投流支出")}
    </div>
    ${focus ? `
      <div class="coop-detail-grid">
        <div class="card">
          <h3>合作生命周期</h3>
          <div class="stage-list">
            ${["创建合作", "发送样品", "样品签收", "发布内容", "销售复盘"].map((name, idx) => `
              <div class="stage-item">
                <span class="stage-dot ${idx === 3 ? "active" : ""}"></span>
                <div><b>${name}</b><div class="muted">${idx < 3 ? "已完成" : idx === 3 ? badge(focus.status) : "待复盘"}</div></div>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="work-panel">
          <div class="card">
            <div class="tabs"><span class="tab">合作概览</span><span class="tab">样品记录</span><span class="tab active">内容追踪</span><span class="tab">销售追踪</span><span class="tab">ROI分析</span></div>
            <div class="content-card-grid">
              <div class="card" style="box-shadow:none">
                <h3>短视频追踪</h3>
                <div class="media-row">
                  <div class="media-thumb">TikTok Content</div>
                  <div>
                    <b>${escapeHtml(focusProduct?.name || "-")}</b>
                    <p class="muted">视频 ${focus.videos || 0} · 截止 ${escapeHtml(focus.dueDate || "-")}</p>
                    <div class="grid grid-3">
                      ${stat("播放", focus.videos ? "1,204" : "-", "本地示例")}
                      ${stat("GMV", money(focus.gmv || 0), "归因")}
                      ${stat("订单", focus.orders || 0, "联盟订单")}
                    </div>
                  </div>
                </div>
              </div>
              <div class="card" style="box-shadow:none">
                <h3>直播追踪</h3>
                <p><b>场次：</b>${focus.lives || 0}</p>
                <p><b>直播 GMV：</b>${money(focus.gmv || 0)}</p>
                <p><b>在线人数：</b>${focus.lives ? "1,450" : "-"}</p>
                <div class="notice">未授权 TikTok API 时使用本地台账，不伪造真实同步。</div>
              </div>
            </div>
          </div>
          <div class="card">
            <h3>ROI 分析</h3>
            <div class="grid grid-4">
              ${stat("佣金率", focus.commission ? "30%" : "-", "按台账估算")}
              ${stat("件均成本", "$49.99", "本地参考")}
              ${stat("佣金支出", money(focus.commission || 0), "Total")}
              ${stat("当前 ROI", focusRoi ? `${focusRoi.toFixed(1)}x` : "-", "GMV / 支出")}
            </div>
          </div>
        </div>
      </div>
    ` : ""}
    ${table(["达人", "产品", "合作类型", "内容状态", "内容数据", "GMV / ROI", "标签", "负责人", "操作"], rows.map((c) => {
      const r = roi(c);
      return [
        personCell(creator(c.creatorId)),
        `${escapeHtml(product(c.productId)?.name || "-")}${c.inviteLink ? `<div style="margin-top:8px"><a class="link" href="${escapeHtml(c.inviteLink)}">邀请链接</a></div>` : ""}`,
        c.type,
        badge(c.status),
        `视频 ${c.videos || 0}<br>直播 ${c.lives || 0}<br><span class="muted">截止 ${c.dueDate || "-"}</span>`,
        `${money(c.gmv)}<br><span class="muted">订单 ${c.orders || 0} · ROI ${r ? r.toFixed(1) + "x" : "-"}</span>`,
        c.tags.map((t) => `<button class="tag" onclick="setFilter('coopTag','${escapeJs(t)}')">${escapeHtml(t)}</button>`).join("") || "-",
        c.owner || "-",
        `${coopActions(c)}`,
      ];
    }))}
  `;
}

function renderMessages() {
  pruneSystemMessages();
  const types = Array.from(new Set(state.systemMessages.map((m) => m.type).filter(Boolean)));
  const rows = state.systemMessages
    .filter((m) => state.filters.messageType === "全部" || m.type === state.filters.messageType)
    .filter((m) => state.filters.messageRead === "全部" || (state.filters.messageRead === "未读" ? !m.read : m.read))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const unread = state.systemMessages.filter((m) => !m.read).length;
  return `
    ${pageHead("系统消息", "新回复、自动回复、寄样状态、合作到期、同步日志和系统公告。", `<button class="btn primary" onclick="markAllMessagesRead()">全部已读</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">
      ${stat("消息总数", state.systemMessages.length, "本地保留最近 90 天")}
      ${stat("未读消息", unread, "需要跟进")}
      ${stat("消息类型", types.length, "可按类型筛选")}
    </div>
    <div class="card" style="margin-bottom:16px">
      <h3>同步日志</h3>
      ${table(["模块", "状态", "原因", "时间"], state.syncLogs.slice(0, 8).map((log) => [
        escapeHtml(log.module),
        badge(log.status),
        escapeHtml(log.reason),
        escapeHtml(log.at),
      ]))}
    </div>
    <div class="toolbar">
      <div class="filters">
        <select class="select" onchange="setFilter('messageType', this.value)">
          ${["全部", ...types].map((x) => `<option ${state.filters.messageType === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('messageRead', this.value)">
          ${["全部", "未读", "已读"].map((x) => `<option ${state.filters.messageRead === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="timeline">
      ${rows.map((m) => `
        <div class="message ${m.read ? "" : "inbound"}">
          <b>${escapeHtml(m.type)}</b> · <span class="muted">${escapeHtml(m.at)}</span> · ${m.read ? badge("已读") : badge("未读")}
          <div>${escapeHtml(m.text)}</div>
          <div style="margin-top:8px">
            ${m.read ? "" : `<button class="btn ghost" onclick="markMessageRead(${m.id})">标记已读</button>`}
            <button class="btn ghost" onclick="deleteMessage(${m.id})">删除</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTeam() {
  const enabled = state.team.filter((m) => m.status === "启用").length;
  const roles = Array.from(new Set(state.team.map((m) => m.role)));
  return `
    ${pageHead("账号与团队", "管理团队成员、角色权限、可访问店铺和操作日志。", `<button class="btn primary" onclick="openTeamMemberModal()">新增成员</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">
      ${stat("团队成员", state.team.length, `${enabled} 人启用`)}
      ${stat("角色数量", roles.length, "按 PRD 权限矩阵")}
      ${stat("操作日志", state.operationLogs.length, "本地保留最近 180 天")}
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h3>TikTok Shop Partner 账号</h3>
        <p class="muted">当前状态：${badge(state.settings.apiStatus)}</p>
        <button class="btn primary" onclick="simulateConnect()">标记为已登录/待授权</button>
      </div>
      <div class="card">
        <h3>发送渠道</h3>
        <p>Email / WhatsApp / TikTok 私信开关在平台管理端统一控制。</p>
      </div>
    </div>
    <div style="margin-top:16px">
      ${table(["姓名", "角色", "权限摘要", "可访问店铺", "邮箱", "状态", "操作"], state.team.map((m) => [
        escapeHtml(m.name),
        escapeHtml(m.role),
        escapeHtml(rolePermissions[m.role] || "-"),
        escapeHtml(m.stores || "-"),
        escapeHtml(m.email),
        badge(m.status),
        `<button class="btn" onclick="openTeamMemberModal(${m.id})">编辑</button> <button class="btn ghost" onclick="toggleTeamMember(${m.id})">${m.status === "启用" ? "禁用" : "启用"}</button>`,
      ]))}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>操作日志</h3>
      ${table(["操作人", "动作", "对象", "内容", "IP", "时间"], state.operationLogs.slice(0, 10).map((log) => [
        escapeHtml(log.operator),
        escapeHtml(log.action),
        escapeHtml(log.target),
        escapeHtml(log.detail),
        escapeHtml(log.ip),
        escapeHtml(log.at),
      ]))}
    </div>
  `;
}

function renderBilling() {
  const stripeEnabled = Boolean(state.settings.featureSwitches.stripePayment);
  const records = state.billingRecords || [];
  const paid = records.filter((x) => x.status === "已支付").length;
  const pending = records.filter((x) => x.status !== "已支付").length;
  return `
    ${pageHead("订阅计费", "查看套餐、配额和账单。支付通道由平台管理端开关控制。")}
    <div class="notice" style="margin-bottom:16px">当前可用支付通道：支付宝、微信支付${stripeEnabled ? "、Stripe" : "。Stripe 支付已由平台管理端关闭"}。</div>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("当前套餐", state.settings.planName, "本地配置")}
      ${stat("本月建联配额", quotaLabel(), "按建联记录计算")}
      ${stat("剩余额度", Number.isFinite(quotaRemaining()) ? quotaRemaining() : "不限", "额度不足会拦截建联")}
      ${stat("账单记录", records.length, `${paid} 已支付 / ${pending} 待处理`)}
    </div>
    <div class="grid grid-4">
      ${["免费版|$0|100 建联/月", "基础版|$29|1,000 建联/月", "专业版|$99|5,000 建联/月", "企业版|$299|不限量"].map((raw) => {
        const [name, price, quota] = raw.split("|");
        const active = state.settings.planName === name;
        return `<div class="card"><h3>${name}</h3><div class="stat-value">${price}</div><p>${quota}</p><button class="btn ${active ? "primary" : ""}" onclick="selectPlan('${name}')">${active ? "当前套餐" : "选择套餐"}</button></div>`;
      }).join("")}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>账单与支付记录</h3>
      <div class="notice" style="margin-bottom:12px">当前为本地账单台账，用于验收套餐和配额流程；切换套餐只记录本地变更，不会发起真实扣款或开票。</div>
      ${table(["账单号", "周期", "套餐", "金额", "支付通道", "状态", "创建时间", "备注"], records.map((row) => [
        escapeHtml(row.invoiceNo),
        escapeHtml(row.period),
        escapeHtml(row.plan),
        escapeHtml(row.amount),
        escapeHtml(row.channel),
        badge(row.status),
        escapeHtml(row.createdAt),
        escapeHtml(row.note || "-"),
      ]))}
    </div>
  `;
}

function renderAdmin() {
  const switches = [
    ["tiktokMessaging", "TikTok私信", "核心建联入口，通常保持启用"],
    ["emailMessaging", "Email消息", "控制 Email 建联和回复渠道"],
    ["whatsappMessaging", "WhatsApp消息", "控制 WhatsApp 建联和回复渠道"],
    ["translation", "消息翻译", "控制翻译功能入口"],
    ["stripePayment", "Stripe支付", "控制订阅页 Stripe 支付入口"],
  ];
  const applications = state.merchantApplications || [];
  const pending = applications.filter((x) => x.status === "待审批").length;
  const approved = applications.filter((x) => x.status === "已通过").length;
  const needsInfo = applications.filter((x) => x.status === "资料补充").length;
  const blocked = applications.filter((x) => ["授权阻塞", "配置不完整"].includes(x.apiStatus)).length;
  const shops = state.settings.tiktokShops || [];
  return `
    ${pageHead("平台管理端", "功能开关、API 接入状态、商家统计和入驻审批。")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("申请商家", applications.length, "本地入驻台账")}
      ${stat("待审批", pending, "需要平台处理")}
      ${stat("已通过", approved, "可进入本地试用")}
      ${stat("接入阻塞", blocked + needsInfo, "资料或 API 未就绪")}
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h3>功能开关</h3>
        ${switches.map(([key, name, desc]) => {
          const enabled = Boolean(state.settings.featureSwitches[key]);
          return `
          <div class="toolbar" style="margin:8px 0">
            <div>
              <b>${name}</b>
              <div class="muted">${desc}</div>
            </div>
            <div>
              ${badge(enabled ? "启用" : "停用")}
              <button class="btn ghost" onclick="toggleFeatureSwitch('${key}')">${enabled ? "关闭" : "开启"}</button>
            </div>
          </div>
        `;
        }).join("")}
      </div>
      <div class="card">
        <h3>TikTok Partner API 接入流程</h3>
        <ol>
          <li>确认 Partner Center 已登录，且店铺/商家账号有 Affiliate 权限。</li>
          <li>创建或选择 Partner App，确认 Product、Affiliate、Messaging、Order 相关 scope。</li>
          <li>配置 OAuth Redirect URL：后续后端服务地址，例如 <code>http://localhost:8015/api/tiktok/callback</code>。</li>
          <li>拿到 client_key / client_secret 后放入本项目环境变量或配置文件。</li>
          <li>若页面出现验证码、人机校验或 scope 审批缺失，需要你在浏览器里处理，我再继续同步。</li>
        </ol>
        <div class="warning-box">当前版本已接入本地后端 <code>http://127.0.0.1:8015</code>。未配置 app_key/app_secret 或未完成 OAuth 时不会伪造 TikTok API 数据。</div>
      </div>
      <div class="card">
        <h3>TikTok API 本地配置</h3>
        <div class="form-grid">
          ${field("apiClientKey", "client_key", "Partner App client_key", state.settings.tiktokClientKey || "")}
          ${field("apiRedirectUrl", "OAuth Redirect URL", "http://localhost:8015/api/tiktok/callback", state.settings.tiktokRedirectUrl || "")}
          ${multiCheckField("apiScopes", "已申请 scope", tiktokScopeOptions, state.settings.tiktokScopes || "")}
          ${field("apiLastCheck", "最近检查", "尚未检查", state.settings.tiktokLastAuthCheck || "尚未检查")}
        </div>
        <div class="warning-box" style="margin-top:12px">client_secret 不应保存在前端 localStorage。真实接入时请放在本项目后端环境变量中；遇到 OAuth、验证码、scope 审批时需要人工在浏览器完成。</div>
        <div style="margin-top:12px">
          <button class="btn primary" onclick="saveApiSettings()">保存配置</button>
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokBackend()">检查后端</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
          <button class="btn" onclick="refreshPlatformCreatorLibrary()">更新平台达人库</button>
          <button class="btn" onclick="markApiAuthBlocked()">标记授权阻塞</button>
          <button class="btn ghost" onclick="showApiHandoffSteps('API接入')">查看人工处理流程</button>
        </div>
      </div>
      <div class="card">
        <h3>接入状态</h3>
        <p><b>当前状态：</b>${badge(state.settings.apiStatus)}</p>
        <p><b>后端服务：</b>${escapeHtml(state.settings.tiktokBackendStatus || "未检查")}</p>
        <p><b>已授权店铺：</b>${shops.length ? `${shops.length} 个` : "未绑定"}</p>
        <p><b>当前同步店铺：</b>${escapeHtml(state.settings.tiktokShopName || "未选择")}</p>
        <p><b>Token 保存时间：</b>${escapeHtml(state.settings.tiktokTokenSavedAt || "未保存")}</p>
        <p><b>商品同步：</b>${escapeHtml(state.settings.lastProductSync)}</p>
        <p><b>达人同步：</b>${escapeHtml(state.settings.lastCreatorSync)}</p>
        <p class="muted">client_secret 只从后端环境变量读取；前端只负责触发授权和展示同步结果。</p>
        ${shops.length ? `
          <div class="divider"></div>
          <h4>授权店铺列表</h4>
          ${table(["店铺", "市场", "Shop ID", "操作"], shops.map((shop) => [
            escapeHtml(shopLabel(shop)),
            escapeHtml(shopRegion(shop)),
            escapeHtml(shop.shop_id || shop.id || "-"),
            `<button class="btn ghost" onclick="selectTikTokShop('${escapeJs(shopCipher(shop))}')">设为同步店铺</button>`,
          ]))}
        ` : `<div class="notice" style="margin-top:12px">当前还没有授权店铺。多国家不是在本系统里手动添加，而是每个国家/市场的真实 Seller 店铺授权后由 TikTok API 返回。</div>`}
      </div>
      <div class="card" style="grid-column: 1 / -1">
        <h3>商家入驻审批</h3>
        <div class="notice" style="margin-bottom:12px">这是本地审批台账，用于验收平台管理流程；批准或驳回不会调用真实商户系统、支付系统或 TikTok API。</div>
        ${table(["商家", "店铺", "联系人", "套餐", "API状态", "审批状态", "申请时间", "备注", "操作"], applications.map((row) => [
          escapeHtml(row.merchant),
          escapeHtml(row.store),
          escapeHtml(row.contact),
          escapeHtml(row.plan),
          badge(row.apiStatus),
          badge(row.status),
          escapeHtml(row.appliedAt),
          escapeHtml(row.notes),
          merchantApplicationActions(row),
        ]))}
      </div>
    </div>
  `;
}

function renderCreatorDetail() {
  const c = creator(state.selectedCreatorId);
  if (!c) return renderKolPool();
  const records = state.outreach.filter((x) => x.creatorId === c.id);
  const coops = state.cooperations.filter((x) => x.creatorId === c.id);
  return `
    ${pageHead("KOL详情", "管理并沉淀达人基础资料与沟通记录；合作履约数据请进入合作管理查看。", `<button class="btn" onclick="setPage('kol')">返回达人库</button> <button class="btn primary" onclick="openOutreachModal(${c.id})">发起建联</button>`)}
    <div class="detail-shell">
      <aside class="profile-panel">
        <div class="card creator-profile">
          ${creatorPortrait(c)}
          <h3 style="margin:0">${escapeHtml(c.nickname || c.username)}</h3>
          <div class="link">@${escapeHtml(c.username)}</div>
          <div style="margin-top:10px">${creatorVisibleTags(c)}</div>
          <div class="metric-pair">
            <div class="mini-metric"><b>${c.followers.toLocaleString()}</b><span class="muted">粉丝</span></div>
            <div class="mini-metric"><b>${escapeHtml(c.replyRate || "-")}</b><span class="muted">回复率</span></div>
          </div>
        </div>
        <div class="card">
          <h3>联系方式</h3>
          <p><b>TikTok站内：</b>@${escapeHtml(c.username)}</p>
          <p><b>WhatsApp：</b>${escapeHtml(c.whatsapp || "未提供")}</p>
          <p><b>Email：</b>${escapeHtml(c.email || "未提供")}</p>
        </div>
        <div class="card">
          <h3>标签备注</h3>
          <p>${escapeHtml(c.notes)}</p>
        </div>
      </aside>
      <div class="work-panel">
        <div class="card chat-frame">
          <div class="tabs"><span class="tab active">沟通记录</span><span class="tab">合作记录</span><span class="tab">基本信息</span></div>
          ${records.map((r) => `<div class="message ${r.status === "待我方回复" ? "inbound" : "outbound"}"><b>${escapeHtml(r.channel)}</b> · ${badge(r.status)}<div>${outreachMessageCell(r)}</div><span class="muted">${escapeHtml(r.updatedAt)}</span><div style="margin-top:8px"><button class="btn ghost" onclick="openReplyModal(${r.id})">回复</button></div></div>`).join("") || `<div class="empty">暂无沟通记录。</div>`}
          <div class="chat-input-bar">
            <input class="input" style="flex:1" placeholder="输入沟通内容..." />
            <button class="btn">选择模板</button>
            <button class="btn primary" onclick="${records[0] ? `openReplyModal(${records[0].id})` : `openOutreachModal(${c.id})`}">发送消息</button>
          </div>
        </div>
        <div class="card">
          <h3>合作记录入口</h3>
          <div class="timeline">
            ${coops.map((x) => `
              <div class="message">
                <b>${escapeHtml(product(x.productId)?.name || "-")}</b>
                <div style="margin-top:6px">${badge(detailCoopStage(x))} <span class="muted">负责人：${escapeHtml(x.owner || "-")}</span></div>
                <div style="margin-top:10px"><button class="btn ghost" onclick="setPage('cooperations')">进入合作详情</button></div>
              </div>
            `).join("") || `<div class="empty">暂无合作记录。</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="table-wrap"><div class="empty">暂无数据</div></div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function paginationBar(scope, currentPage, totalPages, pageSize, totalRows) {
  const pages = Array.from(new Set([
    1,
    Math.max(1, currentPage - 1),
    currentPage,
    Math.min(totalPages, currentPage + 1),
    totalPages,
  ])).filter((x) => x >= 1 && x <= totalPages).sort((a, b) => a - b);
  return `
    <div class="pagination-bar">
      <div class="muted">共 ${totalRows} 位达人</div>
      <div class="pagination-controls">
        <button class="btn" ${currentPage <= 1 ? "disabled" : ""} onclick="setKolPage(${currentPage - 1})">上一页</button>
        ${pages.map((page, index) => `${index > 0 && page - pages[index - 1] > 1 ? `<span class="muted">...</span>` : ""}<button class="btn ${page === currentPage ? "primary" : ""}" onclick="setKolPage(${page})">${page}</button>`).join("")}
        <button class="btn" ${currentPage >= totalPages ? "disabled" : ""} onclick="setKolPage(${currentPage + 1})">下一页</button>
        <select class="select" onchange="setKolPageSize(this.value)">
          ${[20, 50, 100].map((size) => `<option value="${size}" ${Number(pageSize) === size ? "selected" : ""}>${size} 条/页</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function productImage(product) {
  return product?.imageUrl || product?.image || "";
}

function productThumb(product) {
  const image = productImage(product);
  if (image) return `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" />`;
  return `<span>${escapeHtml((product?.name || "P").slice(0, 1).toUpperCase())}</span>`;
}

function productList(rows) {
  if (!rows.length) return `<div class="empty panel-empty">当前筛选下暂无商品。绑定店铺并同步后，商品会自动进入建联和邀约流程。</div>`;
  return `
    <div class="object-list product-object-list">
      <div class="object-head">
        <span>商品信息</span>
        <span>价格</span>
        <span>库存</span>
        <span>状态</span>
        <span>操作</span>
      </div>
      ${rows.map((p) => `
        <div class="object-row">
          <div class="product-main">
            <div class="product-thumb">${productThumb(p)}</div>
            <div class="product-info">
              <b class="product-title">${escapeHtml(p.name)}</b>
              <div class="muted">${escapeHtml(p.sourceId || p.category || "-")}</div>
            </div>
          </div>
          <div>${escapeHtml(p.price || "-")}</div>
          <div>${Number.isFinite(Number(p.stock)) ? Number(p.stock) : "-"}</div>
          <div>${badge(p.status || "已同步")}</div>
          <div class="row-actions">
            <button class="btn" onclick="openProductModal(${p.id})">详情</button>
            <button class="btn ghost" onclick="goProductCoops(${p.id})">合作</button>
            <button class="btn ghost" onclick="goProductOutreach(${p.id})">建联</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function productPicker(selectedId = state.products[0]?.id) {
  if (!state.products.length) {
    return `<div class="empty panel-empty">还没有同步商品。请先完成店铺授权并同步商品，再发起建联。</div>`;
  }
  return `
    <div class="product-picker">
      ${state.products.map((p) => `
        <label class="product-pick ${Number(selectedId) === Number(p.id) ? "selected" : ""}">
          <input type="radio" name="outreachProductId" value="${p.id}" ${Number(selectedId) === Number(p.id) ? "checked" : ""} />
          <span class="product-thumb">${productThumb(p)}</span>
          <span class="product-pick-main">
            <b>${escapeHtml(p.name)}</b>
            <span>${escapeHtml(p.price || "-")} · 佣金 ${escapeHtml(p.commission || "-")} · ${escapeHtml(p.status || "已同步")}</span>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function commissionDefault(product) {
  const match = String(product?.commission || "").match(/(\d+(?:\.\d+)?)/);
  const value = match ? Number(match[1]) : 20;
  return Number.isFinite(value) && value > 0 ? Math.min(80, value) : 20;
}

function productMultiPicker(selectedIds = [state.products[0]?.id].filter(Boolean)) {
  if (!state.products.length) {
    return `<div class="empty panel-empty">还没有同步商品。请先完成店铺授权并同步商品，再发起定向邀约。</div>`;
  }
  const selected = new Set(selectedIds.map(Number));
  return `
    <div class="outreach-product-table">
      <div class="outreach-product-head">
        <span>选择</span>
        <span>商品信息</span>
        <span>价格/库存</span>
        <span>标准佣金率</span>
        <span>广告佣金</span>
      </div>
      ${state.products.map((p) => {
        const checked = selected.has(Number(p.id));
        const defaultRate = commissionDefault(p);
        return `
          <div class="outreach-product-row ${checked ? "selected" : ""}">
            <label class="table-check">
              <input class="outreach-product-check" type="checkbox" value="${p.id}" ${checked ? "checked" : ""} />
            </label>
            <div class="product-main">
              <div class="product-thumb">${productThumb(p)}</div>
              <div class="product-info">
                <b class="product-title">${escapeHtml(p.name)}</b>
                <div class="muted">ID：${escapeHtml(p.sourceId || p.id)} · ${escapeHtml(p.status || "已同步")}</div>
              </div>
            </div>
            <div>
              <b>${escapeHtml(p.price || "-")}</b>
              <div class="muted">库存 ${Number.isFinite(Number(p.stock)) ? Number(p.stock) : "-"}</div>
            </div>
            <label class="commission-input">
              <input id="standardCommission-${p.id}" class="input" type="number" min="1" max="80" value="${defaultRate}" />
              <span>%</span>
            </label>
            <label class="commission-input ad-commission">
              <input id="adCommissionEnabled-${p.id}" type="checkbox" />
              <input id="adCommission-${p.id}" class="input" type="number" min="1" max="80" placeholder="可选" />
              <span>%</span>
            </label>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function selectedOutreachProducts() {
  return Array.from(document.querySelectorAll(".outreach-product-check:checked"))
    .map((input) => {
      const p = product(Number(input.value));
      if (!p) return null;
      const standardRate = Number(document.getElementById(`standardCommission-${p.id}`)?.value || 0);
      const adEnabled = Boolean(document.getElementById(`adCommissionEnabled-${p.id}`)?.checked);
      const adRate = adEnabled ? Number(document.getElementById(`adCommission-${p.id}`)?.value || 0) : 0;
      return {
        id: p.id,
        sourceId: p.sourceId || "",
        name: p.name,
        imageUrl: productImage(p),
        price: p.price || "-",
        stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : null,
        status: p.status || "已同步",
        standardCommissionRate: Number.isFinite(standardRate) && standardRate > 0 ? standardRate : commissionDefault(p),
        adCommissionEnabled: adEnabled,
        adCommissionRate: Number.isFinite(adRate) && adRate > 0 ? adRate : 0,
      };
    })
    .filter(Boolean);
}

function productSnapshotNames(products = []) {
  const names = products.map((p) => p.name).filter(Boolean);
  if (!names.length) return "-";
  return names.length > 2 ? `${names.slice(0, 2).join("、")} 等 ${names.length} 个商品` : names.join("、");
}

function personCell(c) {
  if (!c) return "-";
  return `
    <div class="person">
      <span class="avatar">${c.avatarUrl ? `<img src="${escapeHtml(c.avatarUrl)}" alt="${escapeHtml(c.username)}" />` : escapeHtml(c.username.slice(0, 1).toUpperCase())}</span>
      <div>
        <button class="link" onclick="showCreator(${c.id})">@${escapeHtml(c.username)}</button>
        <div class="muted">${escapeHtml(c.nickname || "-")}</div>
      </div>
    </div>
  `;
}

function modalRoot() {
  return `
    <div id="modalBackdrop" class="modal-backdrop">
      <div class="modal">
        <div class="modal-head"><h3 id="modalTitle" style="margin:0"></h3><button class="btn" onclick="closeModal()">关闭</button></div>
        <div id="modalBody" class="modal-body"></div>
        <div id="modalFoot" class="modal-foot"></div>
      </div>
    </div>
  `;
}

function openModal(title, body, foot) {
  document.getElementById("modalTitle").innerHTML = title;
  document.getElementById("modalBody").innerHTML = body;
  document.getElementById("modalFoot").innerHTML = foot;
  document.getElementById("modalBackdrop").classList.add("open");
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("open");
}

function render() {
  const routes = {
    dashboard: renderDashboard,
    products: renderProducts,
    kol: renderKolPool,
    outreach: renderOutreach,
    autoReply: renderAutoReply,
    templates: renderTemplates,
    blacklist: renderBlacklist,
    samples: renderSamples,
    cooperations: renderCooperations,
    messages: renderMessages,
    team: renderTeam,
    billing: renderBilling,
    admin: renderAdmin,
  };
  const content = state.selectedCreatorId ? renderCreatorDetail() : (routes[state.page] || renderDashboard)();
  document.getElementById("app").innerHTML = appLayout(content);
}

function setFilter(key, value) {
  state.filters[key] = value;
  if (key.startsWith("kol") && !["kolPage", "kolPageSize"].includes(key)) state.filters.kolPage = 1;
  saveState();
  render();
}

function toggleMultiFilter(key, value) {
  const current = filterValues(state.filters[key]);
  const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
  state.filters[key] = next;
  if (key.startsWith("kol")) state.filters.kolPage = 1;
  saveState();
  render();
}

function clearMultiFilter(key) {
  state.filters[key] = [];
  if (key.startsWith("kol")) state.filters.kolPage = 1;
  saveState();
  render();
}

function setKolPage(page) {
  state.filters.kolPage = Math.max(1, Number(page) || 1);
  saveState();
  render();
}

function setKolPageSize(size) {
  state.filters.kolPageSize = Number(size) || 20;
  state.filters.kolPage = 1;
  saveState();
  render();
}

function dashboardGo(page, filterKey = "", value = "") {
  if (page === "outreach") {
    state.filters.outreachSearch = "";
    state.filters.outreachChannel = "全部";
    state.filters.outreachStatus = filterKey === "outreachStatus" ? value : "全部";
  }
  if (page === "cooperations") {
    if (filterKey === "coopStatus") state.filters.coopStatus = value;
    else state.filters.coopStatus = "全部";
    if (filterKey === "coopOutput") state.filters.coopOutput = value;
    else state.filters.coopOutput = "全部";
    state.filters.coopSearch = state.filters.dashboardOwner === "全部" ? "" : state.filters.dashboardOwner;
    state.filters.coopTag = "全部";
  }
  navigateHash(page);
}

function showCreator(id) {
  navigateHash(`kol/creator/${Number(id)}`);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function nextId(rows) {
  return Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1;
}

function addSyncLog(module, status, reason) {
  state.syncLogs.unshift({ id: Date.now(), module, status, reason, at: nowText() });
  state.syncLogs = state.syncLogs.slice(0, 50);
}

function featureEnabled(key) {
  return Boolean(state.settings.featureSwitches[key]);
}

function channelFeatureKey(channel) {
  if (channel === "Email") return "emailMessaging";
  if (channel === "WhatsApp") return "whatsappMessaging";
  return "tiktokMessaging";
}

function channelEnabled(channel) {
  return featureEnabled(channelFeatureKey(channel));
}

function shopCipher(shop) {
  return shop?.cipher || shop?.shop_cipher || "";
}

function shopRegion(shop) {
  return shop?.region || shop?.market || shop?.country || shop?.shop_region || "-";
}

function normalizeMarketRegion(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return "";
  const upper = raw.toUpperCase();
  return marketRegionLabels[upper] || raw;
}

function selectedShopMarket(shop) {
  return normalizeMarketRegion(shopRegion(shop));
}

function shopLabel(shop) {
  const name = shop?.shop_name || shop?.name || shop?.seller_name || shop?.shop_id || "未命名店铺";
  const region = selectedShopMarket(shop) || shopRegion(shop);
  return region && region !== "-" ? `${name} · ${region}` : String(name);
}

function selectTikTokShop(cipher) {
  const shops = state.settings.tiktokShops || [];
  const selected = shops.find((shop) => shopCipher(shop) === cipher) || shops[0];
  if (!selected) return alert("当前没有可选择的 TikTok Shop 店铺。");
  state.settings.selectedTikTokShopCipher = shopCipher(selected);
  state.settings.tiktokShopCipher = shopCipher(selected);
  state.settings.tiktokShopName = shopLabel(selected);
  addSyncLog("店铺选择", "已切换", `当前同步店铺：${state.settings.tiktokShopName}`);
  saveState();
  render();
}

function channelOptionsForCreators(targets, currentChannel = "") {
  const list = [];
  const add = (value, text = value) => list.push([value, text]);
  if (channelEnabled("TikTok私信")) add("TikTok私信");
  if (channelEnabled("Email")) add("Email");
  if (channelEnabled("WhatsApp") && targets.every((c) => c?.whatsapp)) add("WhatsApp");
  if (!list.length && currentChannel && channelEnabled(currentChannel)) add(currentChannel);
  return list;
}

function validateChannelForCreators(channel, targets) {
  if (!channelEnabled(channel)) {
    alert(`${channel} 已被平台管理端关闭，不能用于新建联或回复。`);
    return false;
  }
  if (channel === "WhatsApp" && !targets.every((c) => c?.whatsapp)) {
    alert("选择 WhatsApp 前，需要先为所有目标达人录入 WhatsApp。");
    return false;
  }
  return true;
}

function emailAccountConfigured() {
  return Boolean(state.settings.emailConnected && state.settings.emailAddress);
}

function channelLabel(channel) {
  if (channel === "TikTok私信") return "TikTok私信";
  if (channel === "Email") return "Email";
  if (channel === "WhatsApp") return "WhatsApp";
  return channel || "-";
}

function validateChannelsForCreators(channels, targets) {
  if (!channels.length) {
    alert("请至少选择一个发送渠道。");
    return false;
  }
  for (const channel of channels) {
    if (!validateChannelForCreators(channel, targets)) return false;
    if (channel === "Email" && !emailAccountConfigured()) {
      openEmailSetupModal("outreach");
      alert("Email 尚未绑定。请先完成邮箱配置，再用 Email 发送建联消息。");
      return false;
    }
  }
  return true;
}

function targetLanguageForCreator(c) {
  const region = normalizeMarketRegion(c?.region || "");
  if (region === "越南") return "越南语";
  if (region === "泰国") return "泰语";
  if (region === "马来西亚") return "马来语";
  if (region === "菲律宾") return "菲律宾语";
  if (region === "印尼" || region === "印度尼西亚") return "印尼语";
  return "英语";
}

function languageOptionsForTargets(targets) {
  const recommended = targetLanguageForCreator(targets[0]);
  return fixedOptions([recommended, "英语", "越南语", "泰语", "马来语", "菲律宾语", "印尼语", "中文"], []).map((x) => [x, x]);
}

function translatedInviteDraft(lang, c, p) {
  const name = c?.nickname || c?.username || "{KOL名称}";
  const productName = p?.name || "{产品名称}";
  const lines = {
    英语: `Hi ${name}, we would like to invite you to collaborate on ${productName}.`,
    越南语: `Chào ${name}, chúng tôi muốn mời bạn hợp tác quảng bá ${productName}.`,
    泰语: `สวัสดี ${name}, เราอยากเชิญคุณร่วมโปรโมต ${productName}.`,
    马来语: `Hai ${name}, kami ingin menjemput anda bekerjasama untuk mempromosikan ${productName}.`,
    菲律宾语: `Hi ${name}, nais ka naming imbitahan na makipag-collaborate para sa ${productName}.`,
    印尼语: `Halo ${name}, kami ingin mengundang Anda untuk berkolaborasi mempromosikan ${productName}.`,
    中文: `Hi ${name}，我们想邀请你合作 ${productName}。`,
  };
  return lines[lang] || lines.英语;
}

function inviteLinkFor(creatorId, productId, outreachId = "") {
  const params = new URLSearchParams({
    creator: String(creatorId),
    product: String(productId),
  });
  if (outreachId) params.set("outreach", String(outreachId));
  return `${location.origin}${location.pathname}#invite?${params.toString()}`;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const message = data.message || `请求失败：HTTP ${response.status}`;
    const error = new Error(message);
    error.data = data;
    throw error;
  }
  return data;
}

function applyBackendHealth(data) {
  state.settings.tiktokBackendStatus = data.configured ? "后端已配置" : `后端缺少配置：${(data.missing || []).join(", ") || "未知"}`;
  state.settings.tiktokTokenSavedAt = data.token?.saved_at || state.settings.tiktokTokenSavedAt || "";
  state.settings.apiStatus = data.token ? "已授权" : (data.configured ? "待OAuth授权" : "配置不完整");
  state.settings.tiktokConnected = Boolean(data.token);
}

async function checkTikTokBackend() {
  try {
    const data = await apiRequest("/api/health");
    applyBackendHealth(data);
    state.settings.tiktokLastAuthCheck = nowText();
    addSyncLog("API后端", data.configured ? "可用" : "配置不完整", state.settings.tiktokBackendStatus);
    saveState();
    render();
    alert(`后端检查完成：${state.settings.tiktokBackendStatus}`);
  } catch (error) {
    state.settings.tiktokBackendStatus = "后端未启动";
    state.settings.apiStatus = "后端未启动";
    addSyncLog("API后端", "后端未启动", "请先运行 start-api-8015.bat 或 start-full.bat。");
    saveState();
    render();
    alert("后端未启动。请先运行 start-api-8015.bat 或 start-full.bat。");
  }
}

async function startTikTokAuth() {
  try {
    const data = await apiRequest("/api/tiktok/auth-url");
    state.settings.apiStatus = "等待授权";
    state.settings.tiktokBackendStatus = "后端已配置";
    state.settings.tiktokRedirectUrl = data.redirect_uri || state.settings.tiktokRedirectUrl;
    addSyncLog("店铺绑定", "等待授权", "已生成 TikTok Shop 授权链接，将打开 Partner 授权页。");
    saveState();
    render();
    window.open(data.auth_url, "_blank");
  } catch (error) {
    const reason = error.message || "无法生成授权链接。";
    state.settings.apiStatus = "配置不完整";
    addSyncLog("店铺绑定", "失败", reason);
    saveState();
    render();
    showApiHandoffSteps("店铺绑定", reason);
  }
}

async function checkTikTokShops() {
  try {
    const data = await apiRequest("/api/tiktok/shops");
    const shops = data.shops || [];
    const firstShop = shops[0];
    const selected = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || firstShop;
    state.settings.tiktokConnected = true;
    state.settings.apiStatus = firstShop ? "已绑定店铺" : "未返回店铺";
    state.settings.tiktokBackendStatus = "后端已连接 TikTok";
    state.settings.tiktokShops = shops;
    state.settings.selectedTikTokShopCipher = selected ? shopCipher(selected) : "";
    state.settings.tiktokShopName = selected ? shopLabel(selected) : "";
    state.settings.tiktokShopCipher = selected ? shopCipher(selected) : "";
    state.settings.tiktokTokenSavedAt = data.token?.saved_at || state.settings.tiktokTokenSavedAt || "";
    state.settings.tiktokLastAuthCheck = nowText();
    addSyncLog("店铺绑定", state.settings.apiStatus, firstShop ? `已读取 ${shops.length} 个授权店铺；当前同步：${state.settings.tiktokShopName}` : "TikTok API 返回成功但没有店铺列表。");
    pushMessage("店铺绑定", firstShop ? `已读取 TikTok Shop 授权店铺 ${shops.length} 个；当前同步：${state.settings.tiktokShopName}` : "TikTok Shop 已授权，但未返回店铺列表。");
    saveState();
    render();
    if (firstShop) {
      await syncProducts({ silent: true });
    }
  } catch (error) {
    const reason = error.message || "读取已授权店铺失败。";
    state.settings.apiStatus = "店铺读取失败";
    addSyncLog("店铺绑定", "失败", reason);
    saveState();
    render();
    showApiHandoffSteps("店铺绑定", reason);
  }
}

function shouldAutoSyncProducts() {
  const shops = state.settings.tiktokShops || [];
  if (!shops.length || productAutoSyncInFlight) return false;
  const last = Date.parse(state.settings.lastProductSyncAt || "");
  if (!state.products.length || !Number.isFinite(last)) return true;
  return Date.now() - last >= PRODUCT_AUTO_SYNC_INTERVAL_MS;
}

function maybeAutoSyncProducts() {
  if (!shouldAutoSyncProducts()) return;
  productAutoSyncInFlight = true;
  setTimeout(async () => {
    try {
      await syncProducts({ silent: true, auto: true });
    } finally {
      productAutoSyncInFlight = false;
    }
  }, 0);
}

async function syncProducts(options = {}) {
  const silent = Boolean(options.silent);
  state.settings.lastProductSync = nowText();
  state.settings.lastProductSyncAt = new Date().toISOString();
  try {
    const shops = state.settings.tiktokShops || [];
    const selected = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || shops[0];
    if (selected) selectTikTokShop(shopCipher(selected));
    const data = await apiRequest("/api/tiktok/products", {
      method: "POST",
      body: JSON.stringify({ shop_cipher: state.settings.tiktokShopCipher || "", page_size: 50 }),
    });
    if (Array.isArray(data.products) && data.products.length) {
      state.products = data.products;
    }
    state.settings.apiStatus = "商品已同步";
    state.settings.tiktokBackendStatus = "后端已连接 TikTok";
    addSyncLog("商品同步", "成功", `已从 TikTok Shop 同步 ${data.products?.length || 0} 个商品。`);
    pushMessage(silent ? "店铺商品自动同步" : "商品同步", `TikTok Shop 商品同步完成：${data.products?.length || 0} 个。`);
    saveState();
    render();
  } catch (error) {
    const reason = error.message || "商品同步失败。";
    addSyncLog("商品同步", "失败", reason);
    pushMessage("商品同步失败", reason);
    saveState();
    render();
    if (!silent) showApiHandoffSteps("商品同步", reason);
  }
}

function creatorNextPageToken(data) {
  const upstream = data?.upstream || {};
  const payload = upstream.data || upstream;
  return payload.next_page_token
    || payload.nextPageToken
    || payload.next_page
    || payload.pagination?.next_page_token
    || payload.pagination?.nextPageToken
    || "";
}

function creatorImportKeys(row) {
  const keys = [];
  const shopKey = row.sourceShopCipher || "";
  const identity = row.sourceId || row.username || "";
  if (shopKey && identity) keys.push(`${shopKey}:${identity}`);
  if (!shopKey && row.sourceId) keys.push(row.sourceId);
  if (!shopKey && row.username) keys.push(row.username);
  return keys;
}

function creatorLegacyImportKeys(row) {
  return [row.sourceId, row.username].filter(Boolean);
}

function upsertImportedCreators(creators, shop) {
  const shopKey = shopCipher(shop);
  const shopName = shopLabel(shop);
  const shopMarket = selectedShopMarket(shop);
  const existing = new Map();
  for (const row of state.creators) {
    for (const key of creatorImportKeys(row)) existing.set(key, row);
  }
  let changed = 0;
  for (const creator of creators || []) {
    const region = normalizeMarketRegion(creator.region) || shopMarket || creator.region;
    const payload = normalizeCreatorRecord({
      ...creator,
      region,
      sourceShopCipher: shopKey,
      sourceShopName: shopName,
      sourceShopRegion: shopMarket,
    });
    const keys = creatorImportKeys(payload);
    const current = keys.map((key) => existing.get(key)).find(Boolean)
      || creatorLegacyImportKeys(payload).map((key) => existing.get(key)).find((row) => row && !row.sourceShopCipher);
    if (current) {
      Object.assign(current, payload);
    } else {
      const next = { ...payload, id: nextId(state.creators) };
      state.creators.push(next);
      for (const key of keys) existing.set(key, next);
    }
    changed += 1;
  }
  return changed;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncCreators(options = {}) {
  const silent = Boolean(options.silent);
  state.settings.lastCreatorSync = nowText();
  try {
    const shops = state.settings.tiktokShops || [];
    const selected = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || shops[0];
    const targetShops = shops.length ? shops : selected ? [selected] : [];
    if (!targetShops.length) throw new Error("请先绑定 TikTok Shop 店铺，系统才能从 TikTok 抓取达人。");

    let importedCount = 0;
    let successMarkets = 0;
    const failures = [];
    for (const shop of targetShops) {
      const cipher = shopCipher(shop);
      if (!cipher) continue;
      let pageToken = "";
      let page = 0;
      let marketImported = 0;
      try {
        do {
          const data = await apiRequest("/api/tiktok/creators/search", {
            method: "POST",
            body: JSON.stringify({
              shop_cipher: cipher,
              keyword: state.filters.kolSearch || "",
              page_size: 20,
              page_token: pageToken,
            }),
          });
          const creators = Array.isArray(data.creators) ? data.creators : [];
          marketImported += upsertImportedCreators(creators, shop);
          pageToken = creatorNextPageToken(data);
          page += 1;
          if (pageToken) await wait(700);
        } while (pageToken && page < 50);
        importedCount += marketImported;
        successMarkets += 1;
      } catch (error) {
        failures.push(`${shopLabel(shop)}：${error.message || "抓取失败"}`);
      }
    }
    if (!successMarkets) throw new Error(failures.join("；") || "TikTok 达人抓取失败。");
    state.settings.apiStatus = "达人已抓取";
    addSyncLog("达人抓取", failures.length ? "部分成功" : "成功", `${options.reason || "系统默认抓取"}：已按 ${successMarkets} 个授权店铺市场从 TikTok 抓取/更新 ${importedCount} 个达人。${failures.length ? `失败：${failures.join("；")}` : ""}`);
    pushMessage("达人抓取", `TikTok Shop 达人抓取完成：${importedCount} 个；覆盖 ${successMarkets} 个授权店铺市场。`);
    saveState();
    render();
  } catch (error) {
    const reason = error.message || "达人抓取失败。";
    addSyncLog("达人抓取", "失败", reason);
    pushMessage("达人抓取失败", reason);
    saveState();
    render();
    if (!silent) showApiHandoffSteps("达人抓取", reason);
  }
}

function upsertPlatformCreatorLibrary(creators) {
  const existing = new Map();
  for (const row of state.creators) {
    for (const key of creatorImportKeys(row)) existing.set(key, row);
  }
  let changed = 0;
  for (const creator of creators || []) {
    const payload = normalizeCreatorRecord({
      ...creator,
      region: normalizeMarketRegion(creator.region) || creator.region,
      librarySource: "platform",
    });
    const current = creatorImportKeys(payload).map((key) => existing.get(key)).find(Boolean)
      || creatorLegacyImportKeys(payload).map((key) => existing.get(key)).find(Boolean);
    if (current) {
      Object.assign(current, {
        ...payload,
        id: current.id,
        email: payload.email || current.email || "",
        whatsapp: payload.whatsapp || current.whatsapp || "",
        notes: current.notes && current.librarySource === "platform" ? current.notes : payload.notes,
      });
    } else {
      const next = { ...payload, id: nextId(state.creators) };
      state.creators.push(next);
      for (const key of creatorImportKeys(next)) existing.set(key, next);
    }
    changed += 1;
  }
  return changed;
}

async function loadPlatformCreatorLibrary(options = {}) {
  const silent = Boolean(options.silent);
  try {
    const data = await apiRequest("/api/platform/creators");
    const creators = Array.isArray(data.creators) ? data.creators : [];
    const changed = upsertPlatformCreatorLibrary(creators);
    platformCreatorLibraryLoaded = true;
    if (creators.length) {
      addSyncLog("平台达人库", "已读取", `已从后端平台达人库读取 ${creators.length} 个达人。`);
    }
    saveState();
    render();
    return changed;
  } catch (error) {
    platformCreatorLibraryLoaded = true;
    const reason = error.message || "读取平台达人库失败。";
    addSyncLog("平台达人库", "读取失败", reason);
    saveState();
    render();
    if (!silent) showApiHandoffSteps("平台达人库", reason);
    return 0;
  }
}

async function refreshPlatformCreatorLibrary() {
  state.settings.lastCreatorSync = nowText();
  try {
    const data = await apiRequest("/api/platform/creators/import-tiktok", {
      method: "POST",
      body: JSON.stringify({ page_size: 20, max_pages: 10 }),
    });
    const creators = Array.isArray(data.creators) ? data.creators : [];
    upsertPlatformCreatorLibrary(creators);
    const failureText = Array.isArray(data.failures) && data.failures.length
      ? `；失败：${data.failures.map((x) => `${x.shop || "店铺"} ${x.message || ""}`).join("；")}`
      : "";
    addSyncLog("平台达人库", data.failures?.length ? "部分成功" : "成功", `平台内部已从 TikTok 更新 ${data.imported || 0} 个达人，当前库总数 ${data.total || creators.length}。${failureText}`);
    pushMessage("平台达人库", `平台达人库更新完成：当前 ${data.total || creators.length} 个达人。`);
    saveState();
    render();
  } catch (error) {
    const reason = error.message || "平台达人库更新失败。";
    addSyncLog("平台达人库", "失败", reason);
    pushMessage("平台达人库更新失败", reason);
    saveState();
    render();
    showApiHandoffSteps("平台达人库", reason);
  }
}

function syncCoopData() {
  state.settings.apiStatus = state.settings.tiktokConnected ? "待同步" : "未连接";
  const reason = "内容、直播和联盟订单需要 TikTok OAuth 授权及 Order / Affiliate scope。";
  addSyncLog("内容/订单同步", state.settings.apiStatus, reason);
  pushMessage("内容/订单同步", `已触发内容与联盟订单同步。${reason}`);
  saveState();
  render();
  showApiHandoffSteps("内容/订单同步", reason);
}

function simulateConnect() {
  state.settings.tiktokConnected = true;
  state.settings.apiStatus = "待授权";
  state.systemMessages.unshift({ id: Date.now(), type: "API状态", text: "已标记 Partner 账号登录。下一步需要配置 app scope、client_key/client_secret 和回调地址。", at: nowText(), read: false });
  saveState();
  render();
}

function saveApiSettings() {
  const clientKey = document.getElementById("apiClientKey").value.trim();
  const redirectUrl = document.getElementById("apiRedirectUrl").value.trim();
  const scopes = getCheckedValues("apiScopes").join(",");
  const lastCheck = nowText();
  state.settings.tiktokClientKey = clientKey;
  state.settings.tiktokRedirectUrl = redirectUrl;
  state.settings.tiktokScopes = scopes;
  state.settings.tiktokLastAuthCheck = lastCheck;
  state.settings.tiktokConnected = Boolean(clientKey && redirectUrl && scopes);
  state.settings.apiStatus = state.settings.tiktokConnected ? "待OAuth授权" : "配置不完整";
  addSyncLog("API配置", state.settings.apiStatus, "本地接入配置已保存；保存配置不会触发真实 API 调用。");
  pushMessage("API配置", `TikTok API 本地配置已保存，状态：${state.settings.apiStatus}。`);
  saveState();
  render();
}

function markApiAuthBlocked() {
  state.settings.apiStatus = "授权阻塞";
  state.settings.tiktokLastAuthCheck = nowText();
  addSyncLog("API授权", "授权阻塞", "需要人工处理 OAuth、验证码、scope 审批或 redirect URL 配置。");
  pushMessage("API授权阻塞", "TikTok API 接入需要人工处理 OAuth、验证码、scope 审批或 redirect URL 配置。");
  saveState();
  render();
  showApiHandoffSteps("API授权阻塞", "需要人工处理 OAuth、验证码、scope 审批或 redirect URL 配置。");
}

function showApiHandoffSteps(module = "TikTok API", reason = "") {
  const steps = [
    "1. 确认 TikTok Shop Partner Center 已登录，且当前店铺有 Affiliate 权限。",
    "2. 在 Partner App 中确认 Product、Affiliate、Messaging、Order scope 已开通或审批通过。",
    "3. 配置 OAuth Redirect URL，后续后端建议使用 http://127.0.0.1:8015/api/tiktok/callback。",
    "4. 将 client_key 填到平台管理端；client_secret 只放后端环境变量，不写入前端。",
    "5. 若出现 OAuth 确认、验证码、人机校验、风控弹窗或 scope 缺失，请在浏览器完成后再回来同步。",
  ];
  alert(`${module} 暂不能自动完成。\n\n${reason ? `原因：${reason}\n\n` : ""}你现在需要：\n${steps.join("\n")}\n\n详细交接见 docs/TIKTOK_API_HANDOFF.md。`);
}

function merchantApplicationActions(row) {
  const buttons = [];
  if (row.status !== "已通过") buttons.push(`<button class="btn" onclick="approveMerchantApplication(${row.id})">通过</button>`);
  if (row.status !== "已驳回") buttons.push(`<button class="btn ghost" onclick="rejectMerchantApplication(${row.id})">驳回</button>`);
  if (row.status !== "待审批") buttons.push(`<button class="btn ghost" onclick="resetMerchantApplication(${row.id})">转待审</button>`);
  return buttons.join(" ");
}

function updateMerchantApplication(id, status, apiStatus, notePrefix) {
  const row = (state.merchantApplications || []).find((x) => x.id === id);
  if (!row) return alert("入驻申请不存在。");
  row.status = status;
  row.apiStatus = apiStatus || row.apiStatus;
  row.notes = `[${nowText()}] ${notePrefix}。${row.notes ? ` ${row.notes}` : ""}`;
  logOperation("入驻审批", row.merchant, `状态变更为：${status}；API状态：${row.apiStatus}`);
  pushMessage("入驻审批", `${row.merchant} 已更新为：${status}。`);
  saveState();
  render();
}

function approveMerchantApplication(id) {
  updateMerchantApplication(id, "已通过", "待OAuth授权", "平台已通过本地入驻审批，等待真实 TikTok OAuth 授权");
}

function rejectMerchantApplication(id) {
  const reason = prompt("请输入驳回原因", "资料不完整，需补充 Partner App / 店铺权限信息");
  if (reason === null) return;
  updateMerchantApplication(id, "已驳回", "配置不完整", `平台已驳回：${reason || "未填写原因"}`);
}

function resetMerchantApplication(id) {
  updateMerchantApplication(id, "待审批", "待审核", "已恢复为待审批");
}

function toggleFeatureSwitch(key) {
  const names = {
    tiktokMessaging: "TikTok私信",
    emailMessaging: "Email消息",
    whatsappMessaging: "WhatsApp消息",
    translation: "消息翻译",
    stripePayment: "Stripe支付",
  };
  if (!Object.prototype.hasOwnProperty.call(state.settings.featureSwitches, key)) return;
  state.settings.featureSwitches[key] = !state.settings.featureSwitches[key];
  const status = state.settings.featureSwitches[key] ? "启用" : "停用";
  logOperation("功能开关", names[key] || key, `状态变更为：${status}`);
  pushMessage("功能开关", `${names[key] || key} 已${status}。`);
  saveState();
  render();
}

function selectPlan(name) {
  if (!Object.prototype.hasOwnProperty.call(planQuotas, name)) return;
  const previous = state.settings.planName;
  state.settings.planName = name;
  const price = { "免费版": "$0", "基础版": "$29", "专业版": "$99", "企业版": "$299" }[name] || "$0";
  state.billingRecords = state.billingRecords || [];
  state.billingRecords.unshift({
    id: Date.now(),
    plan: name,
    amount: price,
    channel: "本地切换",
    status: price === "$0" ? "无需支付" : "待支付",
    invoiceNo: `LOCAL-${Date.now()}`,
    period: monthKey(),
    createdAt: nowText(),
    note: `由 ${previous} 切换为 ${name}；本地记录不代表真实扣款或开票。`,
  });
  state.billingRecords = state.billingRecords.slice(0, 50);
  logOperation("套餐切换", name, `由 ${previous} 切换为 ${name}；支付状态：本地记录`);
  pushMessage("订阅套餐", `当前套餐已切换为 ${name}，本月建联配额：${Number.isFinite(outreachQuota()) ? outreachQuota() : "不限"}。`);
  saveState();
  render();
}

function addProduct() {
  alert("产品数据应来自 TikTok Shop Partner API。本地版本不允许手动新增，避免和真实店铺商品冲突。");
}

function productUsage(productId) {
  const hasProduct = (row) => Array.isArray(row.productIds) ? row.productIds.includes(productId) : row.productId === productId;
  return {
    outreach: state.outreach.filter(hasProduct),
    samples: state.samples.filter((x) => x.productId === productId),
    cooperations: state.cooperations.filter((x) => x.productId === productId),
  };
}

function openProductModal(id) {
  const row = product(id);
  if (!row) return alert("产品不存在。");
  const usage = productUsage(row.id);
  const source = state.settings.tiktokConnected ? "待 OAuth 授权后由 TikTok Partner API 同步" : "未连接真实 TikTok API，暂无真实商品源";
  openModal("商品详情", `
    <div class="notice">商品、价格、佣金和合作模式应来自 TikTok Shop Partner API；当前只读展示，不支持本地手动新增或改写真实商品源。</div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card">
        <h3>${escapeHtml(row.name)}</h3>
        <p><b>类目：</b>${escapeHtml(row.category || "-")}</p>
        <p><b>价格：</b>${escapeHtml(row.price || "-")}</p>
        <p><b>联盟佣金：</b>${escapeHtml(row.commission || "-")}</p>
        <p><b>合作模式：</b>${escapeHtml(row.mode || "-")}</p>
        <p><b>状态：</b>${badge(row.status || "-")}</p>
      </div>
      <div class="card">
        <h3>数据来源</h3>
        <p>${escapeHtml(source)}</p>
        <p class="muted">client_secret 不保存在前端；真实同步失败原因进入系统消息的同步日志。</p>
      </div>
    </div>
    <div class="grid grid-3" style="margin-top:12px">
      ${stat("相关建联", usage.outreach.length, "按此商品发起过的沟通记录")}
      ${stat("相关寄样", usage.samples.length, "按此商品创建的寄样记录")}
      ${stat("相关合作", usage.cooperations.length, "已进入合作管理的记录")}
    </div>
    <div class="notice" style="margin-top:12px">视频、直播、GMV、订单、佣金支出和 ROI 仍只在合作管理查看，避免产品页和履约台账口径冲突。</div>
  `, `
    <button class="btn" onclick="goProductOutreach(${row.id})">查看相关建联</button>
    <button class="btn" onclick="goProductCoops(${row.id})">查看相关合作</button>
    <button class="btn primary" onclick="closeModal()">关闭</button>
  `);
}

function goProductCoops(id) {
  const row = product(id);
  if (!row) return;
  state.filters.coopSearch = row.name;
  state.filters.coopOutput = "全部";
  state.filters.coopStatus = "全部";
  state.filters.coopTag = "全部";
  closeModal();
  navigateHash("cooperations");
}

function goProductOutreach(id) {
  const row = product(id);
  if (!row) return;
  state.filters.outreachSearch = row.name;
  state.filters.outreachStatus = "全部";
  state.filters.outreachChannel = "全部";
  closeModal();
  navigateHash("outreach");
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pushMessage(type, text) {
  state.systemMessages.unshift({ id: Date.now(), type, text, at: nowText(), read: false });
  pruneSystemMessages();
}

function pruneSystemMessages() {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  state.systemMessages = state.systemMessages.filter((m) => {
    const time = new Date(m.at).getTime();
    return !Number.isFinite(time) || time >= cutoff;
  }).slice(0, 200);
}

function markMessageRead(id) {
  const row = state.systemMessages.find((m) => m.id === id);
  if (!row) return;
  row.read = true;
  saveState();
  render();
}

function markAllMessagesRead() {
  state.systemMessages.forEach((m) => { m.read = true; });
  saveState();
  render();
}

function deleteMessage(id) {
  if (!confirm("确认删除该系统消息？")) return;
  state.systemMessages = state.systemMessages.filter((m) => m.id !== id);
  saveState();
  render();
}

function logOperation(action, target, detail, operator = "Sam") {
  state.operationLogs.unshift({
    id: Date.now(),
    operator,
    action,
    target,
    detail,
    ip: "127.0.0.1",
    at: nowText(),
  });
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  state.operationLogs = state.operationLogs.filter((log) => {
    const time = new Date(log.at).getTime();
    return !Number.isFinite(time) || time >= cutoff;
  }).slice(0, 100);
}

function outreachActions(o) {
  const parts = [
    `<button class="btn ghost" onclick="showCreator(${o.creatorId})">查看沟通</button>`,
  ];
  if (o.status !== "已关闭" && o.status !== "已转合作") {
    parts.push(`<button class="btn" onclick="openReplyModal(${o.id})">回复</button>`);
  }
  if (o.status === "待API发送") {
    parts.push(`<button class="btn" onclick="markOutreachApiSubmitted(${o.id})">标记已提交API</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '发送失败')">标记发送失败</button>`);
  }
  if (o.status === "待回复") {
    parts.push(`<button class="btn" onclick="advanceOutreach(${o.id}, '待我方回复')">标记已回复</button>`);
  }
  if (o.status === "待我方回复") {
    parts.push(`<button class="btn" onclick="createSampleFromOutreach(${o.id})">安排寄样</button>`);
    parts.push(`<button class="btn ghost" onclick="createCoopFromOutreach(${o.id})">进入合作</button>`);
  }
  if (o.status !== "已关闭") {
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '已关闭')">关闭</button>`);
  }
  parts.push(`<button class="btn ghost" onclick="markNotInterested(${o.creatorId})">不感兴趣</button>`);
  parts.push(`<button class="btn ghost" onclick="deleteOutreach(${o.id})">删除</button>`);
  return parts.join(" ");
}

function markOutreachApiSubmitted(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  row.status = "待回复";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 已标记为提交 TikTok API / Email 队列，等待达人回复。\n${row.lastMessage || ""}`;
  const target = targetCollaboration(row.targetCollaborationId);
  if (target) {
    target.status = "待达人接受";
    target.updatedAt = nowText();
  }
  pushMessage("建联API状态", `@${creator(row.creatorId)?.username || "-"} 的建联记录已标记为已提交 API。`);
  saveState();
  render();
}

function sampleActions(s) {
  const parts = [
    `<button class="btn" onclick="openSampleModal(${s.id})">更新</button>`,
  ];
  if (s.status === "已签收") {
    parts.push(`<button class="btn ghost" onclick="createCoopFromSample(${s.id})">进入合作</button>`);
  }
  parts.push(`<button class="btn ghost" onclick="deleteSample(${s.id})">删除</button>`);
  return parts.join(" ");
}

function advanceOutreach(id, status) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  row.status = status;
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 建联状态已更新为：${status}。`;
  const c = creator(row.creatorId);
  if (c && status === "待我方回复") c.status = "已回复";
  if (c && status === "已关闭") c.status = "待联系";
  pushMessage("建联状态", `@${c?.username || "-"} 的建联记录已更新为：${status}。`);
  saveState();
  render();
}

function replyChannelOptions(row) {
  const c = creator(row.creatorId);
  return channelOptionsForCreators([c], row.channel);
}

function openReplyModal(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const p = product(row.productId) || state.products[0];
  const defaultTemplate = state.templates[1]?.content || "Hi {KOL名称}，感谢回复，我们会继续推进 {产品名称} 的合作。";
  const channelOptions = replyChannelOptions(row);
  if (!channelOptions.length) return alert("当前没有可用回复渠道，请先到平台管理端开启 TikTok 私信、Email 或 WhatsApp。");
  const defaultChannel = channelOptions.some(([v]) => v === row.channel) ? row.channel : channelOptions[0][0];
  openModal("回复达人", `
    <div class="notice">正在回复 @${escapeHtml(c?.username || "-")}。Email / WhatsApp 必须同时满足“平台开关已开启”和“达人已录入联系方式”才会显示。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("replyChannel", "回复渠道", channelOptions, defaultChannel)}
      ${selectField("replyTemplateId", "消息模板", [["0", "不使用模板"], ...state.templates.map((x) => [x.id, x.name])], state.templates[1]?.id || "0")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>回复内容</label><textarea id="replyMessage" class="textarea">${escapeHtml(renderTemplate(defaultTemplate, c || {}, p))}</textarea></div>
  `, `<button class="btn primary" onclick="saveReply(${row.id})">发送回复</button>`);
}

function saveReply(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const p = product(row.productId) || state.products[0];
  const templateId = Number(document.getElementById("replyTemplateId").value);
  const template = state.templates.find((x) => x.id === templateId);
  const rawMessage = document.getElementById("replyMessage").value.trim() || template?.content || "";
  const message = renderTemplate(rawMessage, c || {}, p);
  const channel = document.getElementById("replyChannel").value;
  if (!validateChannelForCreators(channel, [c])) return;
  row.channel = channel;
  row.status = "待回复";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 我方回复：${message}`;
  if (c) c.status = "已发送";
  pushMessage("建联回复", `已通过 ${row.channel} 回复 @${c?.username || "-"}。`);
  closeModal();
  saveState();
  render();
}

function deleteOutreach(id) {
  if (!confirm("确认删除该建联记录？")) return;
  state.outreach = state.outreach.filter((x) => x.id !== id);
  saveState();
  render();
}

function createSampleRecord(creatorId, productId, status = "待审核", tracking = "") {
  const existing = state.samples.find((x) => x.creatorId === creatorId && x.productId === productId && x.status !== "已拒绝");
  if (existing) return existing;
  const row = { id: Date.now(), creatorId, productId, status, tracking, updatedAt: nowText() };
  state.samples.unshift(row);
  return row;
}

function createSampleFromOutreach(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const productIds = Array.isArray(row.productIds) && row.productIds.length ? row.productIds : [row.productId];
  const samples = productIds.map((productId) => createSampleRecord(row.creatorId, productId, "待审核", ""));
  row.status = "待我方回复";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 已从建联记录安排 ${samples.length} 个商品寄样，寄样状态：待审核。`;
  pushMessage("寄样创建", `已为 @${creator(row.creatorId)?.username || "-"} 创建 ${samples.length} 个商品寄样任务。`);
  saveState();
  state.page = "samples";
  state.selectedCreatorId = null;
  location.hash = "#samples";
  render();
}

function createCoopRecord(creatorId, productId, source = "手动创建", inviteLink = "") {
  const existing = state.cooperations.find((x) => x.creatorId === creatorId && x.productId === productId && x.status !== "合作结束");
  if (existing) {
    if (inviteLink && !existing.inviteLink) existing.inviteLink = inviteLink;
    if (inviteLink && !String(existing.notes || "").includes(inviteLink)) {
      existing.notes = `${existing.notes || ""}\n[${nowText()}] 已附加邀请链接：${inviteLink}`.trim();
    }
    return existing;
  }
  const row = {
    id: Date.now(),
    creatorId,
    productId,
    type: "短视频",
    status: "待产出",
    dueDate: dateAfter(14),
    videos: 0,
    lives: 0,
    orders: 0,
    gmv: 0,
    commission: 0,
    adSpend: 0,
    contentUrl: "",
    inviteLink,
    tags: ["需催发"],
    owner: "Sam",
    notes: `[${nowText()}] ${source}，等待达人产出内容。${inviteLink ? `\n邀请链接：${inviteLink}` : ""}`,
  };
  state.cooperations.unshift(row);
  const c = creator(creatorId);
  if (c) c.status = "已合作";
  return row;
}

function createCoopFromOutreach(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const productIds = Array.isArray(row.productIds) && row.productIds.length ? row.productIds : [row.productId];
  const coops = productIds.map((productId) => createCoopRecord(row.creatorId, productId, "由建联记录转入合作"));
  row.status = "已转合作";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 已转入合作管理，创建 ${coops.length} 个商品合作。`;
  pushMessage("合作创建", `@${creator(row.creatorId)?.username || "-"} 已从建联记录转入合作管理，商品数 ${coops.length}。`);
  saveState();
  state.page = "cooperations";
  state.selectedCreatorId = null;
  location.hash = "#cooperations";
  render();
}

function createCoopFromSample(id) {
  const sample = state.samples.find((x) => x.id === id);
  if (!sample) return;
  if (sample.status !== "已签收" && !confirm("样品尚未签收，仍要进入合作吗？")) return;
  const coop = createCoopRecord(sample.creatorId, sample.productId, "由寄样记录转入合作");
  pushMessage("合作创建", `@${creator(sample.creatorId)?.username || "-"} 已从寄样记录转入合作管理，截止日 ${coop.dueDate}。`);
  saveState();
  state.page = "cooperations";
  state.selectedCreatorId = null;
  location.hash = "#cooperations";
  render();
}

function coopActions(c) {
  const parts = [
    `<button class="btn" onclick="openCoopModal(${c.id})">编辑</button>`,
    `<button class="btn ghost" onclick="addCoopTag(${c.id})">打标签</button>`,
  ];
  if (c.status === "待产出" || c.status === "逾期未产出") {
    parts.push(`<button class="btn ghost" onclick="urgeOutput(${c.id})">催发</button>`);
  }
  if (c.status === "有订单未匹配内容") {
    parts.push(`<button class="btn ghost" onclick="resolveUnmatched(${c.id})">标记已匹配</button>`);
  }
  if (c.status !== "合作结束") {
    parts.push(`<button class="btn ghost" onclick="finishCoop(${c.id})">结束</button>`);
  }
  parts.push(`<button class="btn ghost" onclick="deleteCoop(${c.id})">删除</button>`);
  return parts.join(" ");
}

function openCreatorModal(id = 0) {
  const row = id ? creator(id) : null;
  const categoryOptions = fixedOptions(tiktokCategoryOptions, state.creators.flatMap((c) => creatorCategoryValues(c))).map((x) => [x, x]);
  const regionOptions = fixedOptions(marketOptions, state.creators.map((c) => c.region)).map((x) => [x, x]);
  const typeOptions = creatorTypeOptions.map((x) => [x, x]);
  openModal(row ? "编辑达人" : "新增达人", `
    <div class="form-grid">
      ${field("username", "TikTok用户名", "beauty_new", row?.username || "")}
      ${field("nickname", "昵称", "New Creator", row?.nickname || "")}
      ${selectField("type", "达人类型", typeOptions, row?.type || "短视频达人")}
      ${selectField("category", "TikTok 类目", categoryOptions, row?.category || "美妆个护")}
      ${selectField("region", "市场地区", regionOptions, row?.region || "新加坡")}
      ${field("followers", "粉丝数", "100000", row?.followers ?? "")}
      ${field("gmv", "TikTok GMV（接口币种）", "接口返回值，例如 VND 1000000", creatorGmvDisplay(row?.gmv || ""))}
      ${field("replyRate", "回复率", "35%", row?.replyRate || "")}
      ${field("email", "Email", "creator@example.com", row?.email || "")}
      ${field("whatsapp", "WhatsApp", "+62812345678", row?.whatsapp || "")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>标签（逗号分隔）</label><input id="creatorTags" class="input" style="width:100%" placeholder="美妆,英语" value="${escapeHtml((row?.tags || []).join(","))}" /></div>
    <div class="form-field" style="margin-top:12px"><label>备注</label><textarea id="creatorNotes" class="textarea">${escapeHtml(row?.notes || "")}</textarea></div>
  `, `<button class="btn primary" onclick="saveCreator(${row?.id || 0})">保存</button>`);
}

function field(id, label, placeholder, value = "") {
  return `<div class="form-field"><label>${label}</label><input id="${id}" class="input" placeholder="${placeholder}" value="${escapeHtml(value)}" /></div>`;
}

function saveCreator(id = 0) {
  const get = (id) => document.getElementById(id).value.trim();
  if (!get("username")) return alert("请填写 TikTok 用户名");
  const payload = {
    id: id || Date.now(),
    username: get("username").replace(/^@/, ""),
    nickname: get("nickname"),
    type: normalizeCreatorType(get("type") || "短视频达人"),
    category: get("category") || "未分类",
    region: get("region") || "-",
    followers: Number(get("followers") || 0),
    gmv: get("gmv") || "-",
    replyRate: get("replyRate") || "-",
    tags: normalizeCreatorTags(document.getElementById("creatorTags").value.split(",").map((x) => x.trim()).filter(Boolean)),
    status: id ? (creator(id)?.status || "待联系") : "待联系",
    email: get("email"),
    whatsapp: get("whatsapp"),
    notes: document.getElementById("creatorNotes").value.trim(),
  };
  if (id) state.creators = state.creators.map((x) => x.id === id ? payload : x);
  else state.creators.push(payload);
  closeModal();
  saveState();
  render();
}

function blacklistCreator(id) {
  const c = creator(id);
  if (!c) return;
  const reason = prompt("拉黑原因", c.notes || "不适合继续触达");
  if (reason == null) return;
  c.status = "黑名单";
  c.blacklistReason = reason || "未填写原因";
  c.blacklistedAt = nowText();
  c.notes = reason;
  state.bulkCreatorIds = (state.bulkCreatorIds || []).filter((x) => x !== id);
  logOperation("拉黑达人", c.username, c.blacklistReason);
  pushMessage("KOL黑名单", `@${c.username} 已加入黑名单，后续建联会被拦截。`);
  saveState();
  render();
}

function markNotInterested(id) {
  const c = creator(id);
  if (!c) return;
  const reason = prompt("不感兴趣原因", c.notInterestedReason || "达人已拒绝");
  if (reason == null) return;
  c.status = "不感兴趣";
  c.notInterestedReason = reason;
  c.notInterestedUntil = dateAfter(30);
  state.bulkCreatorIds = (state.bulkCreatorIds || []).filter((x) => x !== id);
  state.outreach.forEach((row) => {
    if (row.creatorId === id && row.status !== "已转合作") {
      row.status = "已关闭";
      row.updatedAt = nowText();
      row.lastMessage = `[${row.updatedAt}] 已标记不感兴趣，30 天内不可再次建联。原因：${reason}`;
    }
  });
  pushMessage("不感兴趣", `@${c.username} 已标记不感兴趣，${c.notInterestedUntil} 前不可再次建联。`);
  saveState();
  render();
}

function clearNotInterested(id) {
  const c = creator(id);
  if (!c) return;
  c.status = "待联系";
  c.notInterestedReason = "";
  c.notInterestedUntil = "";
  pushMessage("不感兴趣解除", `@${c.username} 已恢复为可建联。`);
  saveState();
  render();
}

function toggleCreatorSelection(id, checked) {
  const c = creator(id);
  const reason = creatorOutreachBlockReason(c);
  if (checked && reason) {
    alert(`该达人暂不可建联：${reason}`);
    render();
    return;
  }
  const next = new Set(state.bulkCreatorIds || []);
  if (checked) next.add(id);
  else next.delete(id);
  state.bulkCreatorIds = Array.from(next);
  saveState();
  render();
}

function selectVisibleCreators(ids) {
  const next = new Set(state.bulkCreatorIds || []);
  (ids || []).forEach((id) => {
    const c = creator(id);
    if (c && !creatorOutreachBlockReason(c)) next.add(id);
  });
  state.bulkCreatorIds = Array.from(next);
  saveState();
  render();
}

function toggleCreatorPageSelection(ids, checked) {
  const next = new Set(state.bulkCreatorIds || []);
  (ids || []).forEach((id) => {
    const c = creator(id);
    if (!c || creatorOutreachBlockReason(c)) return;
    if (checked) next.add(id);
    else next.delete(id);
  });
  state.bulkCreatorIds = Array.from(next);
  saveState();
  render();
}

function clearBulkSelection() {
  state.bulkCreatorIds = [];
  saveState();
  render();
}

function openOutreachModal(creatorId = 0) {
  const selectedIds = creatorId ? [creatorId] : (state.bulkCreatorIds || []);
  const targets = selectedIds.map((id) => creator(id)).filter(Boolean).filter((c) => !creatorOutreachBlockReason(c));
  if (!targets.length) {
    alert("请先选择至少一位可建联达人。黑名单、不感兴趣和 24 小时内已建联达人会被拦截。");
    return;
  }
  if (Number.isFinite(quotaRemaining()) && quotaRemaining() < targets.length) {
    alert(`本月建联配额不足：剩余 ${quotaRemaining()}，本次选择 ${targets.length}。请升级套餐或减少选择数量。`);
    return;
  }
  if (!state.products.length) {
    alert("请先完成店铺授权并同步商品。建联和定向邀约必须从 TikTok 店铺商品中选择，避免手动录入造成数据不一致。");
    state.page = "products";
    location.hash = "#products";
    render();
    return;
  }
  const channelOptions = channelOptionsForCreators(targets);
  if (!channelOptions.length) return alert("当前没有可用发送渠道，请先到平台管理端开启 TikTok 私信、Email 或 WhatsApp。");
  const defaultTemplate = state.templates[0]?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}。";
  const defaultChannels = channelOptions.some(([value]) => value === "TikTok私信") ? ["TikTok私信"] : [channelOptions[0][0]];
  const emailNotice = emailAccountConfigured()
    ? `Email 已绑定：${escapeHtml(state.settings.emailAddress)}`
    : `Email 尚未绑定，选择 Email 前请先完成邮箱配置。`;
  openModal("发起建联", `
    <div class="flow-steps">
      <div class="flow-step active"><b>1</b><span>确认达人</span></div>
      <div class="flow-step active"><b>2</b><span>配置定向邀约</span></div>
      <div class="flow-step active"><b>3</b><span>选择触达渠道</span></div>
    </div>
    <div class="notice">本次将联系 ${targets.length} 位达人：${targets.slice(0, 5).map((c) => `@${escapeHtml(c.username)}`).join("、")}${targets.length > 5 ? " 等" : ""}。TikTok 私信按达人逐个会话发送；达人回复前连续消息存在平台限制，不能当成无约束群发。</div>
    <div class="modal-section-title">建联类型</div>
    <div class="outreach-mode-grid">
      <label class="mode-card selected">
        <input type="radio" name="outreachMode" value="target_collaboration" checked />
        <b>定向邀约 + 触达通知</b>
        <span>先创建 TikTok 定向邀约对象，包含商品、佣金和交付要求，再通过 TikTok 私信或 Email 通知达人。</span>
      </label>
      <label class="mode-card">
        <input type="radio" name="outreachMode" value="message_only" />
        <b>仅发送建联消息</b>
        <span>不创建定向邀约，只记录 TikTok 私信 / Email 建联消息。适合先沟通意向。</span>
      </label>
    </div>
    <div class="modal-section-title">选择建联商品与佣金</div>
    ${productMultiPicker([state.products[0]?.id].filter(Boolean))}
    <div class="form-grid" style="margin-top:12px">
      ${field("targetCollaborationName", "邀约名称", "夏季新品达人合作", `定向邀约-${todayString()}`)}
      ${field("targetExpiresAt", "邀约有效期", "2026-07-15", dateAfter(14))}
      ${multiCheckField("targetDeliverables", "交付形式", [["短视频", "短视频"], ["直播", "直播"]], ["短视频"])}
      ${selectField("sampleRule", "样品规则", [["不寄样", "不寄样"], ["达人申请后审核", "达人申请后审核"], ["自动寄样", "自动寄样"]], "达人申请后审核")}
      ${field("targetContactName", "联系人", "BD负责人", "Sam")}
      ${field("targetContactEmail", "联系邮箱", "bd@brand.com", state.settings.emailAddress || "")}
    </div>
    <div class="notice soft" style="margin-top:12px">
      <b>API 边界：</b>当前先创建本地定向邀约草稿并记录为“待API发送”。拿到 TikTok Target Collaboration 精确请求 schema 后，再把该草稿提交到官方接口；系统不会把本地链接伪装成官方邀约。
    </div>
    <div class="modal-section-title">触达渠道与消息</div>
    <div class="form-grid" style="margin-top:12px">
      ${multiCheckField("outreachChannels", "发送渠道（可多选）", channelOptions, defaultChannels)}
      ${selectField("outreachTemplateId", "消息模板", [["0", "不使用模板"], ...state.templates.map((x) => [x.id, x.name])], state.templates[0]?.id || "0")}
      ${selectField("outreachSendMode", "发送方式", [["立即发送", "立即发送"], ["定时发送", "定时发送"]], "立即发送")}
      ${field("outreachScheduleAt", "定时发送时间", "2026-06-22 09:30", "")}
      ${selectField("outreachLanguage", "翻译目标语言", languageOptionsForTargets(targets), targetLanguageForCreator(targets[0]))}
    </div>
    <div class="notice soft" style="margin-top:12px">
      <b>Email 配置：</b>${emailNotice}
      <button class="btn ghost" type="button" onclick="openEmailSetupModal('outreach')">配置邮箱/查看教程</button>
    </div>
    <div class="form-field" style="margin-top:12px"><label>消息内容</label><textarea id="outreachMessage" class="textarea">${escapeHtml(defaultTemplate)}</textarea></div>
    <div class="translation-panel">
      <div class="toolbar" style="margin:0 0 8px">
        <div><b>翻译稿</b><div class="muted">用于 Email 或私信发送前预览，保存后进入建联记录。</div></div>
        <button class="btn" type="button" onclick="translateOutreachDraft()">翻译成达人语言</button>
      </div>
      <textarea id="outreachTranslatedMessage" class="textarea" placeholder="点击翻译后生成目标语言版本。"></textarea>
    </div>
  `, `<button class="btn primary" onclick="saveOutreach('${selectedIds.join(",")}')">创建建联任务</button>`);
}

function renderTemplate(content, c, p) {
  return String(content || "")
    .replaceAll("{KOL名称}", c.nickname || c.username)
    .replaceAll("{达人名称}", c.nickname || c.username)
    .replaceAll("{产品名称}", p.name)
    .replaceAll("{联盟佣金率}", p.commission || "-");
}

function translateOutreachDraft() {
  if (!featureEnabled("translation")) return alert("消息翻译功能已被平台管理端关闭。");
  const products = selectedOutreachProducts();
  const p = products[0] || state.products[0];
  const lang = document.getElementById("outreachLanguage")?.value || "英语";
  const c = String(document.querySelector("#modalFoot .btn.primary")?.getAttribute("onclick") || "")
    .match(/saveOutreach\('([^']*)'\)/)?.[1]
    ?.split(",")
    .map((id) => creator(Number(id)))
    .filter(Boolean)[0] || state.creators[0];
  const target = document.getElementById("outreachTranslatedMessage");
  if (target) target.value = translatedInviteDraft(lang, c, p);
}

function openEmailSetupModal(origin = "") {
  const provider = state.settings.emailProvider || "Gmail";
  const tabs = ["Gmail+Lark", "Gmail", "Outlook/Hotmail", "其他"];
  openModal("绑定发信邮箱", `
    <div class="notice">Email 建联需要先配置发信邮箱。这里保存的是本地连接配置；真实生产环境应由后端加密保存应用专用密码。</div>
    <div class="email-guide-layout">
      <div>
        <div class="form-grid">
          ${selectField("emailProvider", "邮箱类型", tabs.map((x) => [x, x]), provider)}
          ${field("emailAddress", "邮箱账号", "bd@brand.com", state.settings.emailAddress || "")}
          ${field("emailSmtpHost", "SMTP（发件）", "smtp.gmail.com", state.settings.emailSmtpHost || "smtp.gmail.com")}
          ${field("emailSmtpPort", "SMTP 端口", "587", state.settings.emailSmtpPort || "587")}
          ${field("emailImapHost", "IMAP（收件）", "imap.gmail.com", state.settings.emailImapHost || "imap.gmail.com")}
          ${field("emailImapPort", "IMAP 端口", "993", state.settings.emailImapPort || "993")}
        </div>
        <div class="form-field" style="margin-top:12px"><label>应用专用密码</label><input id="emailAppPassword" class="input" type="password" placeholder="不要填写登录密码，必须是应用专用密码" style="width:100%" /></div>
      </div>
      <div class="email-guide-card">
        <h3>配置指南</h3>
        <div class="guide-tabs">${tabs.map((x) => `<span class="guide-tab ${x === provider ? "active" : ""}">${escapeHtml(x)}</span>`).join("")}</div>
        <div class="guide-row"><b>SMTP（发件）</b><code>smtp.gmail.com:587</code></div>
        <div class="guide-row"><b>IMAP（收件）</b><code>imap.gmail.com:993</code></div>
        <div class="guide-warning"><b>密码说明</b><br>必须使用“应用专用密码”，不是邮箱登录密码。</div>
        <ol>
          <li>登录 Google 账号，进入 myaccount.google.com。</li>
          <li>打开“安全性”，先开启“两步验证”。</li>
          <li>搜索“应用专用密码”，生成 16 位密码。</li>
          <li>把 16 位密码填入左侧密码框。</li>
          <li>每日发信量受邮箱服务商限制，Gmail 通常约 500 封/天。</li>
        </ol>
        <div class="notice soft">发件和收件可以用同一个邮箱账号，但服务器地址不能填反。</div>
      </div>
    </div>
  `, `<button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="saveEmailSettings()">保存邮箱配置</button>`);
}

function saveEmailSettings() {
  const get = (id) => document.getElementById(id)?.value.trim() || "";
  if (!get("emailAddress")) return alert("请填写邮箱账号。");
  if (!get("emailAppPassword")) return alert("请填写应用专用密码。");
  state.settings.emailProvider = get("emailProvider") || "Gmail";
  state.settings.emailAddress = get("emailAddress");
  state.settings.emailSmtpHost = get("emailSmtpHost");
  state.settings.emailSmtpPort = get("emailSmtpPort");
  state.settings.emailImapHost = get("emailImapHost");
  state.settings.emailImapPort = get("emailImapPort");
  state.settings.emailConnected = true;
  state.settings.emailAppPasswordConfigured = true;
  addSyncLog("Email 配置", "已保存", `已绑定发信邮箱：${state.settings.emailAddress}`);
  pushMessage("Email 配置", `已绑定发信邮箱：${state.settings.emailAddress}。`);
  saveState();
  closeModal();
  render();
}

function copyInviteLink(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row?.inviteLink) return alert("该建联记录没有邀请链接。");
  navigator.clipboard?.writeText(row.inviteLink);
  alert("邀请链接已复制。");
}

function needsContactEnrichment(channel, c) {
  return channel === "Email" && !c?.email;
}

function queueContactEnrichment(c, channel, productName) {
  const text = `已为 @${c.username} 创建 ${channel} 联系方式补充任务；目标产品：${productName}。联系方式补充完成前不会发送 Email。`;
  addSyncLog("联系方式补充", "待处理", text);
  pushMessage("联系方式补充", text);
}

function targetCollaboration(id) {
  return (state.targetCollaborations || []).find((row) => row.id === id);
}

function targetCollaborationStatusText(row) {
  if (!row) return "";
  return `${row.status || "待API发送"}${row.officialId ? ` · TikTok ID ${row.officialId}` : ""}`;
}

function createTargetCollaborationDraft(targets, products, options) {
  const id = Date.now();
  const row = {
    id,
    officialId: "",
    name: options.name,
    mode: "target_collaboration",
    status: "待API发送",
    creatorIds: targets.map((c) => c.id),
    creatorUsernames: targets.map((c) => c.username),
    productIds: products.map((p) => p.id),
    products,
    deliverables: options.deliverables,
    sampleRule: options.sampleRule,
    expiresAt: options.expiresAt,
    contactName: options.contactName,
    contactEmail: options.contactEmail,
    createdAt: nowText(),
    updatedAt: nowText(),
    notes: "本地定向邀约草稿。待 TikTok Target Collaboration API 精确 schema 确认后提交官方接口。",
  };
  state.targetCollaborations.unshift(row);
  return row;
}

function outreachProductNames(o) {
  if (Array.isArray(o.productsSnapshot) && o.productsSnapshot.length) return productSnapshotNames(o.productsSnapshot);
  if (Array.isArray(o.productIds) && o.productIds.length) return productSnapshotNames(o.productIds.map(product).filter(Boolean));
  return product(o.productId)?.name || "-";
}

function outreachProductCell(o) {
  const target = targetCollaboration(o.targetCollaborationId);
  const products = Array.isArray(o.productsSnapshot) && o.productsSnapshot.length
    ? o.productsSnapshot
    : (Array.isArray(o.productIds) ? o.productIds.map(product).filter(Boolean) : [product(o.productId)].filter(Boolean));
  const names = productSnapshotNames(products);
  const commission = products.map((p) => {
    const rate = p.standardCommissionRate ?? commissionDefault(p);
    const ad = p.adCommissionEnabled && p.adCommissionRate ? ` + 广告 ${p.adCommissionRate}%` : "";
    return `${p.name}: ${rate}%${ad}`;
  }).join("；");
  return `
    <div><b>${escapeHtml(names)}</b></div>
    ${target ? `<div class="muted">${escapeHtml(target.name)} · ${escapeHtml(targetCollaborationStatusText(target))}</div>` : ""}
    ${commission ? `<div class="muted">${escapeHtml(commission)}</div>` : ""}
  `;
}

function saveOutreach(idList) {
  const ids = String(idList || "").split(",").map((x) => Number(x)).filter(Boolean);
  const selectedProducts = selectedOutreachProducts();
  if (!selectedProducts.length) return alert("请至少选择一个已同步商品。");
  const templateId = Number(document.getElementById("outreachTemplateId").value);
  const template = state.templates.find((x) => x.id === templateId);
  const channels = getCheckedValues("outreachChannels");
  const sendMode = document.getElementById("outreachSendMode").value;
  const scheduleAt = document.getElementById("outreachScheduleAt").value.trim();
  const mode = document.querySelector('input[name="outreachMode"]:checked')?.value || "target_collaboration";
  const translationLanguage = document.getElementById("outreachLanguage")?.value || "";
  const editedTranslation = document.getElementById("outreachTranslatedMessage")?.value.trim() || "";
  const message = document.getElementById("outreachMessage").value.trim() || template?.content || "";
  const targetOptions = {
    name: document.getElementById("targetCollaborationName")?.value.trim() || `定向邀约-${todayString()}`,
    expiresAt: document.getElementById("targetExpiresAt")?.value.trim() || dateAfter(14),
    deliverables: getCheckedValues("targetDeliverables"),
    sampleRule: document.getElementById("sampleRule")?.value || "达人申请后审核",
    contactName: document.getElementById("targetContactName")?.value.trim() || "Sam",
    contactEmail: document.getElementById("targetContactEmail")?.value.trim() || state.settings.emailAddress || "",
  };
  if (mode === "target_collaboration" && !targetOptions.deliverables.length) return alert("定向邀约至少选择一种交付形式。");
  if (mode === "target_collaboration" && selectedProducts.some((p) => !p.standardCommissionRate || p.standardCommissionRate < 1 || p.standardCommissionRate > 80)) return alert("标准佣金率必须在 1-80% 之间。");
  if (selectedProducts.some((p) => p.adCommissionEnabled && (!p.adCommissionRate || p.adCommissionRate < 1 || p.adCommissionRate > 80))) return alert("广告佣金率必须在 1-80% 之间，或关闭广告佣金。");
  const blocked = ids.map((id) => creator(id)).filter(Boolean).map((c) => [c, creatorOutreachBlockReason(c)]).filter(([, reason]) => reason);
  if (blocked.length) {
    alert(`以下达人暂不可建联：${blocked.map(([c, reason]) => `@${c.username}（${reason}）`).join("、")}`);
    return;
  }
  const targets = ids.map((id) => creator(id)).filter(Boolean);
  if (Number.isFinite(quotaRemaining()) && quotaRemaining() < targets.length) {
    alert(`本月建联配额不足：剩余 ${quotaRemaining()}，本次需要 ${targets.length}。请升级套餐或减少选择数量。`);
    state.page = "billing";
    location.hash = "#billing";
    render();
    return;
  }
  if (!validateChannelsForCreators(channels, targets)) return;
  const targetCollab = mode === "target_collaboration" ? createTargetCollaborationDraft(targets, selectedProducts, targetOptions) : null;
  let created = 0;
  const productNames = productSnapshotNames(selectedProducts);
  ids.forEach((id, index) => {
    const c = creator(id);
    if (!c || c.status === "黑名单") return;
    const rendered = renderTemplate(message, c, selectedProducts[0] || {});
    const scheduledText = sendMode === "定时发送" && scheduleAt ? `定时发送：${scheduleAt}` : "立即发送";
    const translatedMessage = editedTranslation && targets.length === 1
      ? editedTranslation
      : (translationLanguage ? translatedInviteDraft(translationLanguage, c, selectedProducts[0] || {}) : "");
    channels.forEach((channel, channelIndex) => {
      const pendingContact = needsContactEnrichment(channel, c);
      if (pendingContact) queueContactEnrichment(c, channel, productNames);
      const recordId = Date.now() + index * 10 + channelIndex;
      const status = pendingContact ? "联系方式补充中" : (channel === "TikTok私信" || targetCollab ? "待API发送" : "待回复");
      const officialNote = targetCollab ? `定向邀约：${targetCollab.name}（${targetCollab.status}）` : "仅建联消息";
      const messageWithContext = `${rendered}\n${officialNote}\n商品：${productNames}`;
      state.outreach.unshift({
        id: recordId,
        creatorId: c.id,
        productId: selectedProducts[0]?.id,
        productIds: selectedProducts.map((p) => p.id),
        productsSnapshot: selectedProducts,
        targetCollaborationId: targetCollab?.id || null,
        channel,
        channels,
        status,
        lastMessage: pendingContact ? `待补充 Email 后发送 · ${messageWithContext}` : `${scheduledText} · ${messageWithContext}`,
        translatedMessage,
        translationLanguage,
        inviteLink: "",
        updatedAt: nowText(),
      });
      created += 1;
    });
    c.status = channels.includes("Email") && needsContactEnrichment("Email", c) ? "联系方式补充中" : "已发送";
  });
  state.bulkCreatorIds = [];
  logOperation("建联发送", channels.join("+"), `创建 ${created} 条建联记录；商品：${productNames}；模式：${mode}`);
  if (targetCollab) pushMessage("定向邀约草稿", `已创建定向邀约草稿「${targetCollab.name}」，包含 ${selectedProducts.length} 个商品、${targets.length} 位达人，状态：待API发送。`);
  pushMessage("批量建联", `已创建 ${created} 条建联记录，渠道：${channels.map(channelLabel).join("+")}，商品：${productNames}。缺少 Email 的达人已进入联系方式补充。`);
  closeModal();
  saveState();
  state.page = "outreach";
  state.selectedCreatorId = null;
  location.hash = "#outreach";
  render();
}

function openCoopModal(id) {
  const row = id ? state.cooperations.find((x) => x.id === id) : null;
  const ownerOptions = fixedOptions(state.team.map((x) => x.name), state.cooperations.map((x) => x.owner)).map((x) => [x, x]);
  openModal(row ? "编辑合作" : "新增合作", `
    <div class="form-grid">
      ${selectField("coopCreatorId", "达人", state.creators.filter((x) => x.status !== "黑名单").map((x) => [x.id, `@${x.username}`]), row?.creatorId)}
      ${selectField("coopProductId", "产品", state.products.map((x) => [x.id, x.name]), row?.productId)}
      ${selectField("coopType", "合作类型", [["短视频", "短视频"], ["直播", "直播"], ["短视频+直播", "短视频+直播"], ["挂车", "挂车"]], row?.type)}
      ${selectField("coopStatus", "内容状态", outputStatuses.filter((x) => x !== "全部").map((x) => [x, x]), row?.status)}
      ${field("coopDueDate", "产出截止日", "2026-06-30", row?.dueDate || "")}
      ${selectField("coopOwner", "负责人", ownerOptions, row?.owner || state.team[0]?.name || "")}
      ${field("coopVideos", "视频数", "0", row?.videos ?? 0)}
      ${field("coopLives", "直播场次", "0", row?.lives ?? 0)}
      ${field("coopOrders", "订单数", "0", row?.orders ?? 0)}
      ${field("coopGmv", "GMV", "0", row?.gmv ?? 0)}
      ${field("coopCommission", "佣金支出", "0", row?.commission ?? 0)}
      ${field("coopAdSpend", "投流支出", "0", row?.adSpend ?? 0)}
    </div>
    <div class="form-field" style="margin-top:12px"><label>标签（逗号分隔）</label><input id="coopTags" class="input" style="width:100%" value="${escapeHtml((row?.tags || []).join(","))}" /></div>
    <div class="form-field" style="margin-top:12px"><label>内容链接</label><input id="coopContentUrl" class="input" style="width:100%" value="${escapeHtml(row?.contentUrl || "")}" /></div>
    <div class="form-field" style="margin-top:12px"><label>备注</label><textarea id="coopNotes" class="textarea">${escapeHtml(row?.notes || "")}</textarea></div>
  `, `<button class="btn primary" onclick="saveCoop(${row?.id || 0})">保存</button>`);
}

function selectField(id, label, options, value) {
  return `<div class="form-field"><label>${label}</label><select id="${id}" class="select">${options.map(([v, text]) => `<option value="${escapeHtml(v)}" ${String(value ?? "") === String(v) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></div>`;
}

function multiCheckField(id, label, options, selected = []) {
  const values = Array.isArray(selected) ? selected : String(selected || "").split(/[，,]/).map((x) => x.trim()).filter(Boolean);
  return `
    <div class="form-field">
      <label>${escapeHtml(label)}</label>
      <div class="check-grid" id="${escapeHtml(id)}">
        ${options.map(([value, text]) => `
          <label class="check-option">
            <input type="checkbox" value="${escapeHtml(value)}" ${values.includes(String(value)) || values.includes(String(text)) ? "checked" : ""} />
            <span>${escapeHtml(text)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function getCheckedValues(id) {
  return Array.from(document.querySelectorAll(`#${CSS.escape(id)} input[type="checkbox"]:checked`)).map((input) => input.value);
}

function fixedOptions(baseOptions, currentValues = []) {
  return Array.from(new Set([...baseOptions, ...currentValues.filter(Boolean)]));
}

function multiFilterChips(key, label, options) {
  const selected = filterValues(state.filters[key]);
  const allActive = selected.length === 0;
  return `
    <div class="filter-group">
      <div class="filter-label">${escapeHtml(label)}</div>
      <div class="chip-row">
        <button class="filter-chip ${allActive ? "active" : ""}" onclick="clearMultiFilter('${escapeJs(key)}')">全部</button>
        ${options.map((option) => `
          <button class="filter-chip ${selected.includes(option) ? "active" : ""}" onclick="toggleMultiFilter('${escapeJs(key)}','${escapeJs(option)}')">${escapeHtml(option)}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function singleFilterSelect(key, label, options) {
  return `
    <label class="filter-select">
      <span>${escapeHtml(label)}</span>
      <select class="select" onchange="setFilter('${escapeJs(key)}', this.value)">
        ${["全部", ...options].map((x) => `<option ${state.filters[key] === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
      </select>
    </label>
  `;
}

function saveCoop(id) {
  const get = (x) => document.getElementById(x).value.trim();
  const data = {
    id: id || Date.now(),
    creatorId: Number(get("coopCreatorId")),
    productId: Number(get("coopProductId")),
    type: get("coopType"),
    status: get("coopStatus"),
    dueDate: get("coopDueDate"),
    videos: Number(get("coopVideos") || 0),
    lives: Number(get("coopLives") || 0),
    orders: Number(get("coopOrders") || 0),
    gmv: Number(get("coopGmv") || 0),
    commission: Number(get("coopCommission") || 0),
    adSpend: Number(get("coopAdSpend") || 0),
    contentUrl: get("coopContentUrl"),
    inviteLink: id ? (state.cooperations.find((x) => x.id === id)?.inviteLink || "") : "",
    tags: get("coopTags").split(",").map((x) => x.trim()).filter(Boolean),
    owner: get("coopOwner"),
    notes: document.getElementById("coopNotes").value.trim(),
  };
  if (id) state.cooperations = state.cooperations.map((x) => x.id === id ? data : x);
  else state.cooperations.unshift(data);
  const c = creator(data.creatorId);
  if (c) c.status = "已合作";
  closeModal();
  saveState();
  render();
}

function addCoopTag(id) {
  const tag = prompt(`输入标签。固定标签可用：${fixedTags.join("、")}`);
  if (!tag) return;
  const row = state.cooperations.find((x) => x.id === id);
  if (row && !row.tags.includes(tag)) row.tags.push(tag);
  saveState();
  render();
}

function urgeOutput(id) {
  const row = state.cooperations.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const p = product(row.productId);
  row.notes = `${row.notes || ""}\n[${nowText()}] 已催发：提醒 @${c?.username || "-"} 提交 ${p?.name || "-"} 的内容产出。`.trim();
  if (!row.tags.includes("需催发")) row.tags.push("需催发");
  state.systemMessages.unshift({
    id: Date.now(),
    type: "合作催发",
    text: `已记录对 @${c?.username || "-"} 的内容催发。`,
    at: nowText(),
    read: false,
  });
  saveState();
  render();
}

function resolveUnmatched(id) {
  const row = state.cooperations.find((x) => x.id === id);
  if (!row) return;
  const next = prompt("匹配后的内容状态：已发视频 / 已直播 / 视频+直播", "已发视频");
  if (!next) return;
  row.status = next;
  if (next.includes("视频") && Number(row.videos || 0) === 0) row.videos = 1;
  if (next.includes("直播") && Number(row.lives || 0) === 0) row.lives = 1;
  row.notes = `${row.notes || ""}\n[${nowText()}] 已处理订单未匹配内容，状态更新为：${next}。`.trim();
  row.tags = row.tags.filter((t) => t !== "需核对");
  saveState();
  render();
}

function finishCoop(id) {
  const row = state.cooperations.find((x) => x.id === id);
  if (!row) return;
  if (!confirm("确认结束该合作？")) return;
  row.status = "合作结束";
  row.notes = `${row.notes || ""}\n[${nowText()}] 合作已结束。`.trim();
  saveState();
  render();
}

function deleteCoop(id) {
  if (!confirm("确认删除该合作记录？")) return;
  state.cooperations = state.cooperations.filter((x) => x.id !== id);
  saveState();
  render();
}

function markOverdue() {
  const today = new Date().toISOString().slice(0, 10);
  state.cooperations.forEach((x) => {
    const noOutput = Number(x.videos || 0) === 0 && Number(x.lives || 0) === 0;
    if (x.dueDate && x.dueDate < today && noOutput && x.status !== "合作结束") {
      x.status = "逾期未产出";
      if (!x.tags.includes("需催发")) x.tags.push("需催发");
    }
  });
  saveState();
  render();
}

function openSampleModal(id = 0) {
  const row = state.samples.find((x) => x.id === id);
  openModal(row ? "更新寄样" : "新增寄样", `
    <div class="form-grid">
      ${selectField("sampleCreatorId", "达人", state.creators.filter((x) => x.status !== "黑名单").map((x) => [x.id, `@${x.username}`]), row?.creatorId)}
      ${selectField("sampleProductId", "产品", state.products.map((x) => [x.id, x.name]), row?.productId)}
      ${selectField("sampleStatus", "寄样状态", [["待审核", "待审核"], ["待发货", "待发货"], ["已发货", "已发货"], ["已签收", "已签收"], ["已拒绝", "已拒绝"]], row?.status || "待审核")}
      ${field("sampleTracking", "物流单号", "SG123456789", row?.tracking || "")}
    </div>
  `, `<button class="btn primary" onclick="saveSample(${row?.id || 0})">保存</button>`);
}

function saveSample(id = 0) {
  const get = (x) => document.getElementById(x).value.trim();
  const payload = {
    id: id || Date.now(),
    creatorId: Number(get("sampleCreatorId")),
    productId: Number(get("sampleProductId")),
    status: get("sampleStatus"),
    tracking: get("sampleTracking"),
    updatedAt: nowText(),
  };
  if (id) state.samples = state.samples.map((x) => x.id === id ? payload : x);
  else state.samples.unshift(payload);
  pushMessage("寄样状态", `@${creator(payload.creatorId)?.username || "-"} 的寄样状态已更新为：${payload.status}。`);
  closeModal();
  saveState();
  render();
}

function deleteSample(id) {
  if (!confirm("确认删除该寄样记录？")) return;
  state.samples = state.samples.filter((x) => x.id !== id);
  saveState();
  render();
}

function autoReplyConditionText(rule) {
  const parts = [];
  if (rule.matchType === "条件组合") {
    parts.push(`达人类型：${escapeHtml(rule.creatorType || "全部")}`);
    parts.push(`地区：${escapeHtml(rule.region || "全部")}`);
    if (Number(rule.minFollowers || 0) > 0) parts.push(`粉丝≥${Number(rule.minFollowers).toLocaleString("en-US")}`);
  } else {
    parts.push(`${escapeHtml(rule.matchType)}：${escapeHtml(rule.keywords || "-")}`);
  }
  return parts.join("<br>");
}

function openAutoReplyModal(id = 0) {
  const row = id ? state.autoReplies.find((x) => x.id === id) : null;
  const creatorTypes = ["全部", ...creatorTypeOptions];
  const regions = ["全部", ...fixedOptions(marketOptions, state.creators.map((x) => x.region))];
  openModal(row ? "编辑自动回复规则" : "新增自动回复规则", `
    <div class="notice">自动回复只会在真实接入消息回调/轮询后发送；当前本地测试用于验证规则是否命中，不会向达人发送外部消息。</div>
    <div class="form-grid" style="margin-top:12px">
      ${field("autoReplyName", "规则名称", "感兴趣回复", row?.name || "")}
      ${selectField("autoReplyMatchType", "规则类型", [["包含关键词", "包含关键词"], ["完全匹配", "完全匹配"], ["条件组合", "条件组合"]], row?.matchType || "包含关键词")}
      ${field("autoReplyKeywords", "关键词（逗号分隔）", "interested,yes,details", row?.keywords || "")}
      ${selectField("autoReplyCreatorType", "达人类型条件", creatorTypes.map((x) => [x, x]), row?.creatorType || "全部")}
      ${selectField("autoReplyRegion", "地区条件", regions.map((x) => [x, x]), row?.region || "全部")}
      ${field("autoReplyMinFollowers", "最低粉丝数", "100000", row?.minFollowers ?? 0)}
      ${field("autoReplyPriority", "优先级（数字越小越先命中）", "10", row?.priority ?? 50)}
      ${selectField("autoReplyEnabled", "状态", [["启用", "启用"], ["停用", "停用"]], row?.enabled === false ? "停用" : "启用")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>回复内容</label><textarea id="autoReplyContent" class="textarea" placeholder="感谢回复，我们会继续推进合作。">${escapeHtml(row?.replyContent || "感谢回复，我们会继续推进合作。")}</textarea></div>
  `, `<button class="btn primary" onclick="saveAutoReply(${row?.id || 0})">保存规则</button>`);
}

function saveAutoReply(id = 0) {
  const get = (x) => document.getElementById(x).value.trim();
  const name = get("autoReplyName");
  const replyContent = document.getElementById("autoReplyContent").value.trim();
  if (!name || !replyContent) return alert("请填写规则名称和回复内容");
  if (!id && state.autoReplies.length >= 50) return alert("自动回复规则最多 50 条");
  const payload = normalizeAutoReply({
    id: id || Date.now(),
    name,
    matchType: get("autoReplyMatchType"),
    keywords: get("autoReplyKeywords"),
    creatorType: get("autoReplyCreatorType"),
    region: get("autoReplyRegion"),
    minFollowers: Number(get("autoReplyMinFollowers") || 0),
    priority: Number(get("autoReplyPriority") || 50),
    replyContent,
    enabled: get("autoReplyEnabled") === "启用",
  });
  if (id) state.autoReplies = state.autoReplies.map((x) => x.id === id ? payload : x);
  else state.autoReplies.push(payload);
  logOperation(id ? "编辑自动回复" : "新增自动回复", payload.name, `规则：${payload.matchType}；优先级：${payload.priority}`);
  pushMessage("自动回复配置", `${payload.name} 已保存，状态：${payload.enabled ? "启用" : "停用"}。`);
  closeModal();
  saveState();
  render();
}

function toggleAutoReply(id) {
  const row = state.autoReplies.find((x) => x.id === id);
  if (row) {
    row.enabled = !row.enabled;
    logOperation("自动回复状态", row.name, `状态变更为：${row.enabled ? "启用" : "停用"}`);
    pushMessage("自动回复配置", `${row.name} 已${row.enabled ? "启用" : "停用"}。`);
  }
  saveState();
  render();
}

function deleteAutoReply(id) {
  const row = state.autoReplies.find((x) => x.id === id);
  if (!row || !confirm(`确认删除自动回复规则「${row.name}」？`)) return;
  state.autoReplies = state.autoReplies.filter((x) => x.id !== id);
  logOperation("删除自动回复", row.name, "删除规则");
  pushMessage("自动回复配置", `${row.name} 已删除。`);
  saveState();
  render();
}

function autoReplyMatches(rule, message, c) {
  if (!rule.enabled) return false;
  if (rule.matchType === "条件组合") {
    const typeOk = rule.creatorType === "全部" || c?.type === rule.creatorType;
    const regionOk = rule.region === "全部" || c?.region === rule.region;
    const followersOk = Number(c?.followers || 0) >= Number(rule.minFollowers || 0);
    return typeOk && regionOk && followersOk;
  }
  const msg = String(message || "").trim().toLowerCase();
  const keywords = String(rule.keywords || "").split(/[，,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!keywords.length) return false;
  if (rule.matchType === "完全匹配") return keywords.some((kw) => msg === kw);
  return keywords.some((kw) => msg.includes(kw));
}

function openAutoReplyTest(id = 0) {
  const row = id ? state.autoReplies.find((x) => x.id === id) : null;
  const firstCreator = state.creators.find((x) => x.status !== "黑名单") || state.creators[0];
  openModal(row ? "测试自动回复规则" : "测试自动回复", `
    <div class="notice">本地测试只写入系统消息，不会发送 TikTok / Email / WhatsApp 真实消息。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("autoReplyTestRule", "测试规则", [["0", "按优先级测试全部启用规则"], ...state.autoReplies.map((x) => [x.id, x.name])], row?.id || "0")}
      ${selectField("autoReplyTestCreator", "模拟达人", state.creators.filter((x) => x.status !== "黑名单").map((x) => [x.id, `@${x.username} · ${x.type} · ${x.region}`]), firstCreator?.id)}
    </div>
    <div class="form-field" style="margin-top:12px"><label>模拟达人消息</label><textarea id="autoReplyTestMessage" class="textarea">I am interested, please send details.</textarea></div>
  `, `<button class="btn primary" onclick="runAutoReplyTest()">运行测试</button>`);
}

function runAutoReplyTest() {
  const selectedRuleId = Number(document.getElementById("autoReplyTestRule").value);
  const c = creator(Number(document.getElementById("autoReplyTestCreator").value));
  const message = document.getElementById("autoReplyTestMessage").value.trim();
  const candidates = (selectedRuleId ? state.autoReplies.filter((x) => x.id === selectedRuleId) : state.autoReplies.filter((x) => x.enabled))
    .sort((a, b) => a.priority - b.priority);
  const matched = candidates.find((rule) => autoReplyMatches(rule, message, c));
  if (!matched) return alert("未命中自动回复规则。请检查关键词、达人类型、地区或粉丝数条件。");
  pushMessage("自动回复触发", `本地测试命中「${matched.name}」，模拟回复 @${c?.username || "-"}：${matched.replyContent}`);
  closeModal();
  saveState();
  state.page = "messages";
  location.hash = "#messages";
  render();
}

function openTemplateModal(id = 0) {
  const row = state.templates.find((x) => x.id === id);
  openModal(row ? "编辑消息模板" : "新增消息模板", `
    <div class="form-grid">
      ${field("templateName", "模板名称", "首次建联 - 短视频", row?.name || "")}
      ${selectField("templateChannel", "渠道", [["TikTok私信", "TikTok私信"], ["Email", "Email"], ["WhatsApp", "WhatsApp"]], row?.channel || "TikTok私信")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>模板内容</label><textarea id="templateContent" class="textarea" placeholder="Hi {KOL名称}，我们想邀请你合作 {产品名称}。">${escapeHtml(row?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}，佣金为 {联盟佣金率}。")}</textarea></div>
    <div class="muted" style="margin-top:8px">支持变量：{KOL名称}、{产品名称}、{联盟佣金率}</div>
  `, `<button class="btn primary" onclick="saveTemplate(${row?.id || 0})">保存</button>`);
}

function saveTemplate(id = 0) {
  const name = document.getElementById("templateName").value.trim();
  const channel = document.getElementById("templateChannel").value;
  const content = document.getElementById("templateContent").value.trim();
  if (!name || !content) {
    alert("请填写模板名称和内容");
    return;
  }
  const payload = { id: id || Date.now(), name, channel, content };
  if (id) state.templates = state.templates.map((x) => x.id === id ? payload : x);
  else state.templates.push(payload);
  logOperation(id ? "编辑模板" : "新增模板", name, `渠道：${channel}`);
  pushMessage("模板更新", `消息模板“${name}”已保存。`);
  closeModal();
  saveState();
  render();
}

function deleteTemplate(id) {
  if (!confirm("确认删除该消息模板？")) return;
  const row = state.templates.find((x) => x.id === id);
  state.templates = state.templates.filter((x) => x.id !== id);
  if (row) logOperation("删除模板", row.name, `渠道：${row.channel}`);
  saveState();
  render();
}

function restoreCreator(id) {
  const c = creator(id);
  if (c) {
    c.status = "待联系";
    c.blacklistRestoredAt = nowText();
    logOperation("移出黑名单", c.username, "恢复为待联系");
    pushMessage("KOL黑名单", `@${c.username} 已移出黑名单。`);
  }
  saveState();
  render();
}

function openTeamMemberModal(id = 0) {
  const row = id ? state.team.find((x) => x.id === id) : null;
  const roleOptions = Object.keys(rolePermissions).map((role) => [role, role]);
  const currentStores = state.team.flatMap((x) => String(x.stores || "").split(/[，,]/).map((item) => item.trim()).filter(Boolean));
  const authorizedStores = (state.settings.tiktokShops || []).map((shop) => shopLabel(shop));
  const storeOptions = fixedOptions(["全部店铺", ...authorizedStores], currentStores).map((x) => [x, x]);
  openModal(row ? "编辑团队成员" : "新增团队成员", `
    <div class="notice">本地版本记录团队配置和操作日志；真实邀请邮件、登录账号和权限拦截需要后端账号系统接入。</div>
    <div class="form-grid" style="margin-top:12px">
      ${field("teamName", "姓名", "Mia", row?.name || "")}
      ${field("teamEmail", "邮箱", "mia@example.com", row?.email || "")}
      ${selectField("teamRole", "角色", roleOptions, row?.role || "BD专员")}
      ${multiCheckField("teamStores", "可访问店铺", storeOptions, row?.stores || "全部店铺")}
      ${selectField("teamStatus", "状态", [["启用", "启用"], ["禁用", "禁用"]], row?.status || "启用")}
    </div>
  `, `<button class="btn primary" onclick="saveTeamMember(${row?.id || 0})">保存成员</button>`);
}

function saveTeamMember(id = 0) {
  const get = (x) => document.getElementById(x).value.trim();
  const name = get("teamName");
  const email = get("teamEmail");
  if (!name || !email) return alert("请填写姓名和邮箱");
  const payload = normalizeTeamMember({
    id: id || Date.now(),
    name,
    email,
    role: get("teamRole"),
    stores: getCheckedValues("teamStores").join(",") || "全部店铺",
    status: get("teamStatus"),
  });
  if (id) state.team = state.team.map((x) => x.id === id ? payload : x);
  else state.team.push(payload);
  logOperation(id ? "编辑成员" : "新增成员", payload.name, `角色：${payload.role}；店铺：${payload.stores}；状态：${payload.status}`);
  pushMessage("团队成员", `${payload.name} 已${id ? "更新" : "新增"}，角色：${payload.role}。`);
  closeModal();
  saveState();
  render();
}

function toggleTeamMember(id) {
  const row = state.team.find((x) => x.id === id);
  if (!row) return;
  row.status = row.status === "启用" ? "禁用" : "启用";
  logOperation("成员状态", row.name, `状态变更为：${row.status}`);
  pushMessage("团队成员", `${row.name} 已${row.status}。`);
  saveState();
  render();
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kol-compass-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(values) {
  return values.map(csvEscape).join(",");
}

function downloadCreatorsCsvTemplate() {
  const headers = ["username", "nickname", "type", "category", "region", "followers", "gmv", "replyRate", "tags", "email", "whatsapp", "notes"];
  const rows = [headers];
  downloadTextFile("kol-creators-template.csv", `\uFEFF${rows.map(csvLine).join("\n")}\n`, "text/csv;charset=utf-8");
}

function downloadCoopsCsvTemplate() {
  const headers = ["username", "product", "type", "status", "dueDate", "videos", "lives", "orders", "gmv", "commission", "adSpend", "contentUrl", "tags", "owner", "notes"];
  const rows = [headers];
  downloadTextFile("kol-cooperations-template.csv", `\uFEFF${rows.map(csvLine).join("\n")}\n`, "text/csv;charset=utf-8");
}

function importState() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nextState = JSON.parse(String(reader.result || "{}"));
        const required = ["products", "creators", "outreach", "samples", "cooperations"];
        const missing = required.filter((key) => !Array.isArray(nextState[key]));
        if (missing.length) {
          alert(`导入失败：缺少字段 ${missing.join(", ")}`);
          return;
        }
        state = { ...structuredClone(seed), ...nextState, selectedCreatorId: null };
        saveState();
        render();
        alert("导入成功");
      } catch (error) {
        alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  };
  input.click();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function readCsvFile(onRows) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(reader.result);
        if (rows.length < 2) {
          alert("CSV 至少需要表头和一行数据");
          return;
        }
        onRows(rows);
      } catch (error) {
        alert(`CSV 解析失败：${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  };
  input.click();
}

function headerIndex(headers, aliases) {
  const normalized = headers.map((h) => String(h || "").trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function rowValue(row, headers, aliases, fallback = "") {
  const idx = headerIndex(headers, aliases);
  return idx >= 0 ? (row[idx] || fallback) : fallback;
}

function importCreatorsCsv() {
  readCsvFile((rows) => {
    const headers = rows[0];
    let imported = 0;
    let skipped = 0;
    rows.slice(1).forEach((row) => {
      const username = rowValue(row, headers, ["username", "tiktok_username", "TikTok用户名", "达人账号", "达人"]).replace(/^@/, "").trim();
      if (!username) {
        skipped += 1;
        return;
      }
      const existing = state.creators.find((x) => x.username.toLowerCase() === username.toLowerCase());
      const payload = {
        id: existing?.id || Date.now() + imported,
        username,
        nickname: rowValue(row, headers, ["nickname", "昵称", "达人昵称"], existing?.nickname || ""),
        type: normalizeCreatorType(rowValue(row, headers, ["type", "creator_type", "达人类型"], existing?.type || "短视频达人")),
        category: rowValue(row, headers, ["category", "类目"], existing?.category || "未分类"),
        region: rowValue(row, headers, ["region", "地区", "国家"], existing?.region || ""),
        followers: Number(String(rowValue(row, headers, ["followers", "粉丝", "粉丝数"], existing?.followers || 0)).replaceAll(",", "")) || 0,
        gmv: rowValue(row, headers, ["gmv", "近30天GMV"], existing?.gmv || ""),
        replyRate: rowValue(row, headers, ["replyRate", "reply_rate", "回复率"], existing?.replyRate || ""),
        tags: normalizeCreatorTags(rowValue(row, headers, ["tags", "标签"], (existing?.tags || []).join(",")).split(/[，,]/).map((x) => x.trim()).filter(Boolean)),
        status: existing?.status || "待联系",
        email: rowValue(row, headers, ["email", "邮箱"], existing?.email || ""),
        whatsapp: rowValue(row, headers, ["whatsapp", "WhatsApp", "wa"], existing?.whatsapp || ""),
        notes: rowValue(row, headers, ["notes", "备注"], existing?.notes || ""),
      };
      if (existing) state.creators = state.creators.map((x) => x.id === existing.id ? payload : x);
      else state.creators.push(payload);
      imported += 1;
    });
    state.systemMessages.unshift({ id: Date.now(), type: "KOL导入", text: `CSV 导入完成：${imported} 条，跳过 ${skipped} 条。`, at: nowText(), read: false });
    saveState();
    render();
    alert(`KOL CSV 导入完成：${imported} 条，跳过 ${skipped} 条`);
  });
}

function importCoopsCsv() {
  readCsvFile((rows) => {
    const headers = rows[0];
    let imported = 0;
    let skipped = 0;
    rows.slice(1).forEach((row) => {
      const username = rowValue(row, headers, ["username", "tiktok_username", "TikTok用户名", "达人账号", "达人"]).replace(/^@/, "").trim();
      const productName = rowValue(row, headers, ["product", "product_name", "产品", "产品名称"]).trim();
      const c = state.creators.find((x) => x.username.toLowerCase() === username.toLowerCase());
      const p = state.products.find((x) => x.name === productName) || state.products[0];
      if (!c || !p) {
        skipped += 1;
        return;
      }
      const videos = Number(rowValue(row, headers, ["videos", "视频数"], 0)) || 0;
      const lives = Number(rowValue(row, headers, ["lives", "直播场次"], 0)) || 0;
      const status = rowValue(
        row,
        headers,
        ["status", "内容状态", "合作状态"],
        videos > 0 && lives > 0 ? "视频+直播" : videos > 0 ? "已发视频" : lives > 0 ? "已直播" : "待产出",
      );
      state.cooperations.push({
        id: Date.now() + imported,
        creatorId: c.id,
        productId: p.id,
        type: rowValue(row, headers, ["type", "合作类型"], videos > 0 && lives > 0 ? "短视频+直播" : lives > 0 ? "直播" : "短视频"),
        status,
        dueDate: rowValue(row, headers, ["dueDate", "due_date", "截止日", "产出截止日"], ""),
        videos,
        lives,
        orders: Number(rowValue(row, headers, ["orders", "订单", "订单数"], 0)) || 0,
        gmv: Number(String(rowValue(row, headers, ["gmv", "GMV"], 0)).replaceAll(",", "").replace("$", "")) || 0,
        commission: Number(String(rowValue(row, headers, ["commission", "佣金"], 0)).replaceAll(",", "").replace("$", "")) || 0,
        adSpend: Number(String(rowValue(row, headers, ["adSpend", "ad_spend", "投流"], 0)).replaceAll(",", "").replace("$", "")) || 0,
        contentUrl: rowValue(row, headers, ["contentUrl", "content_url", "内容链接"], ""),
        tags: rowValue(row, headers, ["tags", "标签"], "").split(/[，,]/).map((x) => x.trim()).filter(Boolean),
        owner: rowValue(row, headers, ["owner", "负责人"], ""),
        notes: rowValue(row, headers, ["notes", "备注"], ""),
      });
      c.status = "已合作";
      imported += 1;
    });
    state.systemMessages.unshift({ id: Date.now(), type: "合作导入", text: `CSV 导入完成：${imported} 条，跳过 ${skipped} 条。`, at: nowText(), read: false });
    saveState();
    render();
    alert(`合作 CSV 导入完成：${imported} 条，跳过 ${skipped} 条`);
  });
}

function resetDemo() {
  if (!confirm("确认清空本地数据？真实 TikTok 授权和后端平台达人库不会删除。")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  render();
}

function escapeJs(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

window.setPage = setPage;
window.setFilter = setFilter;
window.toggleMultiFilter = toggleMultiFilter;
window.clearMultiFilter = clearMultiFilter;
window.resetKolFilters = resetKolFilters;
window.dashboardGo = dashboardGo;
window.showCreator = showCreator;
window.syncProducts = syncProducts;
window.syncCoopData = syncCoopData;
window.refreshPlatformCreatorLibrary = refreshPlatformCreatorLibrary;
window.checkTikTokBackend = checkTikTokBackend;
window.startTikTokAuth = startTikTokAuth;
window.checkTikTokShops = checkTikTokShops;
window.selectTikTokShop = selectTikTokShop;
window.markMessageRead = markMessageRead;
window.markAllMessagesRead = markAllMessagesRead;
window.deleteMessage = deleteMessage;
window.simulateConnect = simulateConnect;
window.saveApiSettings = saveApiSettings;
window.markApiAuthBlocked = markApiAuthBlocked;
window.showApiHandoffSteps = showApiHandoffSteps;
window.approveMerchantApplication = approveMerchantApplication;
window.rejectMerchantApplication = rejectMerchantApplication;
window.resetMerchantApplication = resetMerchantApplication;
window.toggleFeatureSwitch = toggleFeatureSwitch;
window.selectPlan = selectPlan;
window.addProduct = addProduct;
window.openProductModal = openProductModal;
window.goProductCoops = goProductCoops;
window.goProductOutreach = goProductOutreach;
window.markNotInterested = markNotInterested;
window.clearNotInterested = clearNotInterested;
window.toggleCreatorSelection = toggleCreatorSelection;
window.toggleCreatorPageSelection = toggleCreatorPageSelection;
window.setKolPage = setKolPage;
window.setKolPageSize = setKolPageSize;
window.openOutreachModal = openOutreachModal;
window.saveOutreach = saveOutreach;
window.translateOutreachDraft = translateOutreachDraft;
window.openEmailSetupModal = openEmailSetupModal;
window.saveEmailSettings = saveEmailSettings;
window.copyInviteLink = copyInviteLink;
window.openReplyModal = openReplyModal;
window.saveReply = saveReply;
window.openCoopModal = openCoopModal;
window.saveCoop = saveCoop;
window.addCoopTag = addCoopTag;
window.markOverdue = markOverdue;
window.advanceOutreach = advanceOutreach;
window.markOutreachApiSubmitted = markOutreachApiSubmitted;
window.createSampleFromOutreach = createSampleFromOutreach;
window.createCoopFromOutreach = createCoopFromOutreach;
window.deleteOutreach = deleteOutreach;
window.openSampleModal = openSampleModal;
window.saveSample = saveSample;
window.createCoopFromSample = createCoopFromSample;
window.deleteSample = deleteSample;
window.openAutoReplyModal = openAutoReplyModal;
window.saveAutoReply = saveAutoReply;
window.toggleAutoReply = toggleAutoReply;
window.deleteAutoReply = deleteAutoReply;
window.openAutoReplyTest = openAutoReplyTest;
window.runAutoReplyTest = runAutoReplyTest;
window.openTemplateModal = openTemplateModal;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.restoreCreator = restoreCreator;
window.openTeamMemberModal = openTeamMemberModal;
window.saveTeamMember = saveTeamMember;
window.toggleTeamMember = toggleTeamMember;
window.exportState = exportState;
window.importState = importState;
window.importCoopsCsv = importCoopsCsv;
window.resetDemo = resetDemo;
window.closeModal = closeModal;

window.addEventListener("hashchange", () => {
  applyRoute();
  render();
});

render();
setTimeout(() => loadPlatformCreatorLibrary({ silent: true }), 0);
