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
  ]],
  ["系统", [
    ["team", "账号与团队"],
    ["billing", "订阅计费"],
    ["admin", "平台设置"],
  ]],
];

const pageKeys = new Set([...pages.flatMap(([, items]) => items.map(([key]) => key)), "outreachWorkbench", "conversation", "messages"]);
const PLATFORM_ONLY_PAGES = new Set(["admin"]);
const fixedTags = ["高ROI", "可复投", "需催发", "内容优质", "低效合作"];
const outputStatuses = ["全部", "待产出", "已发视频", "已直播", "视频+直播", "逾期未产出", "有订单未匹配内容", "合作结束"];
const creatorTypeOptions = ["短视频达人", "直播达人", "短视频+直播达人"];
// 官方 TikTok Shop L1 类目（canonical）。达人类目一律映射到这套，避免脏变体/拼接串污染筛选。
const tiktokCategoryOptions = ["美妆个护", "食品饮料", "女装与内衣", "男装与内衣", "手机数码", "家居日用", "健康保健", "时尚配饰", "箱包", "家用电器", "户外运动", "母婴用品", "厨房用品", "鞋靴", "家纺布艺", "珠宝配饰", "宠物用品", "家具", "电脑办公", "穆斯林时尚", "童装童鞋", "汽车摩托", "工具五金", "家装维修", "玩具爱好", "收藏品", "图书文具", "其他"];
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
const gmvRangeOptions = ["<10K", "10K-100K", "100K-1M", ">1M", "有GMV", "无GMV"];
const contactOptions = ["有Email", "无联系方式"];
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
  selectedConversationId: null,
  bulkCreatorIds: [],
  outreachDraft: {
    creatorIds: [],
    updatedAt: "",
  },
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
    emailAppPassword: "",
    emailAppPasswordConfigured: false,
    planName: "专业版",
    featureSwitches: {
      tiktokMessaging: true,
      emailMessaging: true,
      translation: true,
      stripePayment: false,
    },
    demoDataClearedVersion: 2,
    viewRole: "B端",
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

// 开箱即用的默认消息模板（客户可直接用/改/加）。发送时 {变量} 自动替换。
const DEFAULT_TEMPLATES = [
  { name: "首次建联邀约", channel: "TikTok私信", content: "Hi {KOL名称}，我们想邀请你合作 {产品名称}，佣金 {联盟佣金率}。产品很适合你的粉丝，方便的话我把样品和合作详情发给你？" },
  { name: "跟进未回复", channel: "TikTok私信", content: "Hi {KOL名称}，上次关于 {产品名称} 的合作不知道你看到了吗？我们可以先寄样品给你试用，有兴趣随时回复我～" },
  { name: "寄样确认", channel: "Email", content: "Hi {KOL名称}，很高兴合作 {产品名称}！请把收件人、电话和地址发我，我们尽快安排寄样。" },
  { name: "报价与佣金", channel: "TikTok私信", content: "Hi {KOL名称}，{产品名称} 的佣金是 {联盟佣金率}，另有内容奖励。需要的话我把完整合作方案发你。" },
  { name: "婉拒 / 感谢", channel: "TikTok私信", content: "Hi {KOL名称}，感谢你的回复！这次可能先不合适，后续有适合你的产品我再联系你，祝顺利～" },
];

// 开箱即用的默认自动回复规则（客户可直接用/改/加）。
// 关键词写中文即可：达人来信会先翻译成中文再匹配。
const DEFAULT_AUTO_REPLIES = [
  { name: "达人表示感兴趣", matchType: "包含关键词", keywords: "感兴趣,可以,想了解,报价,好的,行", replyContent: "感谢你的兴趣！我整理一下合作详情和样品安排马上发给你～", priority: 10, enabled: true },
  { name: "询问佣金 / 价格", matchType: "包含关键词", keywords: "佣金,价格,多少钱,费用,抽成,提成", replyContent: "我们的佣金和样品政策我整理好马上发你，也可以先看下我附带的邀约卡。", priority: 20, enabled: true },
  { name: "暂不合作（礼貌婉拒）", matchType: "包含关键词", keywords: "不需要,暂时不,没兴趣,以后,拒绝,不合适", replyContent: "完全理解！如果后续有兴趣随时联系我们，祝一切顺利～", priority: 30, enabled: false },
];

// 一次性注入默认模板/自动回复（独立于演示数据清理；只在没配过时注入一次）。
function seedDefaultsOnce(merged) {
  if (merged.settings.defaultsSeededVersion === 1) return;
  if (!Array.isArray(merged.templates) || !merged.templates.length) {
    merged.templates = DEFAULT_TEMPLATES.map((t, i) => ({ id: Date.now() + i, ...t }));
  }
  if (!Array.isArray(merged.autoReplies) || !merged.autoReplies.length) {
    merged.autoReplies = DEFAULT_AUTO_REPLIES.map((r, i) => normalizeAutoReply({ id: Date.now() + 1000 + i, ...r }));
  }
  merged.settings.defaultsSeededVersion = 1;
}

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
  if (!merged.outreachDraft || typeof merged.outreachDraft !== "object") merged.outreachDraft = { creatorIds: [], updatedAt: "" };
  if (!Array.isArray(merged.outreachDraft.creatorIds)) merged.outreachDraft.creatorIds = [];
  if (!Array.isArray(merged.targetCollaborations)) merged.targetCollaborations = [];
  if (!Array.isArray(merged.syncLogs)) merged.syncLogs = [];
  if (!Array.isArray(merged.operationLogs)) merged.operationLogs = [];
  if (Array.isArray(merged.creators)) merged.creators = merged.creators.map(normalizeCreatorRecord);
  seedDefaultsOnce(merged);
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
    matchType: rule.matchType === "完全匹配" ? "完全匹配" : "包含关键词",
    keywords: rule.keywords || String(rule.condition || "").replace(/^包含\s*/, ""),
    priority: Number(rule.priority || 50),
    replyType: rule.replyType === "图片" ? "图片" : "文本",
    replyContent: rule.replyContent || rule.action || "",
    replyImageUrl: rule.replyImageUrl || "",
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

function toggleViewRole() {
  state.settings.viewRole = (state.settings.viewRole || "B端") === "平台方" ? "B端" : "平台方";
  if (state.settings.viewRole === "B端" && PLATFORM_ONLY_PAGES.has(state.page)) {
    navigateHash("dashboard");
    return;
  }
  saveState();
  render();
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
  if (!last) return false;
  // 只有真正成功发出的建联才触发 24 小时冷却；失败 / 未提交 / 测试不锁
  const sentStatuses = ["待回复", "待我方回复", "已转合作", "已发送"];
  return sentStatuses.includes(last.status) && hoursSince(last.updatedAt) < 24;
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
  if (range === "<10K") return value > 0 && value < 10000;
  if (range === "10K-100K") return value >= 10000 && value < 100000;
  if (range === "100K-1M") return value >= 100000 && value < 1000000;
  if (range === ">1M") return value >= 1000000;
  if (range === "有GMV") return value > 0 || (gmv && gmv !== "-");
  if (range === "无GMV") return !value && (!gmv || gmv === "-");
  return true;
}

// GMV 官方 K/M 口径（10K / 200K / 1.5M），B 端按 TikTok 习惯看
function gmvCompact(n) {
  n = Number(n) || 0;
  if (n <= 0) return "-";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}
function creatorGmvDisplay(gmv) {
  const text = String(gmv || "-").trim();
  if (!text || text === "-") return "-";
  // 单值(可带货币前缀，如 "USD 104,486" / "200000" / "10K") → 压成官方 K/M 口径
  const m = text.match(/^([A-Za-z$¥₫]{0,4})\s*([\d.,]+)\s*([KMB]?)\s*\+?$/);
  if (m) {
    const prefix = (m[1] || "").trim();
    let num = parseFloat(m[2].replace(/,/g, ""));
    const unit = (m[3] || "").toUpperCase();
    if (unit === "K") num *= 1e3; else if (unit === "M") num *= 1e6; else if (unit === "B") num *= 1e9;
    if (num >= 1000) return (prefix ? prefix + " " : "") + gmvCompact(num);
    if (num > 0) return (prefix ? prefix + " " : "") + Math.round(num);
  }
  return normalizeGmvDisplay(text);
}
// 回复率展示：legacy 没有时显示 "-"，不露 undefined
function creatorReplyRateDisplay(v) {
  if (v === undefined || v === null || v === "" || v === "undefined" || v === "-") return "-";
  return String(v);
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

// 紧凑数字：5万 / 20.5万 / 1.2亿（中文阅读习惯，列不再拖那么长）
function compactCount(n) {
  n = Number(n) || 0;
  if (n <= 0) return "0";
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "千";
  return String(Math.round(n));
}
function creatorMetricValue(c, key) {
  const value = metricNumber(c?.[key]);
  return value ? compactCount(value) : "-";
}

function creatorVisibleTags(c) {
  return normalizeCreatorTags(c?.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
}

// 头像走后端缓存端点（解决 TikTok 签名链接过期/防盗链裂图）；无头像→空串走首字母
function creatorAvatarSrc(c) {
  // 用 username 当 key（前端 id 是重排序号，跨刷新会错位→头像全裂）
  return c && c.avatarUrl && c.username ? `${API_BASE}/api/avatar?cid=${encodeURIComponent(c.username)}` : "";
}
// 达人 TikTok 主页链接（B 端自行核对）：优先真实 url，否则用 username 构造
function creatorProfileUrl(c) {
  if (!c) return "";
  return c.profileUrl || c.sourceUrl || (c.username ? `https://www.tiktok.com/@${encodeURIComponent(String(c.username).replace(/^@/, ""))}` : "");
}
function creatorPortrait(c, className = "creator-portrait") {
  if (!c) return `<span class="${className}">?</span>`;
  const initial = escapeHtml(String(c.username || c.nickname || "?").slice(0, 1).toUpperCase());
  const src = creatorAvatarSrc(c);
  return src
    ? `<span class="${className}"><img src="${escapeHtml(src)}" alt="${escapeHtml(c.username || c.nickname || "达人头像")}" loading="lazy" onerror="this.parentNode.textContent='${initial}'" /></span>`
    : `<span class="${className}">${initial}</span>`;
}

function creatorContactOk(c, filter) {
  const hasEmail = Boolean(c?.email);
  if (filter === "有Email") return hasEmail;
  if (filter === "无联系方式") return !hasEmail;
  return true;
}

function creatorHasDetail(c) {
  return Boolean(c?.email || c?.whatsapp);
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
  const raw = [c?.category, ...(Array.isArray(c?.categoryLabels) ? c.categoryLabels : [])];
  // 拼接串(逗号/分号/斜杠/顿号)拆开，每个归一到官方 L1
  const parts = raw.flatMap((v) => String(v || "").split(/[,;；/、]/));
  return Array.from(new Set(parts.map(normalizeCreatorCategoryLabel).filter(Boolean)));
}

// 类目归一：越南语 + 中文各种变体 → 官方 L1（tiktokCategoryOptions）
const CREATOR_CATEGORY_SYNONYMS = {
  // 越南语
  "Sửa chữa nhà cửa": "家装维修", "Sữa chữa nhà cửa": "家装维修",
  "Công cụ & Phần cứng": "工具五金", "Máy tính & Thiết bị Văn phòng": "电脑办公",
  "Bộ sưu tập": "收藏品", "Thời trang Hồi giáo": "穆斯林时尚",
  "Phụ kiện trang sức & Phái sinh": "珠宝配饰",
  // 中文变体 → 官方
  "女装内衣": "女装与内衣", "女装与女士内衣": "女装与内衣",
  "男装内衣": "男装与内衣", "男装与男士内衣": "男装与内衣",
  "3C": "手机数码", "手机与数码": "手机数码",
  "居家用品": "家居日用", "居家": "家居日用",
  "保健品": "健康保健", "健康": "健康保健",
  "家电": "家用电器",
  "运动与户外": "户外运动",
  "母婴": "母婴用品",
  "厨房用具": "厨房用品",
  "鞋": "鞋靴",
  "家纺": "家纺布艺",
  "珠宝首饰": "珠宝配饰", "珠宝与衍生品": "珠宝配饰",
  "宠物": "宠物用品",
  "儿童时尚": "童装童鞋",
  "汽车与摩托车": "汽车摩托",
  "五金工具": "工具五金",
  "家装建材": "家装维修", "家装": "家装维修",
  "玩具": "玩具爱好", "玩具和爱好": "玩具爱好",
  "二手收藏": "收藏品",
  "图书": "图书文具", "图书音像": "图书文具", "杂志&音频": "图书文具", "图书文娱": "图书文具",
  "其它": "其他", "TikTok Shop": "",
};
function normalizeCreatorCategoryLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (Object.prototype.hasOwnProperty.call(CREATOR_CATEGORY_SYNONYMS, text)) return CREATOR_CATEGORY_SYNONYMS[text];
  if (tiktokCategoryOptions.includes(text)) return text;
  return "其他"; // 官方类目之外（如 voucher）一律归到「其他」
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
  const role = state.settings.viewRole || "B端";
  const nav = pages.map(([group, items]) => {
    const visible = items.filter(([key]) => role === "平台方" || !PLATFORM_ONLY_PAGES.has(key));
    if (!visible.length) return "";
    return `
      <div class="nav-group-title">${group}</div>
      ${visible.map(([key, label]) => `
        <button class="nav-item ${state.page === key ? "active" : ""}" onclick="setPage('${key}')">
          ${svgIcon(key)}<span>${label}</span>
        </button>
      `).join("")}`;
  }).join("");
  const unread = (state.systemMessages || []).filter((m) => !m.read).length;

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
            <button class="btn" onclick="toggleViewRole()" title="切换平台方/B端视图（平台方=你能看全部；B端=商家看到的）">${role === "平台方" ? "👁 平台方视图" : "👁 B端视图"}</button>
            <button class="btn topbar-bell ${state.page === "messages" ? "active" : ""}" onclick="setPage('messages')" title="系统消息">🔔 系统消息${unread ? `<span class="bell-badge">${unread}</span>` : ""}</button>
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
  // —— 北极星漏斗（按达人数去重）：触达→回复→寄样→产出→出单→复投 + 三个率 ——
  const nsUniq = (arr) => new Set(arr.map((x) => x.creatorId).filter(Boolean));
  const nsRepliedStatuses = new Set(["待我方回复", "已回复", "洽谈中", "已成交", "合作中"]);
  const nsReached = nsUniq(dashboardOutreach);
  const nsReplied = nsUniq(dashboardOutreach.filter((x) => nsRepliedStatuses.has(x.status)));
  const nsSampled = nsUniq(dashboardSamples);
  const nsProduced = nsUniq(dashboardCoops.filter((x) => x.videos > 0 || x.lives > 0));
  const nsOrdered = nsUniq(dashboardCoops.filter((x) => Number(x.gmv || 0) > 0 || Number(x.orders || 0) > 0));
  const nsCoopCount = {};
  dashboardCoops.forEach((x) => { if (x.creatorId) nsCoopCount[x.creatorId] = (nsCoopCount[x.creatorId] || 0) + 1; });
  const nsRepeat = new Set([...nsOrdered].filter((id) => nsCoopCount[id] > 1));
  const nsPct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const nsRateColor = (r) => (r >= 30 ? "#15803d" : r >= 10 ? "#b45309" : "#64748b");
  const nsRateCard = (label, rate, sub, help) => `
    <div class="card" style="flex:1;min-width:150px;text-align:center;padding:14px">
      <div style="font-size:28px;font-weight:800;color:${nsRateColor(rate)}">${rate}%</div>
      <div style="font-weight:600;margin-top:2px">${label}</div>
      <div class="muted" style="font-size:12px;margin-top:4px">${sub}</div>
      <div class="muted" style="font-size:11px;margin-top:2px">${help}</div>
    </div>`;
  const nsFunnel = [
    { k: "触达", v: nsReached.size, go: "dashboardGo('outreach','outreachStatus','全部')" },
    { k: "回复", v: nsReplied.size, go: "dashboardGo('outreach','outreachStatus','待我方回复')" },
    { k: "寄样", v: nsSampled.size, go: "dashboardGo('samples')" },
    { k: "产出", v: nsProduced.size, go: "dashboardGo('cooperations','coopOutput','已产出')" },
    { k: "出单", v: nsOrdered.size, go: "dashboardGo('cooperations','coopStatus','全部')" },
    { k: "复投", v: nsRepeat.size, go: "dashboardGo('cooperations','coopStatus','全部')" },
  ];
  const nsFunnelHtml = nsFunnel.map((s, i) => `
    <div onclick="${s.go}" style="cursor:pointer;flex:1;min-width:82px;text-align:center;padding:12px 8px;background:linear-gradient(180deg,#eff6ff,#ffffff);border:1px solid #dbeafe;border-radius:10px">
      <div style="font-size:22px;font-weight:700;color:#1d4ed8">${s.v}</div>
      <div class="muted" style="font-size:12px">${s.k}</div>
    </div>${i < nsFunnel.length - 1 ? '<div style="display:flex;align-items:center;color:#94a3b8;font-weight:700;font-size:18px">›</div>' : ""}`).join("");
  const northStarCard = `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0">🌟 北极星漏斗 · ${range}</h3>
        <span class="muted">按达人数去重统计（回复率 / 样品成功率 / 成交率）</span>
      </div>
      <div style="display:flex;gap:12px;margin:12px 0;flex-wrap:wrap">
        ${nsRateCard("回复率", nsPct(nsReplied.size, nsReached.size), `${nsReplied.size}/${nsReached.size} 达人回复`, "回复达人 ÷ 触达达人")}
        ${nsRateCard("样品成功率", nsPct(nsProduced.size, nsSampled.size), `${nsProduced.size}/${nsSampled.size} 达人产出`, "产出内容达人 ÷ 寄样达人")}
        ${nsRateCard("成交率", nsPct(nsOrdered.size, nsReached.size), `${nsOrdered.size}/${nsReached.size} 达人出单`, "出单达人 ÷ 触达达人 · <span style='color:#b45309'>联盟订单API待接,暂按合作台账</span>")}
      </div>
      <div style="display:flex;align-items:stretch;gap:6px;overflow-x:auto;padding-bottom:4px">${nsFunnelHtml}</div>
    </div>`;
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
    ${northStarCard}
    <div class="grid grid-4">
      ${stat(`${range}建联数`, totalOutreach, "进入建联记录查看明细", "dashboardGo('outreach','outreachStatus','全部')")}
      ${stat("待我方回复", replied, "需要 BD 处理", "dashboardGo('outreach','outreachStatus','待我方回复')")}
      ${stat("合作中 KOL", activeCoops, owner === "全部" ? "全部负责人" : `负责人：${owner}`, "dashboardGo('cooperations','coopStatus','全部')")}
      ${stat("寄样中", sampleOpen, "待审核/待发货/运输中", "dashboardGo('samples')")}
      ${stat(`${range}预估 GMV`, money(gmv), "仅统计合作管理中的归因 GMV", "dashboardGo('cooperations','coopStatus','全部')")}
      ${stat("已产出合作", output, "视频或直播数大于 0", "dashboardGo('cooperations','coopOutput','已产出')")}
      ${stat("逾期未产出", dashboardCoops.filter((x) => x.status === "逾期未产出").length, "需要催发或终止", "dashboardGo('cooperations','coopStatus','逾期未产出')")}
      ${stat("店铺连接状态", state.settings.apiStatus, "未连接时仅显示本地台账", "dashboardGo('admin')")}
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
        <h3>TikTok 店铺连接状态</h3>
        <div class="notice">
          系统只展示已授权店铺返回的数据。你已登录 Partner 账号时，可以从“平台设置”查看接入前置条件；授权、权限审批、验证码和回调配置需要人工完成。
        </div>
        <div style="margin-top:12px">
          <button class="btn primary" onclick="setPage('admin')">去平台设置</button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts() {
  const shops = state.settings.tiktokShops || [];
  const selectedShop = shops.find((shop) => shopCipher(shop) === state.settings.selectedTikTokShopCipher) || shops[0];
  maybeAutoSyncProducts();
  const productStatusFilter = state.filters.productStatus || "全部";
  const rows = state.products.filter((p) => {
    if (productStatusFilter === "可用" && !productPromotable(p)) return false;
    if (productStatusFilter === "不可用" && productPromotable(p)) return false;
    const kw = state.filters.productSearch.trim().toLowerCase();
    if (!kw) return true;
    if (state.filters.productSearchField === "商品ID") return String(p.sourceId || p.id || "").toLowerCase().includes(kw);
    return String(p.name || "").toLowerCase().includes(kw);
  });
  const activeCount = rows.filter((p) => productPromotable(p)).length;
  const pageSize = Number(state.filters.productPageSize) || 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(state.filters.productPage) || 1), totalPages);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return `
    ${pageHead("产品管理", "第一步绑定店铺并读取商品；第二步进入达人库筛选达人并发起建联。", `<button class="btn primary" onclick="setPage('kol')">下一步：筛选达人</button>`)}
    <section class="store-panel">
      <div>
        <div class="section-kicker">TikTok Shop 授权</div>
        <h3>${escapeHtml(selectedShop ? shopLabel(selectedShop) : "尚未绑定店铺")}</h3>
        <p>${shops.length ? `已授权 ${shops.length} 个店铺，当前商品源会自动用于建联、寄样和合作流程。下一步进入达人库同步并筛选 TikTok 达人。` : "完成店铺授权后，系统会自动同步店铺、商品，并开放达人库同步入口。"}</p>
        <div class="store-meta">
          <span>连接状态：${escapeHtml(state.settings.tiktokBackendStatus || "未检查")}</span>
          <span>上次同步：${escapeHtml(state.settings.lastProductSync)}</span>
        </div>
      </div>
      <div class="store-actions">
        ${shops.length ? `
          <select class="select" onchange="switchTikTokShop(this.value)">
            ${shops.map((shop) => {
              const cipher = shopCipher(shop);
              return `<option value="${escapeHtml(cipher)}" ${cipher === state.settings.selectedTikTokShopCipher ? "selected" : ""}>${escapeHtml(shopLabel(shop))}</option>`;
            }).join("")}
          </select>
          <button class="btn primary" onclick="startTikTokAuth()">+ 添加店铺</button>
          <button class="btn" onclick="setPage('admin')">店铺授权管理</button>
          <button class="btn" onclick="syncProducts()">重新同步商品</button>
          <button class="btn" onclick="setPage('kol')">进入达人库</button>
        ` : `
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
          <button class="btn" onclick="setPage('admin')">接入配置</button>
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
        <input id="productSearchInput" class="input product-search-input" placeholder="请输入" value="${escapeHtml(state.filters.productSearch)}" oninput="setFilter('productSearch', this.value)" />
        <select class="select compact-select" onchange="setFilter('productStatus', this.value)">
          ${["全部", "可用", "不可用"].map((x) => `<option ${productStatusFilter === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
      <div class="filters">
        <button class="btn" onclick="addProduct()">商品来源说明</button>
      </div>
    </div>
    ${productList(pagedRows)}
    ${rows.length > pageSize ? paginationBar("product", currentPage, totalPages, pageSize, rows.length, { unit: "个商品", onPage: "setProductPage", onSize: "setProductPageSize" }) : ""}
    </div>
  `;
}

// ——— 建联前：出单潜力分（全自动，纯用已有数据，不要求客户录入） ———
// 从字符串/范围里取数字（gmv 可能是 "S$0-S$100"、replyRate 可能是 "60%"）
function scoreNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const m = String(v ?? "").replace(/,/g, "").match(/[\d.]+/g);
  if (!m) return 0;
  const nums = m.map(Number).filter((x) => Number.isFinite(x));
  return nums.length ? Math.max(...nums) : 0;
}

// 对数归一到 0-100：value 达到 fullAt 记满分（粉丝/GMV/播放这类长尾量用对数更合理）
function logScore(value, fullAt) {
  const v = Math.max(0, scoreNum(value));
  if (v <= 0) return 0;
  const s = (Math.log10(v + 1) / Math.log10(fullAt + 1)) * 100;
  return Math.max(0, Math.min(100, s));
}

function merchantProductCategories() {
  const set = new Set();
  (state.products || []).forEach((p) => { if (p.category) set.add(String(p.category)); });
  return set;
}

// 内容主题(扩展采集，英/中) → 官方类目。用于"内容实证契合"
const TOPIC_TO_CATEGORY = {
  beauty: "美妆个护", skincare: "美妆个护", makeup: "美妆个护", hair: "美妆个护", nails: "美妆个护", fragrance: "美妆个护",
  fashion: "时尚配饰", outfit: "女装与内衣", haul: "女装与内衣",
  food: "食品饮料", recipe: "食品饮料",
  home: "家居日用", kitchen: "厨房用品",
  tech: "手机数码", gadget: "手机数码",
  pet: "宠物用品", baby: "母婴用品", mom: "母婴用品",
  fitness: "户外运动", health: "健康保健", supplement: "健康保健",
  "美妆": "美妆个护", "护肤": "美妆个护", "穿搭": "时尚配饰", "美食": "食品饮料",
  "母婴": "母婴用品", "宠物": "宠物用品", "健康": "健康保健", "数码": "手机数码", "居家": "家居日用",
};
function creatorHasContentData(c) {
  return Boolean((c?.contentTopics && c.contentTopics.length) || (c?.recentCaptions && c.recentCaptions.length) || c?.bio || c?.recentPerf || c?.commentIntent);
}
// 达人近期内容实际涉及的品类（扩展采集的 topics + bio/文案关键词扫描）
function creatorContentCategories(c) {
  const out = new Set();
  (c?.contentTopics || []).forEach((t) => { const cat = TOPIC_TO_CATEGORY[String(t).toLowerCase()]; if (cat) out.add(cat); });
  const blob = [c?.bio || "", ...(c?.recentCaptions || [])].join(" ").toLowerCase();
  Object.keys(TOPIC_TO_CATEGORY).forEach((k) => { if (blob.includes(k.toLowerCase())) out.add(TOPIC_TO_CATEGORY[k]); });
  return Array.from(out);
}

// 产品名 → 关键词：给扩展做"内容贴近你的产品"的产品级匹配（不只大类目）。
// 去营销噪声词，保留有辨识度的名词（英文 token + 中文整词/双字）。
// 停用词：功能词 + 营销修饰词，绝不当产品关键词（避免 and/power/can 这种垃圾命中）
const PRODUCT_STOPWORDS = new Set(["the","and","for","with","without","from","your","you","our","this","that","these","those","are","was","can","will","just","not","all","any","per","via","new","now","get","got","use","used","using","one","two","set","pcs","pack","kit","piece","pieces","size","sizes","sized","color","colour","colors","style","type","item","items","free","hot","sale","best","top","good","great","super","more","most","plus","pro","max","mini","big","small","large","light","soft","high","low","off","out","has","have","its","only","each","portable","electric","rechargeable","wireless","waterproof","premium","quality","original","multi","multifunction","multifunctional","adjustable","foldable","compact","pocket","powerful","power","airflow","usb","led","gift","home","fashion","women","men","unisex","kids","brand","cute","ml","cm","mm","inch","pin","deal","deals","promo","code","voucher","discount","offer","offers","link","buy","shop","store","official","order","cart","price","cheap","seller","ready","stock","restock","local","fast","delivery","shipping","ship","review","haul","unboxing","tiktok","shopee","lazada"]);
function productNamesToKeywords(names) {
  const kw = new Set();
  for (const name of names || []) {
    const lower = String(name || "").toLowerCase();
    // 英文 token：>=3 字母、非停用词、非纯数字 → 留产品核心词
    (lower.match(/[a-z][a-z0-9]{2,}/g) || []).forEach((t) => { if (!PRODUCT_STOPWORDS.has(t) && !/^\d+$/.test(t)) kw.add(t); });
    // 中文整词（>=2 字）+ 双字 gram，便于近似命中
    (lower.match(/[一-龥]{2,}/g) || []).forEach((seg) => {
      kw.add(seg);
      for (let i = 0; i + 2 <= seg.length; i++) kw.add(seg.slice(i, i + 2));
    });
  }
  return [...kw].slice(0, 120);
}

// 店铺产品关键词（核验后做产品级精准契合用）
function merchantProductKeywords() {
  const names = [...new Set((state.products || []).map((p) => String(p.name || p.title || "").trim()).filter(Boolean))].slice(0, 60);
  return productNamesToKeywords(names);
}
// 达人内容（带货商品名+文案+话题）拆关键词（过停用词）
function creatorContentKeywords(c) {
  const p = c && c.recentPerf;
  const blob = [
    (p && Array.isArray(p.ecProductNames) ? p.ecProductNames.join(" ") : ""),
    (c && Array.isArray(c.contentTopics) ? c.contentTopics.join(" ") : ""),
    (c && Array.isArray(c.recentCaptions) ? c.recentCaptions.join(" ") : ""),
  ].join(" ").toLowerCase();
  const out = new Set();
  (blob.match(/[a-z][a-z0-9]{2,}/g) || []).forEach((t) => { if (!PRODUCT_STOPWORDS.has(t) && !/^\d+$/.test(t)) out.add(t); });
  (blob.match(/[一-龥]{2,}/g) || []).forEach((seg) => { out.add(seg); for (let i = 0; i + 2 <= seg.length; i++) out.add(seg.slice(i, i + 2)); });
  return [...out];
}
const kcStem = (w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
function kcTokenSet(blob) {
  const out = new Set();
  const lower = String(blob || "").toLowerCase();
  (lower.match(/[a-z][a-z0-9]{2,}/g) || []).forEach((t) => { if (!PRODUCT_STOPWORDS.has(t) && !/^\d+$/.test(t)) out.add(kcStem(t)); });
  (lower.match(/[一-龥]{2,}/g) || []).forEach((seg) => { for (let i = 0; i + 2 <= seg.length; i++) out.add(seg.slice(i, i + 2)); });
  return out;
}
function productShortName(name) {
  const en = (String(name).toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []).filter((t) => !PRODUCT_STOPWORDS.has(t));
  const zh = String(name).match(/[一-龥]{2,}/g) || [];
  if (zh.length) return zh.slice(0, 2).join("");
  return en.slice(0, 3).join(" ") || String(name).slice(0, 16);
}
// 产品级精准契合：核验过的达人，看 TA 在带/在发的东西贴近你哪个产品。返回匹配到的产品名（无内容则 null）
function creatorProductFitMatches(c) {
  if (!creatorHasContentData(c)) return null;
  const names = [...new Set((state.products || []).map((p) => String(p.name || p.title || "").trim()).filter(Boolean))];
  if (!names.length) return null;
  const terms = kcTokenSet([
    (c.recentPerf && Array.isArray(c.recentPerf.ecProductNames) ? c.recentPerf.ecProductNames.join(" ") : ""),
    (c.contentTopics || []).join(" "),
    (c.recentCaptions || []).join(" "),
  ].join(" "));
  const hits = [];
  for (const pname of names) {
    const pkw = [...kcTokenSet(pname)];
    if (!pkw.length) continue;
    const n = pkw.filter((k) => terms.has(k)).length;
    if (n >= 1) hits.push({ name: productShortName(pname), n });
  }
  hits.sort((a, b) => b.n - a.n);
  const seen = new Set();
  return hits.map((h) => h.name).filter((x) => x && !seen.has(x) && seen.add(x)).slice(0, 4);
}

// 品类"抓接近"：不靠补全映射表（全网类目太多维护不动），用字符相似度近似匹配。
// 处理两类脏数据：① 命名变体（健康/健康保健、家电/家用电器、居家日用/家居日用…）② 同义不同写。
function categorySimilarity(a, b) {
  // 去掉连接词 + 通用后缀(用品/用具)，抓核心词
  const clean = (s) => String(s || "").replace(/[与和的&\s]/g, "").replace(/(用品|用具)$/, "");
  a = clean(a); b = clean(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0; sa.forEach((ch) => { if (sb.has(ch)) inter++; });
  return (2 * inter) / (sa.size + sb.size); // 字符集 Dice 系数
}
// 一个达人类目 vs 一组店铺类目，取最佳相似度
function bestCategorySimilarity(v, merchantCats) {
  let best = 0;
  for (const m of merchantCats) { best = Math.max(best, categorySimilarity(v, m)); if (best >= 1) break; }
  return best;
}

// 类目契合：达人内容类目 vs 当前商家商品类目。无商品时返回 null（该项不计、权重摊回其它项）
// 内容实证契合(扩展采集)是最强信号：达人近期真的在发你这个品类 → 直接满分。
function creatorCategoryFitScore(c) {
  const cats = [...merchantProductCategories()];
  if (!cats.length) return null;
  // 产品级精准契合（核验后最强）：TA 在带/在发的东西命中你的产品关键词
  const prodMatches = creatorProductFitMatches(c);
  if (prodMatches && prodMatches.length) return 100;
  const contentCats = creatorContentCategories(c);
  if (contentCats.length) {
    // 内容实证：近似匹配上店铺品类 → 满分；明确发别的品类 → 强负信号
    return contentCats.some((v) => bestCategorySimilarity(v, cats) >= 0.7) ? 100 : 12;
  }
  const vals = creatorCategoryValues(c).map(String).filter(Boolean);
  if (!vals.length) return 25;
  const best = Math.max(0, ...vals.map((v) => bestCategorySimilarity(v, cats)));
  if (best >= 0.7) return 100; // 基本同类（含变体/缩写近似）
  if (best >= 0.45) return 70; // 接近
  return 25;
}

// 出单潜力分（0-100，出单/履约导向）。自有履约数据(1B回流后)有则纳入。
function creatorPotentialScore(c) {
  const sells = logScore(c.gmv, 50000);
  const reach = logScore(c.followers, 1000000) * 0.5 + logScore(c.avgVideoViews, 200000) * 0.5;
  // 回复率未知（"-"/空/无数字）时不计入——否则全库被一个 0 拖垮（建联前几乎没人有回复历史）
  const replyKnown = c.replyRate != null && String(c.replyRate).trim() !== "" && String(c.replyRate).trim() !== "-" && /\d/.test(String(c.replyRate));
  const reply = replyKnown ? Math.max(0, Math.min(100, scoreNum(c.replyRate))) : null;
  const fit = creatorCategoryFitScore(c);
  const fulfill = c.fulfillmentRate != null ? Math.max(0, Math.min(100, scoreNum(c.fulfillmentRate))) : null;
  let parts = [
    { key: "出单能力", v: sells, w: 0.35 },
    { key: "类目契合", v: fit, w: 0.25 },
    { key: "内容触达", v: reach, w: 0.20 },
    { key: "建联效率", v: reply, w: 0.20 },
  ];
  // 带货频率（扩展采集 item_list）：近期挂商品的视频越多→越懂带货、合作越易出单
  const perf = c.recentPerf;
  if (perf && Number(perf.sampleCount) > 0 && perf.ecVideoCount != null) {
    const ecScore = Math.max(0, Math.min(100, Number(perf.ecVideoCount || 0) * 25)); // 4 条带货 = 满分
    parts.push({ key: "带货频率", v: ecScore, w: 0.18 });
  }
  if (fulfill != null) parts.push({ key: "历史履约", v: fulfill, w: 0.15 });
  parts = parts.filter((p) => p.v != null);
  const wsum = parts.reduce((s, p) => s + p.w, 0) || 1;
  const score = Math.round(parts.reduce((s, p) => s + p.v * (p.w / wsum), 0));
  return { score: Math.max(0, Math.min(100, score)), parts };
}

// 合作档位（用户拍板）：≥65 建议建联 / 40-64 可考虑 / <40 谨慎
function scoreTier(score) {
  if (score >= 65) return { cls: "high", label: "建议建联" };
  if (score >= 40) return { cls: "mid", label: "可考虑" };
  return { cls: "low", label: "谨慎" };
}

function potentialScoreCell(c) {
  const { score, parts } = creatorPotentialScore(c);
  const t = scoreTier(score);
  const tip = parts.map((p) => `${p.key} ${Math.round(p.v)}`).join(" · ");
  return `<div class="score-cell" title="${escapeHtml(tip)}">
    <span class="score-pill ${t.cls}">${score}</span>
    <span class="score-tag ${t.cls}">${t.label}</span>
  </div>`;
}

// 算分说明弹窗（给客户看：算法 6 维度 + 合作档位）
function openScoreHelp() {
  const body = `
    <p style="margin:0 0 10px">出单潜力分（0–100）是系统按这个达人的真实数据自动算的，<b>越高越值得优先建联</b>。缺数据的项会自动剔除、权重摊到其余项。</p>
    <table class="help-table">
      <tr><td><b>出单能力</b></td><td>35%</td><td>该达人 TikTok 历史 GMV，越能带货越高</td></tr>
      <tr><td><b>类目契合</b></td><td>25%</td><td>达人内容/类目和你店铺商品越搭越高</td></tr>
      <tr><td><b>内容触达</b></td><td>20%</td><td>粉丝量 + 视频均播</td></tr>
      <tr><td><b>建联效率</b></td><td>20%</td><td>历史回复率，越愿意回越高</td></tr>
      <tr><td>带货频率<span class="muted">*</span></td><td>18%</td><td>近期挂商品的视频数（采集到才计）</td></tr>
      <tr><td>历史履约<span class="muted">*</span></td><td>15%</td><td>合作过的履约率（有才计）</td></tr>
    </table>
    <p class="muted" style="margin:8px 0 14px">*带星的是"有数据才纳入"。</p>
    <div style="margin-bottom:6px"><b>合作档位</b></div>
    <div class="score-legend">
      <span><span class="score-pill high" style="min-width:0;height:18px">≥65</span> 建议建联</span>
      <span><span class="score-pill mid" style="min-width:0;height:18px">40–64</span> 可考虑</span>
      <span><span class="score-pill low" style="min-width:0;height:18px">&lt;40</span> 谨慎</span>
    </div>
    <p class="muted" style="margin:12px 0 0">提示：分数是"潜力"不是"保证"。鼠标悬浮某个达人的分数，可看到它各维度的得分拆解。</p>`;
  openModal("出单潜力分怎么算的", body, `<button class="btn primary" onclick="closeModal()">知道了</button>`);
}

// 历史建联结果徽标（来自老库 legacyOutreach）
function legacyOutreachBadge(c) {
  const lo = c && c.legacyOutreach;
  if (!lo) return "";
  if (lo.replyLabel) {
    const cls = /有意向/.test(lo.replyLabel) ? "good" : /拒绝/.test(lo.replyLabel) ? "warn" : "";
    return `<span class="legacy-pill ${cls}" title="历史建联结果">${escapeHtml(lo.replyLabel)}</span>`;
  }
  if (lo.partnershipStatus) {
    const cls = lo.partnershipStatus === "已合作" ? "good" : lo.partnershipStatus === "已拒绝" ? "warn" : "";
    return `<span class="legacy-pill ${cls}" title="历史合作状态">曾${escapeHtml(lo.partnershipStatus)}</span>`;
  }
  if (lo.lastContactedAt) return `<span class="legacy-pill" title="曾建联，未回复">曾建联</span>`;
  return "";
}

// 详情页「建联前评估」卡：潜力分拆解 + 历史建联结果 + 估算说明
function creatorPreEvalCard(c) {
  const { score, parts } = creatorPotentialScore(c);
  const t = scoreTier(score);
  const tier = t.cls;
  const bars = parts.map((p) => `<div class="eval-row"><span>${escapeHtml(p.key)}</span><div class="eval-bar"><i style="width:${Math.round(p.v)}%"></i></div><b>${Math.round(p.v)}</b></div>`).join("");
  // 内容信号（扩展采集）：近期内容品类 + 与商家商品的契合
  let contentBlock = "";
  if (creatorHasContentData(c)) {
    const contentCats = creatorContentCategories(c);
    const merchant = merchantProductCategories();
    const matched = contentCats.filter((v) => merchant.has(v));
    const catTags = contentCats.map((v) => `<span class="legacy-pill ${matched.includes(v) ? "good" : ""}">${escapeHtml(v)}</span>`).join("") || `<span class="muted">未识别明确品类</span>`;
    const p = c.recentPerf;
    const perfBlock = p ? `
      <div class="perf-grid">
        <div class="perf-cell"><b>${compactCount(p.avgPlay)}</b><span class="muted">近期均播</span></div>
        <div class="perf-cell"><b>${Number(p.avgEngagement || 0)}%</b><span class="muted">互动率</span></div>
        <div class="perf-cell"><b>${Number(p.postsPerWeek || 0)}</b><span class="muted">条/周</span></div>
        <div class="perf-cell"><b>${Number(p.ecVideoCount || 0)}</b><span class="muted">带货视频</span></div>
      </div>
      <div class="muted" style="margin-top:4px">播放区间 ${compactCount(p.playMin)}~${compactCount(p.playMax)}（近 ${p.sampleCount} 条）</div>` : "";
    const ecBlock = (p && p.ecVideoCount != null) ? `
      <div style="margin-top:10px">
        <div class="muted">近期带货 · <b style="color:${p.ecVideoCount >= 3 ? "#15803d" : p.ecVideoCount >= 1 ? "#b45309" : "#b91c1c"}">${p.ecVideoCount}/${p.sampleCount} 条</b>视频挂了商品（带货占比 ${p.ecVideoRatio || 0}%）</div>
      </div>` : "";
    contentBlock = `
      <div class="eval-content">
        <div class="muted" style="margin:10px 0 4px">内容信号（扩展采集）${matched.length ? ` · <span style="color:#15803d">命中你的品类 ${matched.length} 项</span>` : ""}</div>
        <div class="tags">${catTags}</div>
        ${perfBlock}
        ${ecBlock}
        ${c.bio ? `<p class="muted" style="margin:6px 0 0">简介：${escapeHtml(c.bio.slice(0, 120))}</p>` : ""}
      </div>`;
  }
  // 达人广场数据（采集器从 marketplace/find 采回，有值才显示）
  const genderCn = (g) => (/male/i.test(g) && !/female/i.test(g)) ? "男" : (/female/i.test(g) ? "女" : g);
  const mCells = [];
  if (Number(c.unitsSold) > 0) mCells.push(`<div class="perf-cell"><b>${compactCount(c.unitsSold)}</b><span class="muted">带货件数</span></div>`);
  if (Number(c.videoEngagement) > 0) mCells.push(`<div class="perf-cell"><b>${compactCount(c.videoEngagement)}</b><span class="muted">视频互动</span></div>`);
  if (c.topFollowerGender) mCells.push(`<div class="perf-cell"><b>${escapeHtml(genderCn(c.topFollowerGender))}</b><span class="muted">主要粉丝性别</span></div>`);
  if (c.topFollowerAge) mCells.push(`<div class="perf-cell"><b>${escapeHtml(String(c.topFollowerAge))}</b><span class="muted">主要粉丝年龄</span></div>`);
  const marketBlock = (mCells.length || c.hasCollaborated) ? `
    <div class="eval-content">
      <div class="muted" style="margin:10px 0 4px">达人广场数据${c.hasCollaborated ? ` · <span style="color:#15803d">曾与本店合作</span>` : ""}</div>
      ${mCells.length ? `<div class="perf-grid">${mCells.join("")}</div>` : ""}
    </div>` : "";
  return `<div class="card">
    <h3>建联前评估</h3>
    <div class="eval-head"><span class="score-pill ${tier}">${score}</span><span class="score-tag ${tier}">${t.label}</span><span class="muted">出单潜力分 <span class="score-help" onclick="openScoreHelp()" title="算法与档位说明">?</span></span></div>
    <div class="eval-bars">${bars}</div>
    ${marketBlock}
    ${contentBlock}
  </div>`;
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
  const categories = tiktokCategoryOptions;
  state.filters.kolTypes = filterValues(state.filters.kolTypes).filter((x) => typeOptions.includes(x));
  state.filters.kolCategories = filterValues(state.filters.kolCategories).filter((x) => categories.includes(x));
  let rows = marketCreators.filter((c) => {
    const kw = state.filters.kolSearch.trim().toLowerCase();
    const typeOk = multiFilterOk(state.filters.kolTypes, c.type);
    const categoryOk = creatorCategoryFilterOk(state.filters.kolCategories, c);
    const followersOk = creatorFollowerTierOk(c.followers, state.filters.kolFollowers);
    const replyRateOk = creatorReplyRateOk(c.replyRate, state.filters.kolReplyRate);
    const gmvOk = creatorGmvRangeOk(c.gmv, state.filters.kolGmv);
    const contactOk = creatorContactOk(c, state.filters.kolContact);
    const libraryOk = (state.filters.kolLibrary || "全量") === "有联系方式" ? creatorHasDetail(c) : true;
    const kwOk = !kw || [c.username, c.nickname, c.category, c.region, normalizeCreatorTags(c.tags).join(",")].join(" ").toLowerCase().includes(kw);
    const interestOk = state.filters.kolInterest === "显示不感兴趣" ? c.status !== "黑名单" : c.status !== "黑名单" && !isNotInterestedBlocked(c);
    return typeOk && categoryOk && followersOk && replyRateOk && gmvOk && contactOk && libraryOk && kwOk && interestOk;
  });
  // #6 相似达人：选了标杆就按相似度过滤 + 排序，否则按潜力分排
  const similarTo = state.similarToCreatorId ? creator(state.similarToCreatorId) : null;
  let simRows = rows;
  if (similarTo) {
    const simMap = new Map(rows.map((c) => [c.id, creatorSimilarity(c, similarTo)]));
    simRows = rows.filter((c) => (simMap.get(c.id) || -1) >= 0);
    simRows.sort((a, b) => ((creatorOutreachBlockReason(a) ? 1 : 0) - (creatorOutreachBlockReason(b) ? 1 : 0)) || ((simMap.get(b.id) || 0) - (simMap.get(a.id) || 0)));
  }
  const kolScoreMap = new Map(rows.map((c) => [c.id, creatorPotentialScore(c).score]));
  if (!similarTo) rows.sort((a, b) => ((creatorOutreachBlockReason(a) ? 1 : 0) - (creatorOutreachBlockReason(b) ? 1 : 0)) || ((kolScoreMap.get(b.id) || 0) - (kolScoreMap.get(a.id) || 0)));
  rows = simRows;
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
    <div class="library-tabs">
      <button class="lib-tab ${(state.filters.kolLibrary || "全量") === "全量" ? "active" : ""}" onclick="setFilter('kolLibrary','全量')">全量达人库（${marketCreators.length}）</button>
      <button class="lib-tab ${(state.filters.kolLibrary || "全量") === "有联系方式" ? "active" : ""}" onclick="setFilter('kolLibrary','有联系方式')">有联系方式（${marketCreators.filter(creatorHasDetail).length}）</button>
    </div>
    <section class="store-panel">
      <div>
        <div class="section-kicker">达人库来源</div>
        <h3>${escapeHtml(selectedShop ? shopLabel(selectedShop) : "请先绑定 TikTok Shop 店铺")}</h3>
        <p>${selectedShop ? `当前店铺市场：${escapeHtml(currentMarket || "未识别")}。系统只展示该市场达人，不再让客户手动选择国家；达人基础资料来自我们平台达人库。` : "客户第一步必须先完成店铺绑定，否则无法按店铺市场筛选达人。"}</p>
        <div class="store-meta">
          <span>当前市场达人：${marketCreators.length} 位</span>
          <span>可联系（有 Email/WhatsApp）：${marketCreators.filter((c) => c.email || c.whatsapp).length} 位</span>
        </div>
      </div>
      <div class="store-actions">
        ${shops.length ? `
          <select class="select" onchange="switchTikTokShop(this.value)">
            ${shops.map((shop) => {
              const cipher = shopCipher(shop);
              return `<option value="${escapeHtml(cipher)}" ${cipher === state.settings.selectedTikTokShopCipher ? "selected" : ""}>${escapeHtml(shopLabel(shop))}</option>`;
            }).join("")}
          </select>
          <button class="btn primary" onclick="startTikTokAuth()">+ 添加店铺</button>
        ` : `
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
        `}
        <button class="btn" onclick="setPage('products')">返回产品管理</button>
      </div>
    </section>
    ${selectedShop && !realMarketCreators.length ? `<div class="notice" style="margin-bottom:12px">当前店铺市场暂时没有平台真实达人数据。下方如果看到达人，是平台补充数据；客户侧不提供导入或新增达人入口。</div>` : ""}
    ${(() => { const cp = state.outreachContextProductId ? product(state.outreachContextProductId) : null; return cp ? `<div class="notice context-banner" style="margin-bottom:12px">正在为商品「${escapeHtml(cp.name)}」物色达人，选中达人后一键建联会自动带上该商品。<button class="btn ghost" onclick="clearOutreachContext()">取消</button></div>` : ""; })()}
    ${similarTo ? `<div class="notice context-banner" style="margin-bottom:12px">正在找与 <b>@${escapeHtml(similarTo.username)}</b> 相似的达人（按类目 / 粉丝量级 / 带货度加权排序，已剔除不同类目），共 ${rows.length} 位。<button class="btn ghost" onclick="clearSimilar()">返回全部达人</button></div>` : ""}
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
          <input id="kolSearchInput" class="input kol-search-input" placeholder="搜索达人、用户名、标签..." value="${escapeHtml(state.filters.kolSearch)}" oninput="setFilter('kolSearch', this.value)" />
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
        <div class="market-indicator"><span class="market-icon">📍</span><span class="muted">当前店铺市场</span><b>${escapeHtml(currentMarket || "绑定店铺后自动识别")}</b></div>
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
          <button class="btn primary" onclick="startBulkOutreach()">一键建联(${state.bulkCreatorIds.length})</button>
        </div>
      </div>
      ${table([`<label class="table-check"><input type="checkbox" ${pageAllSelected ? "checked" : ""} onchange="toggleCreatorPageSelection(${pageAvailableIds}, this.checked)" /> 本页</label>`, "达人", `出单潜力分<span class="score-help" onclick="openScoreHelp()" title="算法与档位说明">?</span>`, "类型", "类目/地区", "粉丝", "TikTok GMV", "视频均播", "直播均观", "回复率", "状态/标签", "操作"], pagedRows.map((c) => {
      const blockReason = creatorOutreachBlockReason(c);
      return [
      blockReason ? `<span class="muted">${escapeHtml(blockReason)}</span>` : `<input type="checkbox" ${state.bulkCreatorIds.includes(c.id) ? "checked" : ""} onchange="toggleCreatorSelection(${c.id}, this.checked)" aria-label="选择 @${escapeHtml(c.username)}" />`,
      personCell(c),
      potentialScoreCell(c),
      normalizeCreatorType(c.type, c),
      `${creatorCategoryValues(c).map(escapeHtml).join(" / ")}<br><span class="muted">${escapeHtml(c.region)}</span>`,
      compactCount(c.followers),
      creatorGmvDisplay(c.gmv),
      creatorMetricValue(c, "avgVideoViews"),
      creatorMetricValue(c, "avgLiveUv"),
      creatorReplyRateDisplay(c.replyRate),
      `${c.status === "不感兴趣" ? badge("不感兴趣") : ""} ${creatorHasContentData(c) ? `<span class="legacy-pill good" title="已采集近期内容信号">内容✓</span>` : ""} ${creatorVisibleTags(c)}`,
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

function deliveryPill(label, status, detail = "") {
  const cls = status === "已提交" || status === "已发送" ? "success"
    : status === "失败" ? "danger"
      : status === "待确认" ? "warning"
        : "neutral";
  return `<span class="delivery-pill ${cls}"><b>${escapeHtml(label)}</b>${escapeHtml(status)}${detail ? `<em>${escapeHtml(detail)}</em>` : ""}</span>`;
}

function outreachStatusLabel(status) {
  const labels = {
    "待API发送": "待提交",
    "API结果待确认": "待确认",
    "API提交失败": "提交失败",
    "定向邀约待配置": "邀约待确认",
    "邮箱配置待完成": "邮箱配置待完成",
  };
  return labels[status] || status || "-";
}

// B端只暴露少数业务态；内部细分态都收敛到这几个。平台方仍看内部态。
const CUSTOMER_STATUS_ORDER = ["待发送", "待回复", "待我方处理", "已成交", "已关闭"];

function customerStatusLabel(status) {
  const map = {
    "待API发送": "待发送",
    "等待定向邀约": "待发送",
    "定向邀约待配置": "待发送",
    "API结果待确认": "待发送",
    "联系方式补充中": "待发送",
    "邮箱配置待完成": "待发送",
    "发送失败": "待发送",
    "待回复": "待回复",
    "待我方回复": "待我方处理",
    "已转合作": "已成交",
    "已关闭": "已关闭",
  };
  return map[status] || outreachStatusLabel(status);
}

function isPlatformView() {
  return (state.settings.viewRole || "B端") === "平台方";
}

// 视图感知的状态文案：平台方看内部态，B端看业务态。
function statusLabelForView(status) {
  return isPlatformView() ? outreachStatusLabel(status) : customerStatusLabel(status);
}

function outreachDeliveryCell(o) {
  const result = o.apiResult || {};
  const error = o.apiError || null;
  const target = targetCollaboration(o.targetCollaborationId);
  const targetResult = result.target_collaboration || target?.apiResult || null;
  const officialId = targetOfficialId(result) || target?.officialId || "";
  const items = [];

  if (target) {
    if (officialId) items.push(deliveryPill("定向邀约", "已提交"));
    else if (targetResult?.ok === false || target?.apiError) items.push(deliveryPill("定向邀约", "失败", targetResult?.code || target?.apiError?.code || ""));
    else if (targetResult?.ok || o.status === "API结果待确认") items.push(deliveryPill("定向邀约", "待确认", "需确认"));
    else items.push(deliveryPill("定向邀约", "未提交"));
  }

  if (isTargetInviteChannel(o.channel) && !target) {
    items.push(deliveryPill("定向邀约", "未提交"));
  }

  if (o.channel === "TikTok私信") {
    if (result.im?.ok) items.push(deliveryPill("TikTok私信", "已发送"));
    else if (error) items.push(deliveryPill("TikTok私信", "失败", error.code || error.message || ""));
    else items.push(deliveryPill("TikTok私信", o.status === "待API发送" ? "未提交" : "待确认"));
  }

  if (o.channel === "Email") {
    const emailResult = result.email || (result.ok !== undefined ? result : null);
    if (emailResult?.ok) items.push(deliveryPill("Email", "已发送"));
    else if (error) items.push(deliveryPill("Email", "失败", error.code || error.message || ""));
    else if (o.status === "邮箱配置待完成") items.push(deliveryPill("Email", "待确认", "未配置邮箱"));
    else if (o.status === "联系方式补充中") items.push(deliveryPill("Email", "待确认", "缺少邮箱"));
    else items.push(deliveryPill("Email", o.status === "待API发送" ? "未提交" : "待确认"));
  }

  if (o.inviteCard) items.push(deliveryPill("邀约卡", "已附带"));
  return `<div class="delivery-stack">${items.join("") || deliveryPill("触达", "未提交")}</div>`;
}

function outreachNextStepCell(o) {
  const target = targetCollaboration(o.targetCollaborationId);
  let title = "查看记录";
  let desc = "按当前状态继续跟进。";
  if (o.status === "待API发送" && isTargetInviteChannel(o.channel)) {
    title = "提交官方定向邀约";
    desc = "先创建 TikTok 官方邀约，成功后再通知达人。";
  } else if (o.status === "待API发送") {
    title = `提交${channelLabel(o.channel)}`;
    desc = target ? "同批定向邀约已就绪，可以发送通知。" : "直接提交当前触达渠道。";
  } else if (o.status === "等待定向邀约") {
    title = "等待定向邀约成功";
    desc = "先重试同批 TikTok 定向邀约，成功后再发通知。";
  } else if (o.status === "联系方式补充中") {
    title = "补充达人邮箱";
    desc = "补齐 Email 后再重新提交邮件建联。";
  } else if (o.status === "邮箱配置待完成") {
    title = "配置发信邮箱";
    desc = "完成邮箱配置后，该 Email 建联会回到待提交。";
  } else if (o.status === "发送失败") {
    title = "查看原因并重试";
    desc = "先看提交结果，再重新提交该渠道。";
  } else if (o.status === "定向邀约待配置" || o.status === "API结果待确认") {
    title = "确认官方返回";
    desc = "查看提交结果，确认字段、权限或邀约编号。";
  } else if (o.status === "待回复") {
    title = "等待达人回复";
    desc = "已发出建联，后续在沟通记录中跟进。";
  } else if (o.status === "待我方回复") {
    title = "处理达人回复";
    desc = "可回复、安排寄样或转入合作管理。";
  } else if (o.status === "已转合作") {
    title = "进入合作管理";
    desc = "后续跟进履约、内容和 ROI。";
  }
  return `<div class="next-step"><b>${escapeHtml(title)}</b><span>${escapeHtml(desc)}</span></div>`;
}

// 展示层按达人归纳：同一个达人的多渠道、多批次 record 合并成一组。数据模型不变。
const OUTREACH_STATUS_PRIORITY = ["待我方回复", "待API发送", "发送失败", "等待定向邀约", "定向邀约待配置", "API结果待确认", "联系方式补充中", "邮箱配置待完成", "待回复", "已转合作", "已关闭"];

function rollupOutreachStatus(records) {
  for (const s of OUTREACH_STATUS_PRIORITY) {
    if (records.some((r) => r.status === s)) return s;
  }
  return records[0]?.status || "-";
}

function outreachGroups() {
  const order = [];
  const map = new Map();
  for (const o of state.outreach) {
    if (!map.has(o.creatorId)) { map.set(o.creatorId, []); order.push(o.creatorId); }
    map.get(o.creatorId).push(o);
  }
  return order.map((creatorId) => {
    const records = map.get(creatorId);
    const primary = records.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
    const channels = Array.from(new Set(records.map((r) => r.channel).filter(Boolean)));
    return { creatorId, records, primary, channels, rollupStatus: rollupOutreachStatus(records) };
  });
}

function groupProducts(records) {
  const map = new Map();
  records.forEach((r) => {
    const products = Array.isArray(r.productsSnapshot) && r.productsSnapshot.length
      ? r.productsSnapshot
      : (Array.isArray(r.productIds) ? r.productIds.map(product).filter(Boolean) : [product(r.productId)].filter(Boolean));
    products.forEach((p) => { if (p && !map.has(p.id)) map.set(p.id, p); });
  });
  return Array.from(map.values());
}

function groupProductCell(records) {
  const products = groupProducts(records);
  if (!products.length) return "-";
  const names = productSnapshotNames(products);
  const commission = products.map((p) => {
    const rate = p.standardCommissionRate ?? commissionDefault(p);
    const ad = p.adCommissionEnabled && p.adCommissionRate ? ` + 广告 ${p.adCommissionRate}%` : "";
    return `${p.name}: ${rate}%${ad}`;
  }).join("；");
  return `<div><b>${escapeHtml(names)}</b></div>${commission ? `<div class="muted">${escapeHtml(commission)}</div>` : ""}`;
}

function groupDeliveryCell(records) {
  const items = [];
  const targetRec = records.find((r) => targetCollaboration(r.targetCollaborationId));
  const target = targetRec ? targetCollaboration(targetRec.targetCollaborationId) : null;
  if (target) {
    const result = targetRec.apiResult || {};
    const targetResult = result.target_collaboration || target.apiResult || null;
    const officialId = targetOfficialId(result) || target.officialId || "";
    if (officialId) items.push(deliveryPill("定向邀约", "已提交"));
    else if (targetResult?.ok === false || target.apiError) items.push(deliveryPill("定向邀约", "失败"));
    else if (targetResult?.ok || targetRec.status === "API结果待确认") items.push(deliveryPill("定向邀约", "待确认", "需确认"));
    else items.push(deliveryPill("定向邀约", "未提交"));
  } else if (records.some((r) => isTargetInviteChannel(r.channel))) {
    items.push(deliveryPill("定向邀约", "未提交"));
  }
  const im = records.find((r) => r.channel === "TikTok私信");
  if (im) {
    const result = im.apiResult || {};
    if (result.im?.ok) items.push(deliveryPill("TikTok私信", "已发送"));
    else if (im.apiError) items.push(deliveryPill("TikTok私信", "失败"));
    else items.push(deliveryPill("TikTok私信", im.status === "待API发送" ? "未提交" : "待确认"));
  }
  const em = records.find((r) => r.channel === "Email");
  if (em) {
    const result = em.apiResult || {};
    const emailResult = result.email || (result.ok !== undefined ? result : null);
    if (emailResult?.ok) items.push(deliveryPill("Email", "已发送"));
    else if (em.apiError) items.push(deliveryPill("Email", "失败"));
    else if (em.status === "邮箱配置待完成") items.push(deliveryPill("Email", "待确认", "未配置邮箱"));
    else if (em.status === "联系方式补充中") items.push(deliveryPill("Email", "待确认", "缺少邮箱"));
    else items.push(deliveryPill("Email", em.status === "待API发送" ? "未提交" : "待确认"));
  }
  if (records.some((r) => r.inviteCard)) items.push(deliveryPill("邀约卡", "已附带"));
  return `<div class="delivery-stack">${items.join("") || deliveryPill("触达", "未提交")}</div>`;
}

function outreachRowActions(group) {
  const cid = group.creatorId;
  const primary = group.primary;
  const pendingCount = group.records.filter((r) => ["待API发送", "发送失败", "等待定向邀约"].includes(r.status)).length;
  const items = [`<button class="btn ghost" onclick="openOutreachDetail(${primary.id})">详情</button>`];
  if (pendingCount) items.push(`<button class="btn ghost" onclick="submitGroupPending(${cid})">提交全部待发送(${pendingCount})</button>`);
  if (group.records.some((r) => r.status !== "已关闭")) items.push(`<button class="btn ghost" onclick="closeOutreachGroup(${cid})">结束全部跟进</button>`);
  items.push(`<button class="btn ghost" onclick="markNotInterested(${cid})">不感兴趣</button>`);
  items.push(`<button class="btn ghost danger" onclick="deleteOutreachGroup(${cid})">删除全部</button>`);
  return `
    <div class="actions-dropdown-wrap">
      <button class="btn ghost" onclick="openConversation(${primary.id})">查看沟通</button>
      <details class="actions-dropdown">
        <summary>更多 ▾</summary>
        <div class="actions-dropdown-menu">${items.join("")}</div>
      </details>
    </div>`;
}

async function submitGroupPending(creatorId) {
  const recs = state.outreach.filter((r) => r.creatorId === creatorId && ["待API发送", "发送失败", "等待定向邀约"].includes(r.status));
  for (const r of recs) {
    // eslint-disable-next-line no-await-in-loop
    await submitOutreachApi(r.id);
  }
}

function closeOutreachGroup(creatorId) {
  if (!confirm("结束该达人全部渠道的建联跟进？")) return;
  state.outreach.forEach((r) => {
    if (r.creatorId === creatorId && r.status !== "已关闭") { r.status = "已关闭"; r.updatedAt = nowText(); }
  });
  const c = creator(creatorId);
  if (c) c.status = "待联系";
  saveState();
  render();
}

function deleteOutreachGroup(creatorId) {
  if (!confirm("删除该达人的全部建联记录？")) return;
  state.outreach = state.outreach.filter((r) => r.creatorId !== creatorId);
  saveState();
  render();
}

function renderOutreach() {
  const channels = Array.from(new Set(state.outreach.map((o) => o.channel).filter(Boolean)));
  const statuses = Array.from(new Set(state.outreach.map((o) => o.status).filter(Boolean)));
  const totalCount = state.outreach.length;
  const waitingCreatorCount = state.outreach.filter((o) => o.status === "待回复").length;
  const pendingApiCount = state.outreach.filter((o) => o.status === "待API发送").length;
  const waitingTargetCount = state.outreach.filter((o) => o.status === "等待定向邀约" || o.status === "定向邀约待配置" || o.status === "API结果待确认").length;
  const failedCount = state.outreach.filter((o) => o.status === "发送失败").length;
  const allGroups = outreachGroups();
  const groups = allGroups.filter((g) => {
    const c = creator(g.creatorId);
    const productNames = g.records.map((r) => outreachProductNames(r)).join(" ");
    const lastMessages = g.records.map((r) => r.lastMessage || "").join(" ");
    const kw = state.filters.outreachSearch.trim().toLowerCase();
    const kwOk = !kw || [c?.username, c?.nickname, productNames, lastMessages].join(" ").toLowerCase().includes(kw);
    const sel = state.filters.outreachStatus;
    const statusOk = sel === "全部" || g.records.some((r) => r.status === sel || customerStatusLabel(r.status) === sel || outreachStatusLabel(r.status) === sel);
    const channelOk = state.filters.outreachChannel === "全部" || g.channels.includes(state.filters.outreachChannel);
    return kwOk && statusOk && channelOk;
  });
  const statusFilterOptions = isPlatformView()
    ? statuses.map((x) => [x, outreachStatusLabel(x)])
    : Array.from(new Set(state.outreach.map((o) => customerStatusLabel(o.status))))
        .sort((a, b) => CUSTOMER_STATUS_ORDER.indexOf(a) - CUSTOMER_STATUS_ORDER.indexOf(b))
        .map((x) => [x, x]);
  const headActions = pendingApiCount
    ? `<button class="btn primary" onclick="submitPendingOutreachBatch()">提交全部待发送(${pendingApiCount})</button>`
    : "";
  return `
    ${pageHead("建联记录", "统一查看 TikTok 定向邀约、私信、Email 的沟通状态和待处理消息。同一个达人的多个渠道已归纳为一行。", headActions)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("建联总数", totalCount, "全部沟通记录", "setFilter('outreachStatus','全部')")}
      ${stat("待达人回复", waitingCreatorCount, "已发出邀请，等待达人响应", "setFilter('outreachStatus','待回复')")}
      ${stat("待提交", pendingApiCount, "定向邀约、私信或 Email 尚未提交发送", "setFilter('outreachStatus','待API发送')")}
      ${stat("待定向邀约", waitingTargetCount, "通知渠道正在等待官方邀约结果", "setFilter('outreachStatus','等待定向邀约')")}
      ${stat("发送失败", failedCount, "查看提交结果后可重新提交", "setFilter('outreachStatus','发送失败')")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input id="outreachSearchInput" class="input" placeholder="搜索达人、产品、消息..." value="${escapeHtml(state.filters.outreachSearch)}" oninput="setFilter('outreachSearch', this.value)" />
        <select class="select" onchange="setFilter('outreachStatus', this.value)">
          ${[["全部", "全部"], ...statusFilterOptions].map(([val, label]) => `<option value="${escapeHtml(val)}" ${state.filters.outreachStatus === val ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('outreachChannel', this.value)">
          ${["全部", ...channels].map((x) => `<option ${state.filters.outreachChannel === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <span class="muted">当前显示 ${groups.length} / ${allGroups.length} 位达人</span>
      </div>
    </div>
    ${table(["达人", "产品", "渠道", "状态", "触达状态", "下一步", "最后消息", "更新时间", "操作"], groups.map((g) => {
      const actionRec = g.records.find((r) => r.status === g.rollupStatus) || g.primary;
      return [
        personCell(creator(g.creatorId)),
        `<div class="cell-clamp">${groupProductCell(g.records)}</div>`,
        g.channels.map((ch) => {
          const r = g.records.find((x) => x.channel === ch);
          return r ? `<button class="badge badge-link" type="button" title="查看该渠道详情" onclick="openOutreachDetail(${r.id})">${escapeHtml(channelLabel(ch))}</button>` : badge(channelLabel(ch));
        }).join(" "),
        badge(statusLabelForView(g.rollupStatus)),
        groupDeliveryCell(g.records),
        `<div class="cell-clamp">${outreachNextStepCell(actionRec)}</div>`,
        `<div class="cell-clamp">${outreachMessageCell(g.primary)}</div>`,
        g.primary.updatedAt,
        outreachRowActions(g),
      ];
    }))}
  `;
}

function outreachDraftTargets() {
  return (state.outreachDraft?.creatorIds || [])
    .map((id) => creator(id))
    .filter(Boolean);
}

function outreachTargetPreview(targets) {
  if (!targets.length) {
    return `<div class="empty-state compact">还没有选择达人。请返回达人库选择可建联达人。</div>`;
  }
  const staleCount = targets.filter((c) => c.metricsEstimated).length;
  const freshHint = staleCount
    ? `<div class="fresh-hint">部分达人的粉丝/GMV 为既往数据，建联前可在「达人详情」核对一下最新表现，沟通更有把握。</div>`
    : "";
  return `
    ${freshHint}
    <div class="workbench-creator-list">
      ${targets.slice(0, 4).map((c) => {
        const reason = creatorOutreachBlockReason(c);
        return `
          <div class="workbench-creator ${reason ? "blocked" : ""}">
            ${personCell(c)}
            <span>${reason ? badge("不可建联") : badge("可建联")}</span>
            ${reason ? `<small>${escapeHtml(reason)}</small>` : `<small>${escapeHtml(c.region || "-")} · ${escapeHtml(normalizeCreatorType(c.type, c))}</small>`}
          </div>
        `;
      }).join("")}
      ${targets.length > 4 ? `<div class="muted">还有 ${targets.length - 4} 位达人将在提交时一起处理。</div>` : ""}
    </div>
  `;
}

function outreachWorkbenchSummary(targets, availableTargets, selectedProductIds = []) {
  const selectedProducts = selectedProductIds.length || Math.max(1, Math.min(state.products.length, 3));
  const emailReady = availableTargets.filter((c) => c.email).length;
  const missingEmail = Math.max(0, availableTargets.length - emailReady);
  return `
    <aside class="workbench-summary">
      <div class="summary-card">
        <span>已选达人</span>
        <b>${targets.length}</b>
        <small>可建联 ${availableTargets.length} 位 · 不可建联 ${Math.max(0, targets.length - availableTargets.length)} 位</small>
      </div>
      <div class="summary-card">
        <span>已选商品</span>
        <b id="summaryProductCount">${selectedProducts}</b>
        <small>佣金随商品单独配置</small>
      </div>
      <div class="summary-card">
        <span>预计生成记录</span>
        <ul>
          <li>TikTok 定向邀约：${availableTargets.length} 条</li>
          <li>TikTok 私信：${availableTargets.length} 条</li>
          <li>Email：${emailReady} 条</li>
        </ul>
      </div>
    </aside>
  `;
}

function renderOutreachWorkbench() {
  const targets = outreachDraftTargets();
  const availableTargets = targets.filter((c) => !creatorOutreachBlockReason(c));
  const channelOptions = availableTargets.length ? channelOptionsForCreators(availableTargets) : [];
  const channelHintLabels = { "TikTok私信": "TikTok 私信（主跟进）", "Email": "Email（备用 · 手动）" };
  const channelOptionsLabeled = channelOptions.map(([value]) => [value, channelHintLabels[value] || value]);
  const defaultChannels = channelOptions.some(([value]) => value === "TikTok私信") ? ["TikTok私信"] : (channelOptions[0] ? [channelOptions[0][0]] : []);
  const defaultTemplate = state.templates[0]?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}。";
  const emailNotice = emailAccountConfigured()
    ? `邮箱已绑定：${escapeHtml(state.settings.emailAddress)}`
    : `Email 尚未绑定，选择 Email 前请先完成邮箱配置。`;
  const selectedProductIds = state.outreachContextProductId && product(state.outreachContextProductId)
    ? [state.outreachContextProductId]
    : state.products.slice(0, 3).map((p) => p.id);

  return `
    <div class="workbench-page">
      <div class="workbench-top">
        <div>
          <div class="breadcrumb">达人库 / 建联工作台</div>
          <h1 class="page-title">发起建联</h1>
          <div class="page-desc">按商品配置佣金，分别创建 TikTok 定向邀约、TikTok 私信和 Email 建联记录。</div>
        </div>
        <div class="filters">
          <button class="btn" onclick="saveOutreachDraft()">保存草稿</button>
          <button class="btn primary" onclick="saveOutreach('${availableTargets.map((c) => c.id).join(",")}')">提交建联</button>
        </div>
      </div>

      <div class="workbench-layout">
        <aside class="workbench-steps">
          ${[
            ["确认达人", "已完成"],
            ["商品与佣金", "当前"],
            ["建联动作", "当前"],
            ["消息与翻译", "待处理"],
            ["提交预览", "待处理"],
          ].map(([label, status], index) => `
            <div class="workbench-step ${status === "当前" ? "active" : status === "已完成" ? "done" : ""}">
              <b>${index + 1}</b>
              <span>${label}</span>
              <small>${status}</small>
            </div>
          `).join("")}
        </aside>

        <main class="workbench-main">
          <section class="workbench-section">
            <div class="section-head">
              <div>
                <h2>确认达人</h2>
                <p>不可建联达人会被拦截，不进入提交。</p>
              </div>
              <button class="btn" onclick="setPage('kol')">返回达人库</button>
            </div>
            ${outreachTargetPreview(targets)}
          </section>

          <section class="workbench-section">
            <div class="section-head">
              <div>
                <h2>商品与佣金</h2>
                <p>商品来自当前绑定店铺；佣金必须在提交前按商品确认。</p>
              </div>
              <div class="filters">
                <button class="btn" onclick="bulkSetCommission('standard')">批量修改标准佣金</button>
                <button class="btn" onclick="bulkSetCommission('ad')">批量修改广告佣金</button>
              </div>
            </div>
            ${productMultiPicker(selectedProductIds)}
          </section>

          <section class="workbench-section">
            <div class="section-head">
              <div>
                <h2>建联动作</h2>
                <p>定向邀约是正式佣金邀约（主）；TikTok 私信是主要跟进通道；Email 为备用，由 BD 手动选择不回私信的达人时使用，不会从私信自动升级。各通道失败时互不影响。</p>
              </div>
            </div>
            <div class="action-grid">
              <div class="action-panel">
                <div class="action-title">
                  <label class="switch-row"><input type="checkbox" id="createTargetCollaboration" checked onchange="updateOutreachPreview()" /> 创建 TikTok 定向邀约</label>
                  <span class="badge info">官方邀约</span>
                </div>
                <div class="form-grid">
                  ${field("targetCollaborationName", "邀约名称", "夏季新品达人合作", `定向邀约-${todayString()}`)}
                  ${field("targetExpiresAt", "有效期", "2026-07-15", dateAfter(14))}
                  ${multiCheckField("targetDeliverables", "交付形式", [["短视频", "短视频"], ["直播", "直播"]], ["短视频"])}
                  ${selectField("sampleOffer", "是否提供免费样品", [["提供", "提供"], ["不提供", "不提供"]], "提供")}
                  ${selectField("sampleReviewMode", "样品审核方式", [["手动审核", "手动审核"], ["自动审核", "自动审核"]], "手动审核")}
                  ${field("targetContactName", "联系人", "BD负责人", "Sam")}
                  ${field("targetContactEmail", "联系人邮箱", "bd@brand.com", state.settings.emailAddress || "")}
                </div>
                <div class="invite-card-block">
                  <label class="switch-row"><input type="checkbox" id="sendInviteCard" checked onchange="updateOutreachPreview()" /> 随定向邀约发送邀约卡</label>
                  <div class="muted" style="margin:6px 0">邀约卡把选中商品、佣金和样品规则整理成摘要，随 TikTok 私信 / Email 一起发出。</div>
                  <div id="inviteCardPreview" class="invite-card-preview">${initialInviteCardSummaryHtml(selectedProductIds)}</div>
                </div>
              </div>
              <div class="action-panel">
                <div class="action-title">
                  <b>跟进通道</b>
                  <span class="badge neutral">私信为主 · Email 备用</span>
                </div>
                ${channelOptions.length ? multiCheckField("outreachChannels", "发送渠道", channelOptionsLabeled, defaultChannels) : `<div class="empty-state compact">当前没有可用跟进通道，请到平台设置开启。</div>`}
                <div class="notice soft" style="margin-top:12px">
                  <b>Email 配置：</b>${emailNotice}
                  <button class="btn ghost" type="button" onclick="openEmailSetupModal('outreach')">配置邮箱/查看教程</button>
                </div>
              </div>
            </div>
          </section>

          <section class="workbench-section">
            <div class="section-head">
              <div>
                <h2>消息与翻译</h2>
                <p>消息用于 TikTok 私信和 Email，定向邀约会携带同一段说明。</p>
              </div>
              <button class="btn" type="button" onclick="translateOutreachDraft()">翻译成达人语言</button>
            </div>
            <div class="form-grid">
              ${selectField("outreachTemplateId", "消息模板", [["0", "不使用模板"], ...state.templates.map((x) => [x.id, x.name])], state.templates[0]?.id || "0")}
              ${selectField("outreachSendMode", "发送方式", [["立即发送", "立即发送"], ["定时发送", "定时发送"]], "立即发送")}
              ${field("outreachScheduleAt", "定时发送时间", "2026-06-22 09:30", "")}
              <div class="form-field"><label>翻译目标语言</label><select id="outreachLanguage" class="select" onchange="document.getElementById('outreachTranslatedMessage').value=''">${languageOptionsForTargets(availableTargets).map(([v]) => `<option value="${escapeHtml(v)}" ${v === targetLanguageForCreator(availableTargets[0]) ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select></div>
            </div>
            <div class="message-grid">
              <div class="form-field"><label>中文原文</label><textarea id="outreachMessage" class="textarea">${escapeHtml(defaultTemplate)}</textarea></div>
              <div class="form-field"><label>翻译预览</label><textarea id="outreachTranslatedMessage" class="textarea" placeholder="点击翻译后生成目标语言版本。"></textarea></div>
            </div>
          </section>

          <section class="workbench-section">
            <div class="section-head">
              <div>
                <h2>提交预览</h2>
                <p>提交后会生成三类独立记录，任何一个渠道失败都不会覆盖其他渠道结果。</p>
              </div>
            </div>
            <div class="submit-preview">
              <div><b>TikTok 定向邀约</b><span id="previewTargetCount">${availableTargets.length} 条 · 创建官方邀约</span></div>
              <div><b>TikTok 私信</b><span id="previewImCount">${availableTargets.length} 条 · 站内私信通知</span></div>
              <div><b>Email</b><span id="previewEmailCount">0 条 · 邮件发送，缺邮箱进入补充任务</span></div>
            </div>
          </section>
        </main>

        ${outreachWorkbenchSummary(targets, availableTargets, selectedProductIds)}
      </div>
    </div>
  `;
}

function renderAutoReply() {
  const enabledCount = state.autoReplies.filter((r) => r.enabled).length;
  return `
    ${pageHead("自动回复", "关键词写中文即可，达人用当地语言回复时系统会先翻成中文再匹配；回复可选文本（按达人语言自动翻译）或图片。将在接入「自动收达人回复」后真正发送，现可用「测试」本地验证。", `<button class="btn primary" onclick="openAutoReplyModal()">新增规则</button>`)}
    <div class="grid grid-3" style="margin-bottom:16px">
      ${stat("规则总数", state.autoReplies.length, "最多 50 条")}
      ${stat("启用规则", enabledCount, "按优先级命中第一条")}
      ${stat("触发渠道", "同来源", "真实收发接入后按消息来源回复")}
    </div>
    ${table(["规则名称", "规则类型", "触发条件", "回复内容", "优先级/状态", "操作"], [...state.autoReplies].sort((a, b) => a.priority - b.priority).map((r) => [
      escapeHtml(r.name),
      escapeHtml(r.matchType),
      autoReplyConditionText(r),
      r.replyType === "图片" ? `🖼 图片` : escapeHtml(r.replyContent || "-"),
      `P${Number(r.priority || 50)}<br>${r.enabled ? badge("启用") : badge("停用")}`,
      `<button class="btn" onclick="openAutoReplyModal(${r.id})">编辑</button> <button class="btn ghost" onclick="openAutoReplyTest(${r.id})">测试</button> <button class="btn ghost" onclick="toggleAutoReply(${r.id})">${r.enabled ? "停用" : "启用"}</button> <button class="btn ghost" onclick="deleteAutoReply(${r.id})">删除</button>`,
    ]))}
  `;
}

function renderTemplates() {
  return `
    ${pageHead("消息模板", "维护 TikTok 私信、Email 的建联与跟进模板。", `<button class="btn primary" onclick="openTemplateModal()">新增模板</button>`)}
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
        <input id="blacklistSearchInput" class="input" placeholder="搜索达人、类目、地区、原因..." value="${escapeHtml(state.filters.blacklistSearch)}" oninput="setFilter('blacklistSearch', this.value)" />
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

// 官方寄样申请状态 → 中文（不给 B 端看原始码）
function sampleStatusLabel(status) {
  const s = String(status || "").trim().toUpperCase();
  const map = {
    PENDING: "待审核", TO_APPROVE: "待审核", WAIT_APPROVE: "待审核", SUBMITTED: "待审核",
    APPROVED: "已批准", PASS: "已批准",
    REJECTED: "已拒绝", REJECT: "已拒绝", REJECT_CANCELLED: "已取消", CANCELLED: "已取消", CANCEL: "已取消",
    SHIPPED: "已寄出", DELIVERING: "运输中", IN_TRANSIT: "运输中",
    DELIVERED: "已签收", SIGNED: "已签收", RECEIVED: "已签收",
    COMPLETED: "已完成", FULFILLED: "已完成", FINISHED: "已完成",
    EXPIRED: "已过期",
  };
  return map[s] || (status ? "处理中" : "-");
}
function sampleStatusClass(status) {
  const l = sampleStatusLabel(status);
  if (["已完成", "已批准", "已签收"].includes(l)) return "success";
  if (["已拒绝", "已取消", "已过期"].includes(l)) return "neutral";
  return "warning";
}
// 单条申请的风险判读（喂样品成功率）
function sampleRisk(app) {
  const c = app.creator || {};
  const fulfillPct = Number(String(c.fulfillment_percentage || "0").replace("%", "")) || 0;
  if (app._riskNoOutput) return { level: "high", text: "拿样未产出" };
  const manual = sampleManualFlag(c.username || c.creator_open_id);
  if (manual) return { level: "high", text: manual };
  if (fulfillPct > 0 && fulfillPct < 30) return { level: "mid", text: `历史履约 ${fulfillPct}%` };
  return { level: "", text: "" };
}
function sampleManualFlag(key) {
  const m = (state.creatorRiskFlags || {})[key];
  return m || "";
}

function renderSamples() {
  maybeAutoLoadSamples();
  const apps = state.tiktokSamples || [];
  const kw = (state.filters.sampleSearch || "").trim().toLowerCase();
  const statusFilter = state.filters.sampleStatus || "全部";
  const rows = apps.filter((a) => {
    const c = a.creator || {};
    const kwOk = !kw || [c.username, c.nickname, a.product?.title].join(" ").toLowerCase().includes(kw);
    const statusOk = statusFilter === "全部" || sampleStatusLabel(a.status) === statusFilter;
    return kwOk && statusOk;
  });
  const statuses = Array.from(new Set(apps.map((a) => sampleStatusLabel(a.status)).filter((x) => x !== "-")));
  const pending = apps.filter((a) => sampleStatusLabel(a.status) === "待审核").length;
  const inFlight = apps.filter((a) => ["已批准", "已寄出", "运输中", "已签收", "处理中"].includes(sampleStatusLabel(a.status))).length;
  const riskRows = apps.map((a) => ({ a, r: sampleRisk(a) })).filter((x) => x.r.level);
  return `
    ${pageHead("寄样管理", "数据来自 TikTok Shop 官方寄样接口，自动同步；风险清单自动标记拿样未产出的达人。", `<button class="btn" onclick="loadTikTokSamples()">刷新</button>`)}
    <div class="grid grid-4">
      ${stat("寄样申请", apps.length, "官方接口同步", "")}
      ${stat("待审核", pending, "需要处理")}
      ${stat("履约中", inFlight, "已批准/寄出/签收")}
      ${stat("风险达人", riskRows.length, "拿样未产出/低履约/已标记")}
    </div>
    ${riskRows.length ? `
    <div class="surface-panel" style="margin-bottom:16px">
      <h3 style="margin:0 0 10px">⚠️ 风险清单（自动 + 手动标记）</h3>
      ${table(["达人", "商品", "风险", "履约率", "操作"], riskRows.map(({ a, r }) => {
        const c = a.creator || {};
        return [
          sampleCreatorCell(c),
          escapeHtml((a.product?.title || "-").slice(0, 40)),
          `<span class="status-pill ${r.level === "high" ? "neutral" : "warning"}" style="${r.level === "high" ? "color:#b91c1c;border-color:#fca5a5;background:#fef2f2" : ""}">${escapeHtml(r.text)}</span>`,
          escapeHtml(String(c.fulfillment_percentage || "0") + "%"),
          `<button class="btn ghost" onclick="clearRiskFlag('${escapeJs(c.username || c.creator_open_id)}')">移除标记</button>`,
        ];
      }))}
    </div>` : ""}
    <div class="toolbar">
      <div class="filters">
        <input id="sampleSearchInput" class="input" placeholder="搜索达人、商品..." value="${escapeHtml(state.filters.sampleSearch || "")}" oninput="setFilter('sampleSearch', this.value)" />
        <select class="select" onchange="setFilter('sampleStatus', this.value)">
          ${["全部", ...statuses].map((x) => `<option ${statusFilter === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
      <div class="filters"><span class="muted">当前显示 ${rows.length} / ${apps.length} 条</span></div>
    </div>
    ${apps.length ? table(["达人", "商品", "状态", "佣金", "履约率", "内容产出", "风险", "操作"], rows.map((a) => {
      const c = a.creator || {};
      const r = sampleRisk(a);
      return [
        sampleCreatorCell(c),
        escapeHtml((a.product?.title || "-").slice(0, 36)),
        `<span class="status-pill ${sampleStatusClass(a.status)}">${escapeHtml(sampleStatusLabel(a.status))}</span>`,
        a.commission_rate ? Math.round(Number(a.commission_rate) * 100) + "%" : "-",
        escapeHtml(String(c.fulfillment_percentage || "0") + "%"),
        `${Number(c.content_count || 0)} 条`,
        r.level ? `<span class="legacy-pill warn">${escapeHtml(r.text)}</span>` : `<span class="muted">-</span>`,
        `<button class="btn ghost" onclick="flagRiskCreator('${escapeJs(c.username || c.creator_open_id)}')">标记风险</button>`,
      ];
    })) : `<div class="empty-state">当前店铺暂无寄样申请（官方接口返回空）。达人通过 TikTok 申请样品后会自动出现在这里。</div>`}
  `;
}

function sampleCreatorCell(c) {
  const initial = escapeHtml(String(c.username || c.nickname || "?").slice(0, 1).toUpperCase());
  const av = c.avatar_url ? `<img src="${escapeHtml(c.avatar_url)}" alt="" onerror="this.parentNode.textContent='${initial}'" />` : initial;
  return `<div class="person-cell"><span class="avatar">${av}</span><div><b>${escapeHtml(c.nickname || c.username || "-")}</b><div class="muted">@${escapeHtml(c.username || "-")} · 粉丝 ${compactCount(c.follower_count)}</div></div></div>`;
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
      ${stat("归因 GMV", money(gmv), "来自合作台账或系统同步")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input id="coopSearchInput" class="input" placeholder="搜索达人、产品、负责人、备注..." value="${escapeHtml(state.filters.coopSearch)}" oninput="setFilter('coopSearch', this.value)" />
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
                <div class="notice">未完成 TikTok 授权时使用本地台账，不伪造真实同步。</div>
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
        <p>Email / TikTok 私信开关在平台设置统一控制。</p>
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
    ${pageHead("订阅计费", "查看套餐、配额和账单。支付通道由平台设置开关控制。")}
    <div class="notice" style="margin-bottom:16px">当前可用支付通道：支付宝、微信支付${stripeEnabled ? "、Stripe" : "。Stripe 支付已由平台设置关闭"}。</div>
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
    ${pageHead("平台设置", "功能开关、店铺连接状态、商家统计和入驻审批。")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("申请商家", applications.length, "本地入驻台账")}
      ${stat("待审批", pending, "需要平台处理")}
      ${stat("已通过", approved, "可进入本地试用")}
      ${stat("接入阻塞", blocked + needsInfo, "资料或授权未就绪")}
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
        <h3>TikTok 店铺接入流程</h3>
        <ol>
          <li>确认 Partner Center 已登录，且店铺/商家账号有 Affiliate 权限。</li>
          <li>创建或选择 Partner App，确认商品、达人、消息、订单相关权限。</li>
          <li>配置 OAuth Redirect URL：系统回调地址，例如 <code>http://localhost:8015/api/tiktok/callback</code>。</li>
          <li>拿到 client_key / client_secret 后放入本项目环境变量或配置文件。</li>
          <li>若页面出现验证码、人机校验或 scope 审批缺失，需要你在浏览器里处理，我再继续同步。</li>
        </ol>
        <div class="warning-box">当前版本已接入本地服务 <code>http://127.0.0.1:8015</code>。未配置 app_key/app_secret 或未完成授权时不会伪造 TikTok 数据。</div>
      </div>
      <div class="card">
        <h3>TikTok 本地配置</h3>
        <div class="form-grid">
          ${field("apiClientKey", "client_key", "Partner App client_key", state.settings.tiktokClientKey || "")}
          ${field("apiRedirectUrl", "OAuth Redirect URL", "http://localhost:8015/api/tiktok/callback", state.settings.tiktokRedirectUrl || "")}
          ${multiCheckField("apiScopes", "已申请 scope", tiktokScopeOptions, state.settings.tiktokScopes || "")}
          ${field("apiLastCheck", "最近检查", "尚未检查", state.settings.tiktokLastAuthCheck || "尚未检查")}
        </div>
        <div class="warning-box" style="margin-top:12px">client_secret 不应保存在浏览器 localStorage。正式接入时请放在本项目服务环境变量中；遇到授权确认、验证码、权限审批时需要人工在浏览器完成。</div>
        <div style="margin-top:12px">
          <button class="btn primary" onclick="saveApiSettings()">保存配置</button>
          <button class="btn primary" onclick="startTikTokAuth()">绑定店铺</button>
          <button class="btn" onclick="checkTikTokBackend()">检查连接服务</button>
          <button class="btn" onclick="checkTikTokShops()">读取已授权店铺</button>
          <button class="btn" onclick="refreshPlatformCreatorLibrary()">更新平台达人库</button>
          <button class="btn" onclick="markApiAuthBlocked()">标记授权阻塞</button>
          <button class="btn ghost" onclick="showApiHandoffSteps('店铺接入')">查看人工处理流程</button>
        </div>
      </div>
      <div class="card">
        <h3>接入状态</h3>
        <p><b>当前状态：</b>${badge(state.settings.apiStatus)}</p>
        <p><b>连接服务：</b>${escapeHtml(state.settings.tiktokBackendStatus || "未检查")}</p>
        <p><b>已授权店铺：</b>${shops.length ? `${shops.length} 个` : "未绑定"}</p>
        <p><b>当前同步店铺：</b>${escapeHtml(state.settings.tiktokShopName || "未选择")}</p>
        <p><b>Token 保存时间：</b>${escapeHtml(state.settings.tiktokTokenSavedAt || "未保存")}</p>
        <p><b>商品同步：</b>${escapeHtml(state.settings.lastProductSync)}</p>
        <p><b>达人同步：</b>${escapeHtml(state.settings.lastCreatorSync)}</p>
        <p class="muted">client_secret 只从本地服务环境变量读取；浏览器只负责触发授权和展示同步结果。</p>
        ${shops.length ? `
          <div class="divider"></div>
          <h4>授权店铺列表</h4>
          ${table(["店铺", "市场", "Shop ID", "操作"], shops.map((shop) => [
            escapeHtml(shopLabel(shop)),
            escapeHtml(shopRegion(shop)),
            escapeHtml(shop.shop_id || shop.id || "-"),
            `<button class="btn ghost" onclick="selectTikTokShop('${escapeJs(shopCipher(shop))}')">设为同步店铺</button>`,
          ]))}
        ` : `<div class="notice" style="margin-top:12px">当前还没有授权店铺。多国家不是在本系统里手动添加，而是每个国家/市场的真实 Seller 店铺授权后由 TikTok 返回。</div>`}
      </div>
      <div class="card" style="grid-column: 1 / -1">
        <h3>商家入驻审批</h3>
        <div class="notice" style="margin-bottom:12px">这是本地审批台账，用于验收平台设置流程；批准或驳回不会触达真实商户系统、支付系统或 TikTok。</div>
        ${table(["商家", "店铺", "联系人", "套餐", "接入状态", "审批状态", "申请时间", "备注", "操作"], applications.map((row) => [
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
  const detailTab = state.detailTab || "沟通记录";
  return `
    ${pageHead("KOL详情", "管理并沉淀达人基础资料与沟通记录；合作履约数据请进入合作管理查看。", `<button class="btn" onclick="setPage('kol')">返回达人库</button> <button class="btn" onclick="findSimilarCreators(${c.id})" title="按当前达人内容品类，在库内找相似达人">相似达人</button> <button class="btn" onclick="reviewCreatorOnTikTok(${c.id})" title="打开 TikTok 主页，插件自动体检最新内容并回流更新评分">审查达人 ↗</button> <button class="btn primary" onclick="openOutreachModal(${c.id})">发起建联</button>`)}
    <div class="detail-shell">
      <aside class="profile-panel">
        <div class="card creator-profile">
          ${creatorPortrait(c)}
          <h3 style="margin:0">${escapeHtml(c.nickname || c.username)}</h3>
          <div class="link">@${escapeHtml(c.username)}</div>
          <div style="margin-top:10px">${creatorVisibleTags(c)}</div>
          <div class="metric-pair">
            <div class="mini-metric"><b>${compactCount(c.followers)}</b><span class="muted">粉丝</span></div>
            <div class="mini-metric"><b>${escapeHtml(c.replyRate || "-")}</b><span class="muted">回复率</span></div>
          </div>
        </div>
        ${creatorPreEvalCard(c)}
        <div class="card">
          <h3>联系方式</h3>
          <p><b>TikTok主页：</b>${creatorProfileUrl(c) ? `<a class="link" href="${escapeHtml(creatorProfileUrl(c))}" target="_blank" rel="noopener">@${escapeHtml(c.username)} ↗</a>` : `@${escapeHtml(c.username)}`}</p>
          <p><b>WhatsApp：</b>${escapeHtml(c.whatsapp || "未提供")}</p>
          <p><b>Email：</b>${escapeHtml(c.email || "未提供")}</p>
        </div>
      </aside>
      <div class="work-panel">
        <div class="card chat-frame">
          <div class="tabs">
            ${["沟通记录", "合作记录", "基本信息"].map((t) => `<span class="tab ${detailTab === t ? "active" : ""}" onclick="setDetailTab('${t}')">${t}${t === "沟通记录" && records.length ? `(${records.length})` : ""}${t === "合作记录" && coops.length ? `(${coops.length})` : ""}</span>`).join("")}
          </div>
          ${detailTab === "沟通记录" ? `
            <div class="chat-thread">
            ${records.map((r) => `<div class="message ${r.status === "待我方回复" ? "inbound" : "outbound"}"><span class="badge">${escapeHtml(channelLabel(r.channel))}</span> ${badge(r.status)}<div class="message-body">${outreachMessageCell(r)}</div><span class="muted">${escapeHtml(r.updatedAt)}</span></div>`).join("") || `<div class="empty">暂无沟通记录。从达人库或下方按钮发起建联后，这里会沉淀全部对话。</div>`}
            </div>
            <div class="chat-input-bar">
              ${records[0]
                ? `<button class="btn primary" onclick="openConversation(${records[0].id})">进入会话回复（私信/邮箱自动区分）</button>`
                : `<button class="btn primary" onclick="openOutreachModal(${c.id})">发起建联</button>`}
            </div>
          ` : ""}
          ${detailTab === "合作记录" ? `
            <div class="timeline" style="padding:14px">
              ${coops.map((x) => `
                <div class="message">
                  <b>${escapeHtml(product(x.productId)?.name || "-")}</b>
                  <div style="margin-top:6px">${badge(detailCoopStage(x))} <span class="muted">负责人：${escapeHtml(x.owner || "-")}</span></div>
                  <div style="margin-top:10px"><button class="btn ghost" onclick="setPage('cooperations')">进入合作详情</button></div>
                </div>
              `).join("") || `<div class="empty">暂无合作记录。达人建联并产生合作后，这里会展示出单/履约。</div>`}
            </div>
          ` : ""}
          ${detailTab === "基本信息" ? creatorBasicInfoPanel(c) : ""}
        </div>
      </div>
    </div>
  `;
}

// 详情·基本信息面板
function creatorBasicInfoPanel(c) {
  const rows = [
    ["昵称", c.nickname || "-"],
    ["用户名", "@" + c.username],
    ["TikTok 主页", creatorProfileUrl(c) ? `<a class="link" href="${escapeHtml(creatorProfileUrl(c))}" target="_blank" rel="noopener">打开 ↗</a>` : "-"],
    ["达人类型", escapeHtml(normalizeCreatorType(c.type, c))],
    ["内容类目", creatorCategoryValues(c).map(escapeHtml).join(" / ") || "-"],
    ["地区", escapeHtml(c.region || "-")],
    ["粉丝", compactCount(c.followers)],
    ["TikTok GMV", escapeHtml(creatorGmvDisplay(c.gmv))],
    ["视频均播", creatorMetricValue(c, "avgVideoViews")],
    ["直播均观", creatorMetricValue(c, "avgLiveUv")],
    ["回复率", escapeHtml(creatorReplyRateDisplay(c.replyRate))],
  ];
  const contentCats = creatorContentCategories(c);
  if (creatorHasContentData(c)) {
    rows.push(["近期内容主题", (c.contentTopics || []).map(escapeHtml).join("、") || "-"]);
    rows.push(["内容涉及品类", contentCats.map(escapeHtml).join(" / ") || "-"]);
  }
  return `<div class="basic-info" style="padding:14px">
    <table class="kv-table">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
    ${c.bio ? `<p class="muted" style="margin-top:10px"><b>简介：</b>${escapeHtml(c.bio)}</p>` : ""}
  </div>`;
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

function paginationBar(scope, currentPage, totalPages, pageSize, totalRows, opts = {}) {
  const unit = opts.unit || "位达人";
  const onPage = opts.onPage || "setKolPage";
  const onSize = opts.onSize || "setKolPageSize";
  const pages = Array.from(new Set([
    1,
    Math.max(1, currentPage - 1),
    currentPage,
    Math.min(totalPages, currentPage + 1),
    totalPages,
  ])).filter((x) => x >= 1 && x <= totalPages).sort((a, b) => a - b);
  return `
    <div class="pagination-bar">
      <div class="muted">共 ${totalRows} ${unit}</div>
      <div class="pagination-controls">
        <button class="btn" ${currentPage <= 1 ? "disabled" : ""} onclick="${onPage}(${currentPage - 1})">上一页</button>
        ${pages.map((page, index) => `${index > 0 && page - pages[index - 1] > 1 ? `<span class="muted">...</span>` : ""}<button class="btn ${page === currentPage ? "primary" : ""}" onclick="${onPage}(${page})">${page}</button>`).join("")}
        <button class="btn" ${currentPage >= totalPages ? "disabled" : ""} onclick="${onPage}(${currentPage + 1})">下一页</button>
        <select class="select" onchange="${onSize}(this.value)">
          ${[20, 50, 100].map((size) => `<option value="${size}" ${Number(pageSize) === size ? "selected" : ""}>${size} 条/页</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function productImage(product) {
  return product?.imageUrl || product?.image || "";
}

function imgFallback(img, letter) {
  const span = document.createElement("span");
  span.textContent = letter;
  img.replaceWith(span);
}

function productThumb(product) {
  const image = productImage(product);
  const letter = (product?.name || "P").slice(0, 1).toUpperCase();
  if (image) return `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "")}" onerror="imgFallback(this,${JSON.stringify(letter)})" />`;
  return `<span>${escapeHtml(letter)}</span>`;
}

// 商品状态原始码 → 干净中文（不给 B 端看 API 原始码）
function productStatusLabel(status) {
  const s = String(status || "").trim().toUpperCase();
  const map = {
    ACTIVATE: "在售", ACTIVE: "在售", LIVE: "在售", PUBLISHED: "在售",
    SELLER_DEACTIVATED: "卖家下架", PLATFORM_DEACTIVATED: "平台下架",
    DEACTIVATED: "已下架", FROZEN: "已冻结", FREEZE: "已冻结",
    DELETED: "已删除", DRAFT: "草稿", PENDING: "审核中", REVIEWING: "审核中",
    FAILED: "审核未过", SUSPENDED: "已暂停",
  };
  return map[s] || (status ? "已同步" : "已同步");
}
function productStatusClass(status) {
  const s = String(status || "").trim().toUpperCase();
  if (["ACTIVATE", "ACTIVE", "LIVE", "PUBLISHED"].includes(s)) return "success";
  if (["SELLER_DEACTIVATED", "PLATFORM_DEACTIVATED", "DEACTIVATED", "DELETED", "FAILED", "FROZEN", "FREEZE", "SUSPENDED"].includes(s)) return "neutral";
  if (["DRAFT", "PENDING", "REVIEWING"].includes(s)) return "warning";
  return "neutral";
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
          <div><span class="status-pill ${productStatusClass(p.status)}">${escapeHtml(productStatusLabel(p.status))}</span></div>
          <div class="row-actions">
            <button class="btn" onclick="openProductModal(${p.id})">详情</button>
            <button class="btn ghost" onclick="goProductCoops(${p.id})">合作记录</button>
            <button class="btn ghost" onclick="startProductOutreach(${p.id})" ${productPromotable(p) ? "" : "disabled title='下架商品不可建联'"}>建联</button>
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
  const sortedProducts = [...state.products].sort((a, b) => (productPromotable(b) ? 1 : 0) - (productPromotable(a) ? 1 : 0));
  return `
    <div class="product-picker">
      ${sortedProducts.map((p) => `
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

function productPromotable(p) {
  const raw = String(p?.status || "").trim();
  if (!raw) return true; // 无状态默认可推广
  // 英文状态码：只有在售/激活可推广，下架/删除/冻结/草稿/审核一律不可
  const label = productStatusLabel(raw);
  const blockedLabels = ["卖家下架", "平台下架", "已下架", "已删除", "已冻结", "草稿", "审核中", "审核未过", "已暂停"];
  if (blockedLabels.includes(label)) return false;
  // 中文旧状态兜底
  const blockedZh = ["下架", "停售", "售罄", "失效", "草稿", "冻结", "不可推广", "未上架"];
  if (blockedZh.some((s) => raw.includes(s))) return false;
  return true;
}

function productMultiPicker(selectedIds = [state.products[0]?.id].filter(Boolean)) {
  if (!state.products.length) {
    return `<div class="empty panel-empty">还没有同步商品。请先完成店铺授权并同步商品，再发起定向邀约。</div>`;
  }
  const selected = new Set(selectedIds.map(Number));
  // 可用商品前置，不可用(下架等)全部沉底
  const sortedProducts = [...state.products].sort((a, b) => (productPromotable(b) ? 1 : 0) - (productPromotable(a) ? 1 : 0));
  return `
    <div id="selectedOutreachProducts" class="outreach-product-table">
      <div class="outreach-product-head">
        <span>选择</span>
        <span>商品信息</span>
        <span>价格/库存</span>
        <span>标准佣金率</span>
        <span>广告佣金</span>
      </div>
      ${sortedProducts.map((p) => {
        const promotable = productPromotable(p);
        const checked = promotable && selected.has(Number(p.id));
        const defaultRate = commissionDefault(p);
        const disabledAttr = promotable ? "" : "disabled";
        return `
          <div class="outreach-product-row ${checked ? "selected" : ""} ${promotable ? "" : "disabled"}">
            <label class="table-check">
              <input class="outreach-product-check" type="checkbox" value="${p.id}" ${checked ? "checked" : ""} ${disabledAttr} onchange="updateOutreachPreview()" />
            </label>
            <div class="product-main">
              <div class="product-thumb">${productThumb(p)}</div>
              <div class="product-info">
                <b class="product-title">${escapeHtml(p.name)} ${promotable ? "" : `<span class="badge neutral">不可选</span>`}</b>
                <div class="muted">ID：${escapeHtml(p.sourceId || p.id)} · ${escapeHtml(p.status || "已同步")}</div>
              </div>
            </div>
            <div>
              <b>${escapeHtml(p.price || "-")}</b>
              <div class="muted">库存 ${Number.isFinite(Number(p.stock)) ? Number(p.stock) : "-"}</div>
            </div>
            <label class="commission-input">
              <input id="standardCommission-${p.id}" class="input" type="number" min="1" max="80" value="${defaultRate}" ${disabledAttr} oninput="updateOutreachPreview()" />
              <span>%</span>
            </label>
            <label class="commission-input ad-commission">
              <input id="adCommissionEnabled-${p.id}" type="checkbox" ${disabledAttr} onchange="updateOutreachPreview()" />
              <input id="adCommission-${p.id}" class="input" type="number" min="1" max="80" placeholder="选填" ${disabledAttr} oninput="updateOutreachPreview()" />
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

function inviteCardSummaryHtml(products, sampleRule) {
  if (!products.length) return `<div class="muted">选择商品后生成邀约卡预览。</div>`;
  const cards = products.map((p) => {
    const std = p.standardCommissionRate != null ? p.standardCommissionRate : commissionDefault(p);
    const adRate = p.adCommissionEnabled && p.adCommissionRate ? p.adCommissionRate : 0;
    const letter = JSON.stringify((p.name || "P").slice(0, 1).toUpperCase());
    const thumb = p.imageUrl
      ? `<img src="${escapeHtml(p.imageUrl)}" alt="" onerror="imgFallback(this,${letter})" />`
      : `<span>${escapeHtml((p.name || "P").slice(0, 1).toUpperCase())}</span>`;
    return `
      <div class="invite-card-item">
        <div class="invite-card-thumb">${thumb}</div>
        <div class="invite-card-info">
          <b>${escapeHtml(p.name)}</b>
          <span class="invite-card-rate">标准佣金 ${std}%${adRate ? ` · 广告佣金 ${adRate}%` : ""}</span>
        </div>
      </div>`;
  }).join("");
  return `<div class="invite-card-list">${cards}</div><div class="muted" style="margin-top:8px">样品：${escapeHtml(sampleRule)}</div>`;
}

function initialInviteCardSummaryHtml(selectedProductIds) {
  const ids = new Set((selectedProductIds || []).map(Number));
  const products = state.products
    .filter((p) => ids.has(Number(p.id)) && productPromotable(p))
    .map((p) => ({ name: p.name, imageUrl: productImage(p), standardCommissionRate: commissionDefault(p), adCommissionEnabled: false, adCommissionRate: 0 }));
  return inviteCardSummaryHtml(products, "达人申请后审核");
}

function buildInviteCardSummary(products) {
  if (!products || !products.length) return "";
  const lines = products.map((p) => {
    const ad = p.adCommissionEnabled && p.adCommissionRate ? ` · 广告佣金 ${p.adCommissionRate}%` : "";
    return `· ${p.name}：标准佣金 ${p.standardCommissionRate}%${ad}`;
  });
  return `【合作邀约】\n${lines.join("\n")}\n样品：${outreachSampleRule()}`;
}

function updateOutreachPreview() {
  if (state.page !== "outreachWorkbench") return;
  const targets = outreachDraftTargets().filter((c) => !creatorOutreachBlockReason(c));
  const products = selectedOutreachProducts();
  const channels = getCheckedValues("outreachChannels");
  const createTarget = document.getElementById("createTargetCollaboration")?.checked !== false;
  const emailReady = targets.filter((c) => c.email).length;
  const productCount = document.getElementById("summaryProductCount");
  if (productCount) productCount.textContent = String(products.length);
  const targetPreview = document.getElementById("previewTargetCount");
  if (targetPreview) targetPreview.textContent = `${createTarget ? targets.length : 0} 条 · 创建官方邀约`;
  const imPreview = document.getElementById("previewImCount");
  if (imPreview) imPreview.textContent = `${channels.includes("TikTok私信") ? targets.length : 0} 条 · 站内私信通知`;
  const emailPreview = document.getElementById("previewEmailCount");
  if (emailPreview) emailPreview.textContent = `${channels.includes("Email") ? emailReady : 0} 条 · 邮件发送，缺邮箱进入补充任务`;
  const inviteEl = document.getElementById("inviteCardPreview");
  if (inviteEl) {
    const cardOn = createTarget && document.getElementById("sendInviteCard")?.checked !== false;
    inviteEl.innerHTML = cardOn ? inviteCardSummaryHtml(products, outreachSampleRule()) : `<div class="muted">未启用邀约卡。</div>`;
  }
  document.querySelectorAll(".outreach-product-row").forEach((row) => {
    row.classList.toggle("selected", Boolean(row.querySelector(".outreach-product-check")?.checked));
  });
}

function personCell(c) {
  if (!c) return "-";
  return `
    <div class="person">
      <span class="avatar">${creatorAvatarSrc(c) ? `<img src="${escapeHtml(creatorAvatarSrc(c))}" alt="${escapeHtml(c.username)}" loading="lazy" onerror="this.parentNode.textContent='${escapeHtml(c.username.slice(0, 1).toUpperCase())}'" />` : escapeHtml(c.username.slice(0, 1).toUpperCase())}</span>
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
        <div class="modal-head"><h3 id="modalTitle" style="margin:0"></h3><button class="modal-x" onclick="closeModal()" aria-label="关闭" title="关闭">✕</button></div>
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
    outreachWorkbench: renderOutreachWorkbench,
    conversation: renderConversation,
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
  // 重渲染会重建 DOM → 输入框失焦（搜索栏打一个字就停）。先记住焦点+光标，渲染后还原。
  const active = document.activeElement;
  const focusId = active && active.id ? active.id : null;
  const selStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
  const selEnd = active && typeof active.selectionEnd === "number" ? active.selectionEnd : null;
  const content = state.selectedCreatorId ? renderCreatorDetail() : (routes[state.page] || renderDashboard)();
  document.getElementById("app").innerHTML = appLayout(content);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      if (selStart != null && typeof el.setSelectionRange === "function") {
        try { el.setSelectionRange(selStart, selEnd); } catch (e) {}
      }
    }
  }
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

function setProductPage(page) {
  state.filters.productPage = Math.max(1, Number(page) || 1);
  saveState();
  render();
}

function setProductPageSize(size) {
  state.filters.productPageSize = Number(size) || 20;
  state.filters.productPage = 1;
  saveState();
  render();
}

function setDetailTab(tab) {
  state.detailTab = tab;
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
  state.detailTab = "沟通记录";
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

// 切换店铺并静默重拉该店商品（多店铺：每店商品独立）
function switchTikTokShop(cipher) {
  const prev = state.settings.selectedTikTokShopCipher;
  selectTikTokShop(cipher);
  if (state.settings.selectedTikTokShopCipher && state.settings.selectedTikTokShopCipher !== prev) {
    state.tiktokSamples = undefined; // 切店重载样品
    syncProducts({ silent: true });
  }
}

function channelOptionsForCreators(targets, currentChannel = "") {
  const list = [];
  const add = (value, text = value) => list.push([value, text]);
  if (channelEnabled("TikTok私信")) add("TikTok私信");
  if (channelEnabled("Email")) add("Email");
  if (!list.length && currentChannel && channelEnabled(currentChannel)) add(currentChannel);
  return list;
}

function validateChannelForCreators(channel, targets) {
  if (!channelEnabled(channel)) {
    alert(`${channel} 已被平台设置关闭，不能用于新建联或回复。`);
    return false;
  }
  return true;
}

function emailAccountConfigured() {
  return Boolean(state.settings.emailConnected && state.settings.emailAddress && state.settings.emailAppPassword);
}

function channelLabel(channel) {
  if (channel === "TikTok定向邀约") return "TikTok定向邀约";
  if (channel === "TikTok私信") return "TikTok私信";
  if (channel === "Email") return "Email";
  return channel || "-";
}

function isTargetInviteChannel(channel) {
  return channel === "TikTok定向邀约";
}

function tiktokChannelType(channel) {
  if (isTargetInviteChannel(channel)) return "target_invite";
  if (channel === "TikTok私信") return "tiktok_im";
  return "";
}

function validateChannelsForCreators(channels, targets) {
  if (!channels.length) {
    alert("请至少选择一个发送渠道。");
    return false;
  }
  for (const channel of channels) {
    if (!validateChannelForCreators(channel, targets)) return false;
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
  state.settings.tiktokBackendStatus = data.configured ? "服务已就绪" : `配置待完成：${(data.missing || []).join(", ") || "未知"}`;
  state.settings.tiktokTokenSavedAt = data.token?.saved_at || state.settings.tiktokTokenSavedAt || "";
  state.settings.apiStatus = data.token ? "已授权" : (data.configured ? "待OAuth授权" : "配置不完整");
  state.settings.tiktokConnected = Boolean(data.token);
}

async function checkTikTokBackend() {
  try {
    const data = await apiRequest("/api/health");
    applyBackendHealth(data);
    state.settings.tiktokLastAuthCheck = nowText();
    addSyncLog("连接服务", data.configured ? "可用" : "配置不完整", state.settings.tiktokBackendStatus);
    saveState();
    render();
    alert(`连接服务检查完成：${state.settings.tiktokBackendStatus}`);
  } catch (error) {
    state.settings.tiktokBackendStatus = "服务未连接";
    state.settings.apiStatus = "服务未连接";
    addSyncLog("连接服务", "服务未连接", "连接服务暂时不可用，请稍后重试。");
    saveState();
    render();
    alert("后端未启动。请先运行 start-api-8015.bat 或 start-full.bat。");
  }
}

async function startTikTokAuth() {
  try {
    const data = await apiRequest("/api/tiktok/auth-url");
    state.settings.apiStatus = "等待授权";
    state.settings.tiktokBackendStatus = "服务已就绪";
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

async function checkTikTokShops(options = {}) {
  const silent = Boolean(options.silent);
  try {
    const data = await apiRequest("/api/tiktok/shops");
    const shops = data.shops || [];
    const firstShop = shops[0];
    const prevCipher = state.settings.selectedTikTokShopCipher;
    const selected = shops.find((shop) => shopCipher(shop) === prevCipher) || firstShop;
    const shopsChanged = JSON.stringify((state.settings.tiktokShops || []).map(shopCipher)) !== JSON.stringify(shops.map(shopCipher));
    state.settings.tiktokConnected = true;
    state.settings.apiStatus = firstShop ? "已绑定店铺" : "未返回店铺";
    state.settings.tiktokBackendStatus = "已连接 TikTok";
    state.settings.tiktokShops = shops;
    state.settings.selectedTikTokShopCipher = selected ? shopCipher(selected) : "";
    state.settings.tiktokShopName = selected ? shopLabel(selected) : "";
    state.settings.tiktokShopCipher = selected ? shopCipher(selected) : "";
    state.settings.tiktokTokenSavedAt = data.token?.saved_at || state.settings.tiktokTokenSavedAt || "";
    state.settings.tiktokLastAuthCheck = nowText();
    if (!silent) {
      addSyncLog("店铺绑定", state.settings.apiStatus, firstShop ? `已读取 ${shops.length} 个授权店铺；当前同步：${state.settings.tiktokShopName}` : "TikTok 已授权，但没有返回店铺列表。");
      pushMessage("店铺绑定", firstShop ? `已读取 TikTok Shop 授权店铺 ${shops.length} 个；当前同步：${state.settings.tiktokShopName}` : "TikTok Shop 已授权，但未返回店铺列表。");
    }
    saveState();
    render();
    // 仅在店铺列表有变化（如新授权了店）时才重拉商品，避免每次进页面都拉
    if (firstShop && (!silent || shopsChanged)) {
      await syncProducts({ silent: true });
    }
  } catch (error) {
    const reason = error.message || "读取已授权店铺失败。";
    if (!silent) {
      state.settings.apiStatus = "店铺读取失败";
      addSyncLog("店铺绑定", "失败", reason);
      saveState();
      render();
      showApiHandoffSteps("店铺绑定", reason);
    }
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

// 拉官方寄样申请（建联后·样品成功率）
async function loadTikTokSamples(options = {}) {
  try {
    const data = await apiRequest("/api/tiktok/samples", {
      method: "POST",
      body: JSON.stringify({ shop_cipher: state.settings.tiktokShopCipher || "" }),
    });
    state.tiktokSamples = Array.isArray(data.applications) ? data.applications : [];
    state.settings.lastSampleSync = nowText();
    if (!options.silent) pushMessage("寄样同步", `已从官方接口同步 ${state.tiktokSamples.length} 条寄样申请。`);
    saveState();
    render();
  } catch (e) {
    state.tiktokSamples = state.tiktokSamples || [];
    if (!options.silent) pushMessage("寄样同步失败", e.message || "拉取官方寄样数据失败。");
  }
}
function maybeAutoLoadSamples() {
  if (state.tiktokSamples !== undefined) return;
  state.tiktokSamples = []; // 占位，防重复触发
  setTimeout(() => loadTikTokSamples({ silent: true }), 0);
}
function flagRiskCreator(key) {
  if (!key) return;
  const reason = prompt("标记风险类型（骗样 / 不履约 / 沟通差 / 未按时发布）", "不履约");
  if (reason == null) return;
  state.creatorRiskFlags = state.creatorRiskFlags || {};
  state.creatorRiskFlags[key] = reason.trim() || "已标记风险";
  saveState();
  render();
}
function clearRiskFlag(key) {
  if (state.creatorRiskFlags) delete state.creatorRiskFlags[key];
  saveState();
  render();
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
    // 把当前店铺商品品类 + 产品名/关键词推给后端，供扩展算"内容契合"（产品级，不只大类目）
    try {
      const cats = [...new Set(state.products.map((p) => normalizeCreatorCategoryLabel(String(p.category || "").trim())).filter(Boolean))];
      const productNames = [...new Set(state.products.map((p) => String(p.name || p.title || "").trim()).filter(Boolean))].slice(0, 60);
      const productKeywords = productNamesToKeywords(productNames);
      apiRequest("/api/merchant/context", { method: "POST", body: JSON.stringify({ categories: cats, productNames, productKeywords, shopName: state.settings.tiktokShopName || "" }) }).catch(() => {});
    } catch (e) { /* ignore */ }
    state.settings.apiStatus = "商品已同步";
    state.settings.tiktokBackendStatus = "已连接 TikTok";
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
  const uname = String(row.username || "").trim().toLowerCase();
  const identity = row.sourceId || uname || "";
  if (shopKey && identity) keys.push(`${shopKey}:${identity}`);
  if (!shopKey && row.sourceId) keys.push(String(row.sourceId));
  if (!shopKey && uname) keys.push(`u:${uname}`);
  return keys;
}

// 前端去重：localStorage 里可能残留旧的重复达人（同一 username 两行）。
// 按小写 username 合并成一行——保留资料最全的，并入联系方式/建联历史。
function dedupeStateCreators() {
  const groups = new Map();
  for (const c of state.creators) {
    const u = String(c.username || "").trim().toLowerCase();
    const key = u || ("__id_" + c.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  let removed = 0;
  const merged = [];
  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "" && v !== "-");
  for (const rows of groups.values()) {
    if (rows.length === 1) { merged.push(rows[0]); continue; }
    removed += rows.length - 1;
    const fresh = rows.find((r) => r.sourceId) || rows[0];
    const base = { ...fresh, id: Math.min(...rows.map((r) => Number(r.id) || Infinity)) };
    for (const f of ["email", "whatsapp", "instagram", "wechat", "contactPerson"]) base[f] = pick(base[f], ...rows.map((r) => r[f])) || base[f] || "";
    base.legacyOutreach = pick(base.legacyOutreach, ...rows.map((r) => r.legacyOutreach)) || null;
    base.recentPerf = pick(base.recentPerf, ...rows.map((r) => r.recentPerf)) || base.recentPerf || null;
    merged.push(base);
  }
  // 第二遍：交叉合并老库"用户名/昵称写反"的孤儿——legacy 行的 nickname 命中了某平台行的 username。
  // （老库把人名存进了 username、真 handle 存进 nickname；平台行才有正确 handle+头像+sourceId）
  const norm = (s) => String(s || "").trim().toLowerCase();
  const platByUser = new Map();
  for (const c of merged) if (c.sourceId) platByUser.set(norm(c.username), c);
  const keep = [];
  for (const c of merged) {
    if (!c.sourceId) {
      const t = platByUser.get(norm(c.nickname));
      if (t && norm(c.username) !== norm(t.username)) {
        for (const f of ["email", "whatsapp", "instagram", "wechat", "contactPerson"]) t[f] = pick(t[f], c[f]) || t[f] || "";
        t.legacyOutreach = pick(t.legacyOutreach, c.legacyOutreach) || null;
        removed += 1;
        continue; // 丢弃孤儿
      }
    }
    keep.push(c);
  }
  if (removed) {
    state.creators = keep;
    // 选中项/批量选若指向被合并掉的 id，清理
    state.bulkCreatorIds = (state.bulkCreatorIds || []).filter((id) => keep.some((c) => c.id === id));
  }
  return removed;
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
    const deduped = dedupeStateCreators();
    if (deduped) addSyncLog("平台达人库", "去重", `合并了 ${deduped} 个重复达人。`);
    platformCreatorLibraryLoaded = true;
    if (creators.length) {
      addSyncLog("平台达人库", "已读取", `已从平台达人库读取 ${creators.length} 个达人。`);
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
  state.systemMessages.unshift({ id: Date.now(), type: "接入状态", text: "已标记 Partner 账号登录。下一步需要配置应用权限、client_key/client_secret 和回调地址。", at: nowText(), read: false });
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
  addSyncLog("接入配置", state.settings.apiStatus, "本地接入配置已保存；保存配置不会触发真实同步。");
  pushMessage("接入配置", `TikTok 本地配置已保存，状态：${state.settings.apiStatus}。`);
  saveState();
  render();
}

function markApiAuthBlocked() {
  state.settings.apiStatus = "授权阻塞";
  state.settings.tiktokLastAuthCheck = nowText();
  addSyncLog("店铺授权", "授权阻塞", "需要人工处理授权确认、验证码、权限审批或 redirect URL 配置。");
  pushMessage("店铺授权阻塞", "TikTok 店铺接入需要人工处理授权确认、验证码、权限审批或 redirect URL 配置。");
  saveState();
  render();
  showApiHandoffSteps("店铺授权阻塞", "需要人工处理授权确认、验证码、权限审批或 redirect URL 配置。");
}

function showApiHandoffSteps(module = "TikTok 店铺接入", reason = "") {
  const steps = [
    "1. 确认 TikTok Shop Partner Center 已登录，且当前店铺有 Affiliate 权限。",
    "2. 在 Partner App 中确认商品、达人、消息、订单权限已开通或审批通过。",
    "3. 配置 OAuth Redirect URL，本地建议使用 http://127.0.0.1:8015/api/tiktok/callback。",
    "4. 将 client_key 填到平台设置；client_secret 只放本地服务环境变量，不写入浏览器。",
    "5. 若出现授权确认、验证码、人机校验、风控弹窗或权限缺失，请在浏览器完成后再回来同步。",
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
  logOperation("入驻审批", row.merchant, `状态变更为：${status}；接入状态：${row.apiStatus}`);
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
  alert("产品数据应来自 TikTok Shop 官方商品源。本地版本不允许手动新增，避免和真实店铺商品冲突。");
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
  const source = state.settings.tiktokConnected ? "待授权后由 TikTok Shop 官方商品源同步" : "未完成 TikTok 授权，暂无真实商品源";
  openModal("商品详情", `
    <div class="notice">商品、价格、佣金和合作模式应来自 TikTok Shop 官方商品源；当前只读展示，不支持本地手动新增或改写真实商品源。</div>
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

// 商品「建联」：建联从达人库发起。带上商品上下文，进达人库选人，一键建联时自动选中该商品。
function startProductOutreach(id) {
  const row = product(id);
  if (!row) return;
  if (!productPromotable(row)) return alert("该商品当前状态不可推广，无法用于建联。");
  state.outreachContextProductId = id;
  closeModal();
  saveState();
  navigateHash("kol");
}
function clearOutreachContext() {
  state.outreachContextProductId = null;
  saveState();
  render();
}

// #4/#8 审查达人：打开其 TikTok 主页 → Compass 采集器自动体检最新内容 → 回流更新评分。
// BD 只点一个按钮，不用手动操作扩展。
function reviewCreatorOnTikTok(id) {
  const c = creator(id);
  if (!c) return;
  const url = creatorProfileUrl(c);
  if (!url) return alert("缺少该达人的 TikTok 主页地址，无法审查。");
  window.open(url, "_blank", "noopener");
  pushMessage("审查达人", `已打开 @${c.username} 的 TikTok 主页。装了 Compass 采集器会自动体检其最新内容并回流；稍后回到本页刷新，评分与带货信号即更新。`);
}

// 标杆达人的全部品类（内容实证 + 库存类目）
function creatorAllCategories(c) {
  const set = new Set();
  creatorContentCategories(c).forEach((v) => v && set.add(v));
  (typeof creatorCategoryValues === "function" ? creatorCategoryValues(c) : []).forEach((v) => v && set.add(String(v)));
  return [...set];
}

// 相似度（0-130）：和标杆达人比 —— 类目重合(主) + 粉丝量级相近 + 带货度相近。
// 不同类目直接判不相似（返回 -1，从结果剔除）。
function creatorSimilarity(c, b) {
  if (!c || !b || c.id === b.id) return -1;
  const bCats = new Set(creatorAllCategories(b));
  if (!bCats.size) return -1;
  const overlap = creatorAllCategories(c).filter((x) => bCats.has(x)).length;
  if (!overlap) return -1; // 类目不重合 = 不相似
  let score = Math.min(overlap, 3) * 30; // 类目重合，最多 90
  const bf = Math.log10((Number(b.followers) || 0) + 10);
  const cf = Math.log10((Number(c.followers) || 0) + 10);
  score += Math.max(0, 25 - Math.abs(bf - cf) * 18); // 粉丝量级越接近越高，最多 25
  const be = (b.recentPerf && Number(b.recentPerf.ecVideoCount)) || 0;
  const ce = (c.recentPerf && Number(c.recentPerf.ecVideoCount)) || 0;
  if (be > 0 && ce > 0) score += 15; // 都有带货频率
  else if (ce > 0) score += 8;
  return Math.round(score);
}

// #6 相似达人：在库内按"和标杆达人的类目+粉丝量级+带货度"加权排序（官方"找相似"需服务商权限，先用库内）
function findSimilarCreators(id) {
  const c = creator(id);
  if (!c) return;
  if (!creatorAllCategories(c).length) return alert("该达人暂无可用于匹配的内容品类。建议先点「审查达人」采集近期内容后再找相似。");
  state.similarToCreatorId = id;
  state.filters.kolCategories = []; // 由相似度统一排序，不再用粗筛
  state.filters.kolSearch = "";
  state.filters.kolPage = 1;
  state.selectedCreatorId = null;
  saveState();
  navigateHash("kol");
  pushMessage("相似达人", `已按 @${c.username} 的类目 / 粉丝量级 / 带货度，在达人库加权排序相似达人。`);
}

function clearSimilar() {
  state.similarToCreatorId = null;
  state.filters.kolPage = 1;
  saveState();
  render();
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

// 单条渠道记录的精细动作（绑定到具体某条渠道，放进详情弹窗，避免在归纳后的行里作用到隐藏的重复记录）。
function outreachRecordActions(o) {
  const parts = [];
  if (["待API发送", "发送失败", "等待定向邀约"].includes(o.status)) {
    parts.push(`<button class="btn" onclick="submitOutreachApi(${o.id})">${o.status === "待API发送" ? "提交发送" : "重新提交"}</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '发送失败')">标记发送失败</button>`);
  }
  if (o.apiResult || o.apiError || o.status === "定向邀约待配置" || o.status === "API结果待确认") {
    parts.push(`<button class="btn ghost" onclick="openOutreachApiResult(${o.id})">查看提交结果</button>`);
  }
  if (o.channel === "Email" && o.status === "邮箱配置待完成") {
    parts.push(`<button class="btn" onclick="openEmailSetupModal('outreach')">配置邮箱</button>`);
  }
  if (o.status === "待回复") parts.push(`<button class="btn" onclick="advanceOutreach(${o.id}, '待我方回复')">标记已回复</button>`);
  if (o.status === "待我方回复") {
    parts.push(`<button class="btn" onclick="createSampleFromOutreach(${o.id})">安排寄样</button>`);
    parts.push(`<button class="btn ghost" onclick="createCoopFromOutreach(${o.id})">进入合作</button>`);
  }
  if ((state.settings.viewRole || "B端") === "平台方") {
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'待回复')">测试·标记已发送</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'待我方回复')">测试·模拟达人回复</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'已转合作')">测试·进合作</button>`);
  }
  if (o.status !== "已关闭") parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '已关闭')">结束此渠道跟进</button>`);
  parts.push(`<button class="btn ghost danger" onclick="deleteOutreach(${o.id})">删除此条</button>`);
  return parts.join(" ");
}

function openOutreachDetail(id) {
  const ref = state.outreach.find((x) => x.id === id);
  if (!ref) return;
  const c = creator(ref.creatorId);
  const records = creatorOutreachRecords(ref.creatorId);
  const body = `
    <div class="muted" style="margin-bottom:10px">@${escapeHtml(c?.username || "-")} 的全部建联渠道（${records.length} 条）。每个渠道的操作各自独立；操作后关闭弹窗即可在记录列表看到最新状态。</div>
    ${records.map((o) => `
      <div class="detail-record">
        <div class="detail-record-head">
          <span class="badge">${escapeHtml(channelLabel(o.channel))}</span>
          <span class="badge">${escapeHtml(statusLabelForView(o.status))}</span>
          ${o.inviteCard ? `<span class="badge info">邀约卡</span>` : ""}
          <span class="muted">${escapeHtml(o.updatedAt || "")}</span>
        </div>
        <div class="form-field" style="margin-top:8px"><label>产品</label><div>${outreachProductCell(o)}</div></div>
        <div class="form-field" style="margin-top:8px"><label>最后消息</label><div style="white-space:pre-wrap">${escapeHtml(o.lastMessage || "-")}</div></div>
        <div class="detail-record-actions filters">${outreachRecordActions(o)}</div>
      </div>
    `).join("")}
  `;
  openModal(`建联详情 · @${escapeHtml(c?.username || "-")}`, body, `<button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="closeModal();openConversation(${ref.id})">查看沟通</button>`);
}

function outreachActions(o) {
  const parts = [
    `<button class="btn ghost" onclick="openOutreachDetail(${o.id})">详情</button>`,
    `<button class="btn ghost" onclick="openConversation(${o.id})">查看沟通</button>`,
  ];
  if ((state.settings.viewRole || "B端") === "平台方") {
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'待回复')">测试·标记已发送</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'待我方回复')">测试·模拟达人回复</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id},'已转合作')">测试·进合作</button>`);
  }
  if (o.apiResult || o.apiError) {
    parts.push(`<button class="btn ghost" onclick="openOutreachApiResult(${o.id})">查看提交结果</button>`);
  }
  if (o.channel === "Email" && o.status === "邮箱配置待完成") {
    parts.push(`<button class="btn" onclick="openEmailSetupModal('outreach')">配置邮箱</button>`);
  }
  if (!isTargetInviteChannel(o.channel) && o.status !== "已关闭" && o.status !== "已转合作") {
    parts.push(`<button class="btn" onclick="openReplyModal(${o.id})">回复</button>`);
  }
  if (["待API发送", "发送失败", "等待定向邀约"].includes(o.status)) {
    parts.push(`<button class="btn" onclick="submitOutreachApi(${o.id})">${o.status === "待API发送" ? "提交发送" : "重新提交"}</button>`);
    parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '发送失败')">标记发送失败</button>`);
  }
  if (o.status === "定向邀约待配置" || o.status === "API结果待确认") {
    parts.push(`<button class="btn" onclick="openOutreachApiResult(${o.id})">查看提交结果</button>`);
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

function markOutreachApiSubmitted(id, apiResult = null) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const target = targetCollaboration(row.targetCollaborationId);
  const targetRow = isTargetInviteChannel(row.channel);
  const targetBlocked = targetRow && isTargetSchemaRequired(apiResult);
  const officialId = targetRow ? targetOfficialId(apiResult) : "";
  const targetNeedsConfirmation = targetRow && target && !targetBlocked && !officialId;
  row.status = targetBlocked ? "定向邀约待配置" : (targetNeedsConfirmation ? "API结果待确认" : "待回复");
  row.updatedAt = nowText();
  row.apiResult = apiResult;
  row.lastMessage = targetRow
    ? (targetBlocked
      ? `[${row.updatedAt}] TikTok 定向邀约未提交：官方邀约字段待确认，请查看提交结果。\n${row.lastMessage || ""}`
      : targetNeedsConfirmation
        ? `[${row.updatedAt}] TikTok 已返回结果，但未拿到官方定向邀约编号；请查看提交结果确认是否存在冲突、无效达人或权限限制。\n${row.lastMessage || ""}`
        : `[${row.updatedAt}] TikTok 定向邀约已提交，等待达人接受。\n${row.lastMessage || ""}`)
    : `[${row.updatedAt}] ${channelLabel(row.channel)} 已提交，等待达人回复。\n${row.lastMessage || ""}`;
  if (target && targetRow) {
    target.status = targetBlocked ? "定向邀约待配置" : (targetNeedsConfirmation ? "API结果待确认" : "待达人接受");
    target.apiResult = apiResult?.target_collaboration || null;
    if (officialId) target.officialId = officialId;
    target.updatedAt = nowText();
    state.outreach.forEach((item) => {
      if (item.id === row.id || item.targetCollaborationId !== target.id) return;
      if (isTargetInviteChannel(item.channel)) {
        if (!["待API发送", "API结果待确认"].includes(item.status)) return;
        item.status = row.status;
        item.apiResult = apiResult;
        item.updatedAt = row.updatedAt;
        item.lastMessage = `[${row.updatedAt}] 同批 TikTok 定向邀约状态已同步：${outreachStatusLabel(item.status)}。\n${item.lastMessage || ""}`;
        return;
      }
      if (!targetReadyForNotifications(target)) return;
      if (item.status === "等待定向邀约") {
        item.status = "待API发送";
        item.updatedAt = row.updatedAt;
        item.lastMessage = `[${row.updatedAt}] TikTok 定向邀约已成功，可继续提交 ${channelLabel(item.channel)}。\n${item.lastMessage || ""}`;
      }
    });
  }
  pushMessage("建联提交状态", targetBlocked
    ? `@${creator(row.creatorId)?.username || "-"} 的 TikTok 定向邀约仍需确认官方字段。`
    : targetNeedsConfirmation
      ? `@${creator(row.creatorId)?.username || "-"} 的定向邀约结果缺少官方编号，请检查提交结果。`
      : `@${creator(row.creatorId)?.username || "-"} 的${channelLabel(row.channel)}记录已提交。`);
  saveState();
  render();
}

function outreachApiMessage(row) {
  if (row.messageText) return row.translatedMessage || row.messageText;
  return String(row.lastMessage || "")
    .replace(/^.*?·\s*/, "")
    .replace(/\n定向邀约：[\s\S]*$/m, "")
    .replace(/\n商品：[\s\S]*$/m, "")
    .trim();
}

function outreachShopCipher(row, c) {
  return c?.sourceShopCipher || state.settings.tiktokShopCipher || state.settings.selectedTikTokShopCipher || "";
}

function emailSmtpPayload(row, c) {
  return {
    smtp: {
      host: state.settings.emailSmtpHost,
      port: Number(state.settings.emailSmtpPort || 587),
      username: state.settings.emailAddress,
      password: state.settings.emailAppPassword,
      secure: Number(state.settings.emailSmtpPort || 587) === 465,
    },
    message: {
      from: state.settings.emailAddress,
      to: c?.email || "",
      subject: `合作邀约：${outreachProductNames(row)}`,
      text: outreachApiMessage(row),
    },
  };
}

function targetApiPayload(target, row, c) {
  if (!target) return null;
  const creatorOpenIds = Array.from(new Set([
    ...(target.creatorIds || []).map((id) => creator(id)?.sourceId).filter(Boolean),
    c?.sourceId,
  ].filter(Boolean)));
  const creatorUsernames = Array.from(new Set([
    ...(target.creatorIds || []).map((id) => creator(id)?.username).filter(Boolean),
    c?.username,
  ].filter(Boolean)));
  return {
    id: target.id,
    officialId: target.officialId || "",
    name: target.name,
    creator_open_ids: creatorOpenIds,
    creator_usernames: creatorUsernames,
    products: target.products || row.productsSnapshot || [],
    expiresAt: target.expiresAt,
    deliverables: target.deliverables || [],
    sampleRule: target.sampleRule,
    contactName: target.contactName,
    contactEmail: target.contactEmail,
    shop_cipher: outreachShopCipher(row, c),
  };
}

function isTargetSchemaRequired(apiResult) {
  return apiResult?.target_collaboration?.ok === false
    && apiResult.target_collaboration.code === "TARGET_COLLABORATION_SCHEMA_REQUIRED";
}

function targetOfficialId(apiResult) {
  const target = apiResult?.target_collaboration || apiResult || {};
  return target.official_id
    || target.officialId
    || target.upstream?.data?.target_collaboration?.id
    || target.upstream?.data?.id
    || target.upstream?.data?.target_collaboration_id
    || "";
}

function targetReadyForNotifications(target) {
  if (!target) return true;
  return Boolean(target.officialId || target.status === "待达人接受");
}

function targetNotificationBlockReason(row) {
  if (!row || isTargetInviteChannel(row.channel)) return "";
  const target = targetCollaboration(row.targetCollaborationId);
  if (!target || targetReadyForNotifications(target)) return "";
  if (target.status === "定向邀约待配置") return "TikTok 定向邀约字段待确认";
  if (target.status === "API提交失败" || target.status === "发送失败") return "TikTok 定向邀约提交失败";
  if (target.status === "API结果待确认") return "TikTok 定向邀约结果缺少官方编号";
  return "TikTok 定向邀约尚未成功提交";
}

function markRowWaitingForTarget(row, reason) {
  if (!row) return;
  row.status = "等待定向邀约";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] ${channelLabel(row.channel)} 暂停发送：${reason}。请先完成同批 TikTok 定向邀约。\n${row.lastMessage || ""}`;
  pushMessage("建联发送暂停", `@${creator(row.creatorId)?.username || "-"} 的 ${channelLabel(row.channel)} 已暂停：${reason}。`);
  saveState();
  render();
}

function localTargetSchemaRequiredResult(target, row, c) {
  return {
    ok: false,
    code: "TARGET_COLLABORATION_SCHEMA_REQUIRED",
    endpoint: "POST /affiliate_seller/202508/target_collaborations",
    message: "TikTok 官方邀约字段待确认，不能标记为已发送。",
    payload_preview: targetApiPayload(target, row, c),
  };
}

async function submitTargetCollaborationForRow(row, c) {
  const target = targetCollaboration(row.targetCollaborationId);
  if (!target) return null;
  const data = await apiRequest("/api/tiktok/outreach/submit", {
    method: "POST",
    body: JSON.stringify({
      outreach: {
        id: row.id,
        channel: row.channel,
        channel_type: tiktokChannelType(row.channel),
        shop_cipher: outreachShopCipher(row, c),
        creator_open_id: c.sourceId,
        creator_username: c.username,
        message: outreachApiMessage(row),
        product_ids: (row.productsSnapshot || []).map((p) => p.sourceId || p.id).filter(Boolean),
      },
      target_collaboration: targetApiPayload(target, row, c),
    }),
  });
  const officialId = targetOfficialId(data);
  target.status = officialId ? "待达人接受" : "API结果待确认";
  target.apiResult = data.target_collaboration || null;
  if (officialId) target.officialId = officialId;
  target.updatedAt = nowText();
  return data.target_collaboration || null;
}

function applyTargetSchemaBlock(row, target, result) {
  if (!row || !target) return;
  row.status = "定向邀约待配置";
  row.apiResult = result;
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] TikTok 定向邀约未提交：官方邀约字段待确认，请查看提交结果。\n${row.lastMessage || ""}`;
  target.status = "定向邀约待配置";
  target.apiResult = result?.target_collaboration || null;
  target.updatedAt = row.updatedAt;
}

function openOutreachApiResult(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const target = targetCollaboration(row.targetCollaborationId);
  const result = row.apiResult || row.apiError || {};
  const targetResult = result.target_collaboration || target?.apiResult || null;
  const targetMessage = targetResult?.message || result?.message || row.apiError?.message || "";
  const targetCode = targetResult?.code || result?.code || row.apiError?.code || "";
  openModal("提交结果", `
    <div class="notice ${isTargetSchemaRequired(result) ? "warning" : "soft"}">
      <b>当前状态：</b>${escapeHtml(outreachStatusLabel(row.status) || "-")}<br>
      ${targetResult ? `TikTok 定向邀约：${escapeHtml(targetResult.ok ? "已返回" : "需要处理")}` : "当前记录还没有定向邀约提交结果。"}
    </div>
    <div class="form-grid" style="margin-top:12px">
      <div class="info-card"><span>触达渠道</span><b>${escapeHtml(channelLabel(row.channel))}</b></div>
      <div class="info-card"><span>商品数</span><b>${Array.isArray(row.productsSnapshot) ? row.productsSnapshot.length : 0}</b></div>
      <div class="info-card"><span>更新时间</span><b>${escapeHtml(row.updatedAt || "-")}</b></div>
    </div>
    ${target ? `<div class="modal-section-title">定向邀约草稿</div>
      <div class="target-summary"><b>${escapeHtml(target.name)}</b><span>${escapeHtml(targetCollaborationStatusText(target))}</span><span>商品 ${target.productIds.length} 个 · 达人 ${target.creatorIds.length} 位</span></div>` : ""}
    <div class="modal-section-title">处理建议</div>
    <div class="notice soft">
      ${targetCode ? `<div><b>返回码：</b>${escapeHtml(targetCode)}</div>` : ""}
      ${targetMessage ? `<div><b>说明：</b>${escapeHtml(targetMessage)}</div>` : "<div>暂无额外说明。若提交失败，请检查店铺授权、达人是否可邀约、商品佣金和有效期。</div>"}
    </div>
  `);
}

async function submitOutreachApi(id) {
  const row = state.outreach.find((x) => x.id === id);
  const c = row ? creator(row.creatorId) : null;
  if (!row || !c) return;
  if (row.channel === "Email") {
    if (!emailAccountConfigured()) {
      row.status = "邮箱配置待完成";
      row.updatedAt = nowText();
      row.lastMessage = `[${row.updatedAt}] Email 发送暂停：请先完成发信邮箱配置。\n${row.lastMessage || ""}`;
      pushMessage("邮箱配置", "Email 建联已保存，完成发信邮箱配置后可继续提交。");
      saveState();
      render();
      openEmailSetupModal("outreach");
      alert("Email 尚未完成发信邮箱配置。请先填写邮箱账号和应用专用密码。");
      return;
    }
    if (!c.email) {
      row.status = "联系方式补充中";
      row.updatedAt = nowText();
      row.lastMessage = `[${row.updatedAt}] Email 发送暂停：达人邮箱缺失，已进入联系方式补充。\n${row.lastMessage || ""}`;
      pushMessage("联系方式补充", `@${c.username} 缺少 Email，无法发送邮件建联。`);
      saveState();
      render();
      return;
    }
    const targetBlockReason = targetNotificationBlockReason(row);
    if (targetBlockReason) {
      markRowWaitingForTarget(row, targetBlockReason);
      return;
    }
    try {
      const data = await apiRequest("/api/email/outreach/send", {
        method: "POST",
        body: JSON.stringify(emailSmtpPayload(row, c)),
      });
      row.status = "待回复";
      row.updatedAt = nowText();
      row.apiResult = data;
      row.lastMessage = `[${row.updatedAt}] Email 已提交发送，等待达人回复。\n${row.lastMessage || ""}`;
      pushMessage("Email发送成功", `@${c.username} 的 Email 建联已提交发送。`);
      saveState();
      render();
    } catch (error) {
      row.status = "发送失败";
      row.updatedAt = nowText();
      row.apiError = error.data || { message: error.message };
      row.lastMessage = `[${row.updatedAt}] Email 发送失败：${error.message}\n${row.lastMessage || ""}`;
      pushMessage("Email发送失败", `@${c.username} 的 Email 建联发送失败：${error.message}`);
      saveState();
      render();
    }
    return;
  }
  const shopCipher = outreachShopCipher(row, c);
  if (!shopCipher || !c.sourceId) {
    row.status = "发送失败";
    row.updatedAt = nowText();
    row.lastMessage = `[${row.updatedAt}] 发送失败：缺少店铺授权或达人官方标识。\n${row.lastMessage || ""}`;
    pushMessage("建联提交失败", `@${c.username} 缺少店铺授权或达人官方标识，无法提交 TikTok 私信。`);
    saveState();
    render();
    return;
  }
  const targetBlockReason = targetNotificationBlockReason(row);
  if (targetBlockReason) {
    markRowWaitingForTarget(row, targetBlockReason);
    return;
  }
  try {
    const target = isTargetInviteChannel(row.channel) ? targetCollaboration(row.targetCollaborationId) : null;
    const data = await apiRequest("/api/tiktok/outreach/submit", {
      method: "POST",
      body: JSON.stringify({
        outreach: {
          id: row.id,
          channel: row.channel,
          channel_type: tiktokChannelType(row.channel),
          shop_cipher: shopCipher,
          creator_open_id: c.sourceId,
          creator_username: c.username,
          message: outreachApiMessage(row),
          product_ids: (row.productsSnapshot || []).map((p) => p.sourceId || p.id).filter(Boolean),
        },
        target_collaboration: targetApiPayload(target, row, c),
      }),
    });
    markOutreachApiSubmitted(id, data);
  } catch (error) {
    row.status = "发送失败";
    row.updatedAt = nowText();
    row.apiError = error.data || { message: error.message };
    row.lastMessage = `[${row.updatedAt}] 提交失败：${error.message}\n${row.lastMessage || ""}`;
    const target = targetCollaboration(row.targetCollaborationId);
    if (target) {
      target.status = "API提交失败";
      target.apiError = row.apiError;
      target.updatedAt = row.updatedAt;
    }
    pushMessage("建联提交失败", `@${c.username} 的建联提交失败：${error.message}`);
    saveState();
    render();
  }
}

function showToast(message, type = "info") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

async function submitPendingOutreachBatch() {
  const pending = state.outreach
    .filter((row) => row.status === "待API发送")
    .sort((a, b) => Number(!isTargetInviteChannel(a.channel)) - Number(!isTargetInviteChannel(b.channel)));
  if (!pending.length) { showToast("当前没有待发送的建联记录。", "info"); return; }
  let submitted = 0;
  let skipped = 0;
  let contactQueued = 0;
  let failed = 0;
  let emailConfigBlocked = false;

  for (const row of pending) {
    if (row.status !== "待API发送") {
      skipped += 1;
      continue;
    }
    const c = creator(row.creatorId);
    if (!c) {
      skipped += 1;
      continue;
    }
    if (row.channel === "Email" && !emailAccountConfigured()) {
      row.status = "邮箱配置待完成";
      row.updatedAt = nowText();
      row.lastMessage = `[${row.updatedAt}] 批量提交跳过 Email：请先完成发信邮箱配置。\n${row.lastMessage || ""}`;
      emailConfigBlocked = true;
      skipped += 1;
      continue;
    }
    if (row.channel === "Email" && !c.email) {
      row.status = "联系方式补充中";
      row.updatedAt = nowText();
      row.lastMessage = `[${row.updatedAt}] 批量提交跳过 Email：达人邮箱缺失，已进入联系方式补充。\n${row.lastMessage || ""}`;
      contactQueued += 1;
      continue;
    }

    const beforeStatus = row.status;
    await submitOutreachApi(row.id);
    const current = state.outreach.find((item) => item.id === row.id);
    if (!current) {
      skipped += 1;
    } else if (current.status === "发送失败") {
      failed += 1;
    } else if (current.status === "等待定向邀约") {
      skipped += 1;
    } else if (current.status !== beforeStatus || current.apiResult || current.apiError) {
      submitted += 1;
    } else {
      skipped += 1;
    }
  }

  pushMessage("批量提交建联", `已处理待发送记录：提交 ${submitted} 条，失败 ${failed} 条，联系方式补充 ${contactQueued} 条，跳过 ${skipped} 条。`);
  saveState();
  render();
  if (emailConfigBlocked) {
    openEmailSetupModal("outreach");
  }
  showToast(`批量提交完成：提交 ${submitted} 条 · 失败 ${failed} 条 · 待补充 ${contactQueued} 条 · 跳过 ${skipped} 条`, failed ? "warning" : "success");
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

async function translateReplyText(textareaId, lang) {
  if (!featureEnabled("translation")) { showToast("消息翻译功能已被平台设置关闭。", "info"); return; }
  const el = document.getElementById(textareaId);
  if (!el) return;
  const raw = (el.value || "").trim();
  if (!raw) { showToast("请先输入回复内容。", "info"); return; }
  if (!lang || lang === "中文") return;
  const original = el.value;
  el.value = "翻译中…";
  try {
    const data = await apiRequest("/api/translate", { method: "POST", body: JSON.stringify({ text: raw, source: "中文", target: lang }) });
    el.value = data.translatedText || original;
  } catch (error) {
    el.value = original;
    showToast(`翻译失败：${error.message || "请稍后重试"}`, "danger");
  }
}

function openReplyModal(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const p = product(row.productId) || state.products[0];
  const defaultTemplate = state.templates[1]?.content || "Hi {KOL名称}，感谢回复，我们会继续推进 {产品名称} 的合作。";
  const channelOptions = replyChannelOptions(row);
  if (!channelOptions.length) return alert("当前没有可用回复渠道，请先到平台设置开启 TikTok 私信或 Email。");
  const defaultChannel = channelOptions.some(([v]) => v === row.channel) ? row.channel : channelOptions[0][0];
  openModal("回复达人", `
    <div class="notice">正在通过 <b>${escapeHtml(channelLabel(defaultChannel))}</b> 回复 @${escapeHtml(c?.username || "-")}（按本条建联的来源渠道自动发送）。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("replyTemplateId", "消息模板", [["0", "不使用模板"], ...state.templates.map((x) => [x.id, x.name])], state.templates[1]?.id || "0")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>回复内容</label><textarea id="replyMessage" class="textarea">${escapeHtml(renderTemplate(defaultTemplate, c || {}, p))}</textarea></div>
    <div style="margin-top:8px"><button class="btn ghost" type="button" onclick="translateReplyText('replyMessage','${escapeHtml(targetLanguageForCreator(c))}')">翻译成达人语言（${escapeHtml(targetLanguageForCreator(c))}）</button></div>
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
  const channel = isTargetInviteChannel(row.channel) ? "TikTok私信" : (row.channel || "TikTok私信");
  if (!validateChannelForCreators(channel, [c])) return;
  pushThreadMessage(row, "us", message, channel);
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

// 初始「我方」气泡：正文用译文（达人能看懂的），中文原文留作 original 供 BD 查看。
function initialThreadBubble(o) {
  const translated = o.translatedMessage || "";
  const original = o.messageText || "";
  const body = translated || original;
  if (!body) return null;
  return {
    from: "us",
    channel: o.channel,
    text: body,
    original: translated && original && translated !== original ? original : "",
    at: o.updatedAt || nowText(),
  };
}

function ensureOutreachThread(o) {
  if (!Array.isArray(o.thread)) {
    o.thread = [];
    const initial = initialThreadBubble(o);
    if (initial) o.thread.push(initial);
  }
  return o.thread;
}

function pushThreadMessage(o, from, text, channel) {
  const thread = ensureOutreachThread(o);
  thread.push({ from, channel: channel || o.channel, text, at: nowText() });
  return thread;
}

function outreachThreadFor(o) {
  if (Array.isArray(o.thread) && o.thread.length) return o.thread;
  const initial = initialThreadBubble(o);
  return initial ? [initial] : [];
}

function lastThreadSnippet(o) {
  const thread = outreachThreadFor(o);
  const last = thread[thread.length - 1];
  const text = (last ? last.text : (o.messageText || "")).replace(/\s+/g, " ").trim();
  if (!text) return "（暂无消息）";
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

// 会话按达人归纳：selectedConversationId 存的是 creatorId（一个达人一个会话）。
function conversationCreatorIds() {
  const ids = [];
  for (const o of state.outreach) if (!ids.includes(o.creatorId)) ids.push(o.creatorId);
  return ids;
}

function creatorOutreachRecords(creatorId) {
  return state.outreach
    .filter((o) => o.creatorId === creatorId)
    .sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
}

// 该达人会话的「主 record」：用于回复与状态动作。优先可回复渠道(私信/Email)、未关闭、最新。
function creatorPrimaryRecord(creatorId) {
  const records = creatorOutreachRecords(creatorId);
  if (!records.length) return null;
  const open = records.filter((r) => r.status !== "已关闭");
  const pool = open.length ? open : records;
  const replyable = pool.filter((r) => !isTargetInviteChannel(r.channel));
  const pick = (replyable.length ? replyable : pool).slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return pick[0];
}

function creatorMergedThread(creatorId) {
  const msgs = [];
  creatorOutreachRecords(creatorId).forEach((o) => {
    outreachThreadFor(o).forEach((m) => msgs.push({ ...m, channel: m.channel || o.channel, recordId: o.id }));
  });
  msgs.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  return msgs;
}

function openConversation(id) {
  const rec = state.outreach.find((x) => x.id === id);
  state.selectedConversationId = rec ? rec.creatorId : id;
  state.selectedCreatorId = null;
  state.conversationChannel = "";
  saveState();
  navigateHash("conversation");
}

function selectConversation(creatorId) {
  state.selectedConversationId = creatorId;
  state.conversationChannel = "";
  saveState();
  render();
}

// 会话里就地按渠道切换（不弹框）：空＝全部渠道。
function setConversationChannel(channel) {
  state.conversationChannel = channel || "";
  render();
}

function conversationStatusActions(o) {
  const parts = [];
  if (o.status === "待回复") parts.push(`<button class="btn" onclick="advanceOutreach(${o.id}, '待我方回复')">标记已回复</button>`);
  if (o.status === "待我方回复") {
    parts.push(`<button class="btn" onclick="createSampleFromOutreach(${o.id})">安排寄样</button>`);
    parts.push(`<button class="btn ghost" onclick="createCoopFromOutreach(${o.id})">进入合作</button>`);
  }
  if (o.status !== "已关闭" && o.status !== "已转合作") parts.push(`<button class="btn ghost" onclick="advanceOutreach(${o.id}, '已关闭')">结束跟进</button>`);
  return parts.join(" ");
}

async function translateBubble(btn) {
  const text = btn.getAttribute("data-text") || "";
  const source = btn.getAttribute("data-source") || "";
  if (!text) return;
  const holder = btn.closest(".bubble")?.querySelector(".bubble-translation");
  if (!holder) return;
  holder.style.display = "block";
  holder.textContent = "翻译中…";
  try {
    const data = await apiRequest("/api/translate", { method: "POST", body: JSON.stringify({ text, source: source || "越南语", target: "中文" }) });
    holder.textContent = `中文：${data.translatedText || text}`;
  } catch (error) {
    holder.textContent = `翻译失败：${error.message || "请稍后重试"}`;
  }
}

function conversationThreadHtml(o) {
  const c = creator(o.creatorId);
  const creatorLang = targetLanguageForCreator(c) || "越南语";
  const thread = creatorMergedThread(o.creatorId);
  const records = creatorOutreachRecords(o.creatorId);
  const activeChannel = state.conversationChannel || "";
  const distinctChannels = [];
  const seenChannels = new Set();
  records.forEach((r) => {
    if (seenChannels.has(r.channel)) return;
    seenChannels.add(r.channel);
    distinctChannels.push(r.channel);
  });
  const channelButtons = [
    `<button class="badge badge-link ${activeChannel === "" ? "active" : ""}" type="button" onclick="setConversationChannel('')">全部</button>`,
    ...distinctChannels.map((ch) => `<button class="badge badge-link ${activeChannel === ch ? "active" : ""}" type="button" title="只看该渠道的消息" onclick="setConversationChannel('${ch}')">${escapeHtml(channelLabel(ch))}</button>`),
  ];
  const visibleThread = activeChannel ? thread.filter((m) => m.channel === activeChannel) : thread;
  const bubbles = visibleThread.length ? visibleThread.map((m) => {
    if (m.from === "system") return `<div class="bubble system"><span>${escapeHtml(m.text)}</span></div>`;
    const who = m.from === "us" ? "我方" : `@${c?.username || "达人"}`;
    const original = m.from === "us" && m.original
      ? `<details class="bubble-original"><summary>查看中文原文（实际发给达人的是上面的译文）</summary><div>${escapeHtml(m.original)}</div></details>`
      : "";
    const translateBtn = m.from === "creator"
      ? `<button class="btn ghost btn-mini" type="button" data-text="${escapeHtml(m.text)}" data-source="${escapeHtml(creatorLang)}" onclick="translateBubble(this)">翻译成中文</button><div class="bubble-translation" style="display:none"></div>`
      : "";
    return `<div class="bubble ${m.from === "us" ? "us" : "creator"}">
      <div class="bubble-body">${escapeHtml(m.text)}</div>
      ${original}
      ${translateBtn}
      <div class="bubble-meta">${escapeHtml(who)} · ${escapeHtml(channelLabel(m.channel || o.channel))} · ${escapeHtml(m.at || "")}</div>
    </div>`;
  }).join("") : `<div class="empty-state compact">还没有消息记录。</div>`;
  return `
    <div class="conversation-head">
      ${personCell(c)}
      <div class="conversation-head-meta">
        ${channelButtons.join("")}
        <span class="badge">${escapeHtml(statusLabelForView(rollupOutreachStatus(records)))}</span>
        ${records.some((r) => r.inviteCard) ? `<span class="badge info">携带邀约卡</span>` : ""}
      </div>
      <div class="filters">${conversationStatusActions(o)}</div>
    </div>
    <div class="conversation-thread">${bubbles}</div>`;
}

function conversationComposerHtml(o) {
  const channelOptions = replyChannelOptions(o);
  const disabled = !channelOptions.length;
  const defaultChannel = channelOptions.some(([v]) => v === o.channel) ? o.channel : (channelOptions[0] ? channelOptions[0][0] : "");
  return `
    <div class="conversation-composer">
      <div class="filters">
        ${disabled ? `<span class="muted">当前没有可用回复渠道，请到平台设置开启 TikTok 私信或 Email。</span>` : `<span class="muted">回复将通过 <b>${escapeHtml(channelLabel(defaultChannel))}</b> 发送</span>`}
        <button class="btn ghost" type="button" onclick="translateReplyText('convReplyMessage','${escapeHtml(targetLanguageForCreator(creator(o.creatorId)))}')">翻译成达人语言</button>
      </div>
      <textarea id="convReplyMessage" class="textarea" placeholder="输入回复内容..."></textarea>
      <div class="conversation-composer-foot">
        <span class="muted">回复会记录在会话里；真实发送仍依赖 TikTok 私信 / Email 接入。</span>
        <button class="btn primary" ${disabled ? "disabled" : ""} onclick="sendConversationReply(${o.id})">发送回复</button>
      </div>
    </div>`;
}

function renderConversation() {
  const creatorIds = conversationCreatorIds()
    .map((cid) => ({ cid, primary: creatorPrimaryRecord(cid) }))
    .filter((x) => x.primary)
    .sort((a, b) => new Date(b.primary.updatedAt || 0) - new Date(a.primary.updatedAt || 0));
  const headActions = `<button class="btn" onclick="setPage('outreach')">返回建联记录</button>`;
  if (!creatorIds.length) {
    return `${pageHead("沟通", "查看与达人的建联会话，回复并推进合作。", headActions)}
      <div class="empty-state">还没有建联会话。请先从达人库发起建联。<button class="btn primary" onclick="setPage('kol')">去达人库</button></div>`;
  }
  let selectedId = state.selectedConversationId;
  if (!creatorIds.some((x) => x.cid === selectedId)) selectedId = creatorIds[0].cid;
  state.selectedConversationId = selectedId;
  const active = creatorPrimaryRecord(selectedId);
  return `
    ${pageHead("沟通", "每个达人一个会话，所有渠道（定向邀约 / 私信 / Email）的消息都在这里。", headActions)}
    <div class="conversation-layout">
      <aside class="conversation-list">
        ${creatorIds.map(({ cid }) => {
          const c = creator(cid);
          const records = creatorOutreachRecords(cid);
          const merged = creatorMergedThread(cid);
          const last = merged[merged.length - 1];
          const snippet = last ? (last.text || "").replace(/\s+/g, " ").trim() : "";
          const channelsLabel = Array.from(new Set(records.map((r) => channelLabel(r.channel)))).join(" / ");
          return `
            <button class="conversation-item ${cid === selectedId ? "active" : ""}" onclick="selectConversation(${cid})">
              <span class="avatar">${creatorAvatarSrc(c) ? `<img src="${escapeHtml(creatorAvatarSrc(c))}" alt="" loading="lazy" onerror="this.parentNode.textContent='${escapeHtml((c?.username || '?').slice(0, 1).toUpperCase())}'" />` : escapeHtml((c?.username || "?").slice(0, 1).toUpperCase())}</span>
              <span class="conversation-item-main">
                <b>@${escapeHtml(c?.username || "-")}</b>
                <span class="muted">${escapeHtml(channelsLabel)} · ${escapeHtml(outreachStatusLabel(rollupOutreachStatus(records)))}</span>
                <span class="muted conversation-snippet">${escapeHtml(snippet.length > 40 ? `${snippet.slice(0, 40)}…` : (snippet || "（暂无消息）"))}</span>
              </span>
            </button>`;
        }).join("")}
      </aside>
      <section class="conversation-main">
        ${conversationThreadHtml(active)}
        ${conversationComposerHtml(active)}
      </section>
    </div>`;
}

function sendConversationReply(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const message = document.getElementById("convReplyMessage")?.value.trim();
  if (!message) { showToast("请输入回复内容。", "info"); return; }
  const channel = isTargetInviteChannel(row.channel) ? "TikTok私信" : (row.channel || "TikTok私信");
  if (!validateChannelForCreators(channel, [c])) return;
  pushThreadMessage(row, "us", message, channel);
  row.channel = channel;
  row.status = "待回复";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 我方回复：${message}`;
  if (c) c.status = "已发送";
  pushMessage("建联回复", `已通过 ${channelLabel(channel)} 回复 @${c?.username || "-"}。`);
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
      ${field("gmv", "TikTok GMV（当地币种）", "例如 VND 1000000", creatorGmvDisplay(row?.gmv || ""))}
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

// ===== 建联前核验向导（逐个看真实体检再决定建联；核验后用产品精准匹配重打分）=====
function bulkOutreachIds() {
  return (state.bulkCreatorIds || []).filter((id) => { const c = creator(id); return c && !creatorOutreachBlockReason(c); });
}
function startBulkOutreach() {
  const ids = bulkOutreachIds();
  if (!ids.length) return alert("请先选择至少一位可建联达人。黑名单、不感兴趣和 24 小时内已建联达人会被拦截。");
  if (!state.products.length) { alert("请先完成店铺授权并同步商品，再发起建联。"); navigateHash("products"); return; }
  if (ids.length < 2) { openOutreachModal(); return; }
  const body = `
    <p style="margin:0 0 10px;line-height:1.7">已选 <b>${ids.length}</b> 位达人。<b>建联前核验</b>会逐个打开达人 TikTok 主页，采集器自动抓取 TA 近期真实视频内容，<b>跟你的产品精确匹配后重新打分</b>——比库里基于历史类目的粗略分准得多，尤其能看出 TA 近期是不是真在带跟你产品相近的货。看完逐个勾选要不要建联。</p>
    <p class="muted" style="margin:0">也可以不核验，直接用库内现有分建联。</p>`;
  openModal("建联前核验", body, `
    <button class="btn ghost" onclick="closeModal()">取消</button>
    <button class="btn" onclick="skipVerifyOutreach()">跳过，直接建联</button>
    <button class="btn primary" onclick="startVerifyWizard()">逐个核验</button>`);
}
function skipVerifyOutreach() { closeModal(); openOutreachModal(); }
function startVerifyWizard() {
  state.verify = { ids: bulkOutreachIds(), idx: 0, decisions: {}, opened: {} };
  saveState();
  renderVerifyWizard();
}
function renderVerifyWizard() {
  const v = state.verify;
  if (!v || !v.ids.length) { closeModal(); return; }
  if (v.idx >= v.ids.length) return finishVerify();
  const c = creator(v.ids[v.idx]);
  if (!c) { v.idx++; return renderVerifyWizard(); }
  const opened = Boolean(v.opened[c.id]);
  const prod = creatorProductFitMatches(c);
  const matchLine = prod && prod.length
    ? `<div class="fresh-hint" style="color:#15803d">✓ 贴近你的产品：${prod.slice(0, 5).map(escapeHtml).join("、")}</div>`
    : (creatorHasContentData(c) ? `<div class="fresh-hint" style="color:#b91c1c">近期内容未见跟你产品相近的</div>` : `<div class="fresh-hint">未核验，当前是库内粗略分</div>`);
  const body = `
    <div class="muted" style="margin-bottom:8px">进度 ${v.idx + 1} / ${v.ids.length} · 核验后打分更准（真实内容 + 产品精确匹配 + 带货）</div>
    ${creatorPreEvalCard(c)}
    ${matchLine}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" onclick="verifyOpenTikTok()">${opened ? "重新打开核验" : "打开 TikTok 核验 ↗"}</button>
      <button class="btn" onclick="verifyRefresh()">刷新体检</button>
    </div>
    ${opened ? `<p class="muted" style="margin:8px 0 0">已打开 TA 主页，等几秒采集器体检完，点「刷新体检」看更新后的分。</p>` : ""}`;
  openModal("逐个核验", body, `
    <span class="muted" style="margin-right:auto">已勾建联 ${Object.values(v.decisions).filter((d) => d === "outreach").length}</span>
    <button class="btn ghost" onclick="verifyDecide('skip')">✗ 跳过</button>
    <button class="btn primary" onclick="verifyDecide('outreach')">✓ 加入建联</button>`);
}
function verifyOpenTikTok() {
  const v = state.verify; if (!v) return;
  const c = creator(v.ids[v.idx]); if (!c) return;
  const url = creatorProfileUrl(c); if (!url) return alert("缺少该达人的 TikTok 主页地址。");
  window.open(url, "_blank", "noopener");
  v.opened[c.id] = true; saveState(); renderVerifyWizard();
}
async function verifyRefresh() {
  if (typeof loadPlatformCreatorLibrary === "function") { try { await loadPlatformCreatorLibrary({ silent: true }); } catch (e) {} }
  renderVerifyWizard();
}
function verifyDecide(decision) {
  const v = state.verify; if (!v) return;
  v.decisions[v.ids[v.idx]] = decision; v.idx += 1; saveState();
  renderVerifyWizard();
}
function finishVerify() {
  const v = state.verify || { ids: [], decisions: {} };
  const chosen = v.ids.filter((id) => v.decisions[id] === "outreach");
  state.verify = null; saveState();
  if (!chosen.length) { closeModal(); alert("没有勾选要建联的达人，已退出核验。"); render(); return; }
  state.bulkCreatorIds = chosen;
  closeModal();
  openOutreachModal();
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
  state.outreachDraft = { creatorIds: selectedIds, updatedAt: nowText() };
  state.selectedCreatorId = null;
  saveState();
  navigateHash("outreachWorkbench");
}

function saveOutreachDraft() {
  state.outreachDraft = {
    ...(state.outreachDraft || {}),
    updatedAt: nowText(),
  };
  saveState();
  pushMessage("建联草稿", "建联工作台草稿已保存。");
  alert("建联草稿已保存。");
}

function bulkSetCommission(type) {
  const value = prompt(type === "ad" ? "批量设置广告佣金率（1-80）" : "批量设置标准佣金率（1-80）", type === "ad" ? "5" : "20");
  if (value == null) return;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 80) return alert("佣金率必须在 1-80% 之间。");
  document.querySelectorAll(".outreach-product-check:checked").forEach((input) => {
    const id = input.value;
    if (type === "ad") {
      const enabled = document.getElementById(`adCommissionEnabled-${id}`);
      const rate = document.getElementById(`adCommission-${id}`);
      if (enabled) enabled.checked = true;
      if (rate) rate.value = numeric;
    } else {
      const standard = document.getElementById(`standardCommission-${id}`);
      if (standard) standard.value = numeric;
    }
  });
}

function renderTemplate(content, c, p) {
  return String(content || "")
    .replaceAll("{KOL名称}", c.nickname || c.username)
    .replaceAll("{达人名称}", c.nickname || c.username)
    .replaceAll("{产品名称}", p.name)
    .replaceAll("{联盟佣金率}", p.commission || "-");
}

async function translateOutreachDraft() {
  if (!featureEnabled("translation")) return alert("消息翻译功能已被平台设置关闭。");
  const products = selectedOutreachProducts();
  const p = products[0] || state.products[0];
  const lang = document.getElementById("outreachLanguage")?.value || "英语";
  const draftCreator = (state.outreachDraft?.creatorIds || []).map((id) => creator(id)).filter(Boolean)[0] || state.creators[0];
  const source = document.getElementById("outreachMessage");
  const target = document.getElementById("outreachTranslatedMessage");
  if (!target) return;
  const rendered = renderTemplate((source?.value || "").trim(), draftCreator || {}, p);
  if (!rendered) return alert("请先填写中文原文，再翻译。");
  if (lang === "中文") { target.value = rendered; return; }
  target.value = "翻译中…";
  try {
    const data = await apiRequest("/api/translate", {
      method: "POST",
      body: JSON.stringify({ text: rendered, source: "中文", target: lang }),
    });
    target.value = data.translatedText || "";
  } catch (error) {
    target.value = "";
    alert(`翻译失败：${error.message || "翻译服务暂时不可用，请稍后重试。"}`);
  }
}

function emailProviderPreset(provider) {
  const presets = {
    "Gmail": { smtpHost: "smtp.gmail.com", smtpPort: "587", imapHost: "imap.gmail.com", imapPort: "993" },
    "Gmail+Lark": { smtpHost: "smtp.gmail.com", smtpPort: "587", imapHost: "imap.gmail.com", imapPort: "993" },
    "Outlook/Hotmail": { smtpHost: "smtp-mail.outlook.com", smtpPort: "587", imapHost: "outlook.office365.com", imapPort: "993" },
    "其他": { smtpHost: "", smtpPort: "587", imapHost: "", imapPort: "993" },
  };
  return presets[provider] || presets.Gmail;
}

function emailGuideHtml(provider) {
  const p = emailProviderPreset(provider);
  const steps = {
    "Gmail": ["登录 Google 账号，进入 myaccount.google.com。", "打开“安全性”，先开启“两步验证”。", "搜索“应用专用密码”，生成 16 位密码。", "把 16 位密码填入左侧密码框。", "Gmail 每日发信量约 500 封/天。"],
    "Gmail+Lark": ["用 Gmail 账号的 SMTP/IMAP：先在 Google 开启两步验证并生成应用专用密码。", "把 16 位应用专用密码填入左侧密码框。", "Lark/飞书侧按企业邮箱转发规则配置即可。"],
    "Outlook/Hotmail": ["登录 account.microsoft.com，进入“安全”。", "开启“两步验证”。", "在“应用密码”里生成一个应用专用密码。", "把应用专用密码填入左侧密码框。", "发信量受账户类型限制。"],
    "其他": ["在你的邮箱服务商后台找到 SMTP（发件）和 IMAP（收件）服务器地址与端口。", "开启两步验证并生成“应用专用密码”（不是登录密码）。", "把 SMTP/IMAP 地址端口填到左侧，密码填入密码框。"],
  };
  const list = (steps[provider] || steps["其他"]).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  return `
    <div class="guide-row"><b>SMTP（发件）</b><code>${escapeHtml(p.smtpHost || "（自填）")}:${escapeHtml(p.smtpPort)}</code></div>
    <div class="guide-row"><b>IMAP（收件）</b><code>${escapeHtml(p.imapHost || "（自填）")}:${escapeHtml(p.imapPort)}</code></div>
    <div class="guide-warning"><b>密码说明</b><br>必须使用“应用专用密码”，不是邮箱登录密码。</div>
    <ol>${list}</ol>
    <div class="notice soft">发件和收件可以用同一个邮箱账号，但服务器地址不能填反。</div>`;
}

function applyEmailProvider(provider) {
  const p = emailProviderPreset(provider);
  const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v; };
  set("emailSmtpHost", p.smtpHost);
  set("emailSmtpPort", p.smtpPort);
  set("emailImapHost", p.imapHost);
  set("emailImapPort", p.imapPort);
  const guide = document.getElementById("emailGuideBody");
  if (guide) guide.innerHTML = emailGuideHtml(provider);
  const tabs = document.getElementById("emailGuideTabs");
  if (tabs) tabs.querySelectorAll(".guide-tab").forEach((t) => t.classList.toggle("active", t.dataset.provider === provider));
}

function openEmailSetupModal(origin = "") {
  const provider = state.settings.emailProvider || "Gmail";
  const preset = emailProviderPreset(provider);
  const tabs = ["Gmail+Lark", "Gmail", "Outlook/Hotmail", "其他"];
  openModal("绑定发信邮箱", `
    <div class="notice">Email 建联需要先配置发信邮箱。这里保存的是本地连接配置；真实生产环境应由系统加密保存应用专用密码。</div>
    <div class="email-guide-layout">
      <div>
        <div class="form-grid">
          <div class="form-field"><label>邮箱类型</label><select id="emailProvider" class="select" onchange="applyEmailProvider(this.value)">${tabs.map((x) => `<option value="${escapeHtml(x)}" ${x === provider ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></div>
          ${field("emailAddress", "邮箱账号", "bd@brand.com", state.settings.emailAddress || "")}
          ${field("emailSmtpHost", "SMTP（发件）", "smtp.gmail.com", state.settings.emailSmtpHost || preset.smtpHost)}
          ${field("emailSmtpPort", "SMTP 端口", "587", state.settings.emailSmtpPort || preset.smtpPort)}
          ${field("emailImapHost", "IMAP（收件）", "imap.gmail.com", state.settings.emailImapHost || preset.imapHost)}
          ${field("emailImapPort", "IMAP 端口", "993", state.settings.emailImapPort || preset.imapPort)}
        </div>
        <div class="form-field" style="margin-top:12px"><label>应用专用密码</label><input id="emailAppPassword" class="input" type="password" placeholder="不要填写登录密码，必须是应用专用密码" style="width:100%" /></div>
      </div>
      <div class="email-guide-card">
        <h3>配置指南</h3>
        <div id="emailGuideTabs" class="guide-tabs">${tabs.map((x) => `<span class="guide-tab ${x === provider ? "active" : ""}" data-provider="${escapeHtml(x)}" onclick="document.getElementById('emailProvider').value='${escapeHtml(x)}';applyEmailProvider('${escapeHtml(x)}')">${escapeHtml(x)}</span>`).join("")}</div>
        <div id="emailGuideBody">${emailGuideHtml(provider)}</div>
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
  state.settings.emailAppPassword = get("emailAppPassword");
  state.settings.emailConnected = true;
  state.settings.emailAppPasswordConfigured = true;
  let unlocked = 0;
  state.outreach.forEach((row) => {
    if (row.channel !== "Email" || row.status !== "邮箱配置待完成") return;
    row.status = "待API发送";
    row.updatedAt = nowText();
    row.lastMessage = `[${row.updatedAt}] 发信邮箱已配置，可继续提交 Email 建联。\n${row.lastMessage || ""}`;
    unlocked += 1;
  });
  addSyncLog("Email 配置", "已保存", `已绑定发信邮箱：${state.settings.emailAddress}`);
  pushMessage("Email 配置", `已绑定发信邮箱：${state.settings.emailAddress}。${unlocked ? ` 已解锁 ${unlocked} 条待提交 Email 建联。` : ""}`);
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
  return `${outreachStatusLabel(row.status || "待API发送")}${row.officialId ? " · 已生成邀约编号" : ""}`;
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
    notes: "本地定向邀约草稿。提交后会在 TikTok 创建官方定向邀约。",
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

function outreachSampleRule() {
  const offer = document.getElementById("sampleOffer")?.value || "提供";
  if (offer === "不提供") return "不寄样";
  const mode = document.getElementById("sampleReviewMode")?.value || "手动审核";
  return mode === "自动审核" ? "自动寄样" : "达人申请后审核";
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
  const createTarget = document.getElementById("createTargetCollaboration")?.checked !== false;
  const mode = createTarget ? "target_collaboration" : "message_only";
  const translationLanguage = document.getElementById("outreachLanguage")?.value || "";
  const editedTranslation = document.getElementById("outreachTranslatedMessage")?.value.trim() || "";
  const message = document.getElementById("outreachMessage").value.trim() || template?.content || "";
  const targetOptions = {
    name: document.getElementById("targetCollaborationName")?.value.trim() || `定向邀约-${todayString()}`,
    expiresAt: document.getElementById("targetExpiresAt")?.value.trim() || dateAfter(14),
    deliverables: getCheckedValues("targetDeliverables"),
    sampleRule: outreachSampleRule(),
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
  const sendInviteCard = createTarget && document.getElementById("sendInviteCard")?.checked !== false;
  const inviteCardText = sendInviteCard ? buildInviteCardSummary(selectedProducts) : "";
  const targets = ids.map((id) => creator(id)).filter(Boolean);
  if (!targets.length) return alert("没有可建联达人，请返回达人库重新选择。");
  if (Number.isFinite(quotaRemaining()) && quotaRemaining() < targets.length) {
    alert(`本月建联配额不足：剩余 ${quotaRemaining()}，本次需要 ${targets.length}。请升级套餐或减少选择数量。`);
    state.page = "billing";
    location.hash = "#billing";
    render();
    return;
  }
  if (!createTarget && !channels.length) return alert("请至少创建 TikTok 定向邀约，或选择一个触达通知渠道。");
  if (channels.length && !validateChannelsForCreators(channels, targets)) return;
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

    if (targetCollab) {
      const targetRecordId = Date.now() + index * 100;
      const targetMessage = `${rendered}\n定向邀约：${targetCollab.name}（${outreachStatusLabel(targetCollab.status)}）\n商品：${productNames}${inviteCardText ? `\n${inviteCardText}` : ""}`;
      state.outreach.unshift({
        id: targetRecordId,
        creatorId: c.id,
        productId: selectedProducts[0]?.id,
        productIds: selectedProducts.map((p) => p.id),
        productsSnapshot: selectedProducts,
        targetCollaborationId: targetCollab.id,
        channel: "TikTok定向邀约",
        channels: ["TikTok定向邀约"],
        status: "待API发送",
        inviteCard: sendInviteCard,
        messageText: rendered,
        lastMessage: `${scheduledText} · ${targetMessage}`,
        translatedMessage,
        translationLanguage,
        inviteLink: "",
        updatedAt: nowText(),
      });
      created += 1;
    }

    channels.forEach((channel, channelIndex) => {
      const pendingEmailConfig = channel === "Email" && !emailAccountConfigured();
      const pendingContact = !pendingEmailConfig && needsContactEnrichment(channel, c);
      if (pendingContact) queueContactEnrichment(c, channel, productNames);
      const recordId = Date.now() + index * 100 + channelIndex + 1;
      const status = pendingEmailConfig ? "邮箱配置待完成" : (pendingContact ? "联系方式补充中" : (channel === "TikTok私信" || channel === "Email" ? "待API发送" : "待回复"));
      const officialNote = targetCollab ? `定向邀约：${targetCollab.name}（${outreachStatusLabel(targetCollab.status)}）` : "仅建联消息";
      const messageWithContext = `${rendered}\n${officialNote}\n商品：${productNames}${inviteCardText ? `\n${inviteCardText}` : ""}`;
      state.outreach.unshift({
        id: recordId,
        creatorId: c.id,
        productId: selectedProducts[0]?.id,
        productIds: selectedProducts.map((p) => p.id),
        productsSnapshot: selectedProducts,
        targetCollaborationId: targetCollab ? targetCollab.id : null,
        channel,
        channels,
        status,
        inviteCard: sendInviteCard && Boolean(targetCollab),
        messageText: rendered,
        lastMessage: pendingContact ? `待补充 Email 后发送 · ${messageWithContext}` : `${scheduledText} · ${messageWithContext}`,
        translatedMessage,
        translationLanguage,
        inviteLink: "",
        updatedAt: nowText(),
      });
      created += 1;
    });
    const hasPendingApi = channels.includes("TikTok私信") || channels.includes("Email") || Boolean(targetCollab);
    c.status = channels.includes("Email") && !emailAccountConfigured()
      ? "邮箱配置待完成"
      : (channels.includes("Email") && needsContactEnrichment("Email", c) ? "联系方式补充中" : (hasPendingApi ? "待提交" : "已发送"));
  });
  state.bulkCreatorIds = [];
  logOperation("建联发送", channels.join("+"), `创建 ${created} 条建联记录；商品：${productNames}；模式：${mode}`);
  if (targetCollab) pushMessage("定向邀约草稿", `已创建定向邀约草稿「${targetCollab.name}」，包含 ${selectedProducts.length} 个商品、${targets.length} 位达人，状态：待提交。`);
  const emailConfigMissing = channels.includes("Email") && !emailAccountConfigured();
  pushMessage("批量建联", `已创建 ${created} 条建联记录，渠道：${channels.map(channelLabel).join("+")}，商品：${productNames}。${emailConfigMissing ? "Email 将在邮箱配置完成后继续提交。" : "缺少 Email 的达人已进入联系方式补充。"}`);
  closeModal();
  saveState();
  state.page = "outreach";
  state.selectedCreatorId = null;
  location.hash = "#outreach";
  render();
  if (emailConfigMissing) {
    openEmailSetupModal("outreach");
  }
}

function openCoopModal(id) {
  const row = id ? state.cooperations.find((x) => x.id === id) : null;
  const ownerOptions = fixedOptions(state.team.map((x) => x.name), state.cooperations.map((x) => x.owner)).map((x) => [x, x]);
  openModal(row ? "编辑合作" : "新增合作", `
    <div class="form-grid">
      ${creatorPickerField("coopCreatorId", "达人", row?.creatorId)}
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

// 达人搜索式选择：输入用户名即时出候选，点选回填。hidden(id) 存 creatorId。
function creatorPickerField(id, label, selectedId) {
  const c = creator(Number(selectedId));
  const text = c ? `@${c.username}` : "";
  return `<div class="form-field creator-picker">
    <label>${escapeHtml(label)}</label>
    <input type="hidden" id="${id}" value="${selectedId != null ? escapeHtml(String(selectedId)) : ""}" />
    <input type="text" id="${id}__q" class="input" autocomplete="off" placeholder="输入达人用户名搜索…" value="${escapeHtml(text)}"
      oninput="filterCreatorPicker('${id}', this.value)" onfocus="filterCreatorPicker('${id}', this.value)" onblur="hideCreatorPicker('${id}')" />
    <div class="creator-picker-list" id="${id}__list" style="display:none"></div>
  </div>`;
}

function filterCreatorPicker(id, query) {
  const list = document.getElementById(`${id}__list`);
  if (!list) return;
  const q = String(query || "").replace(/^@/, "").trim().toLowerCase();
  const matches = state.creators
    .filter((x) => x.status !== "黑名单")
    .filter((x) => !q || `${x.username} ${x.nickname || ""}`.toLowerCase().includes(q))
    .slice(0, 20);
  list.innerHTML = matches.length
    ? matches.map((x) => `<button type="button" class="creator-picker-item" onmousedown="pickCreator('${id}', ${x.id}, '${escapeHtml(x.username)}')">@${escapeHtml(x.username)}${x.nickname ? ` · ${escapeHtml(x.nickname)}` : ""}<span class="muted"> · ${escapeHtml(x.region || "")}</span></button>`).join("")
    : `<div class="creator-picker-empty muted">无匹配达人</div>`;
  list.style.display = "block";
}

function pickCreator(id, creatorId, username) {
  const hidden = document.getElementById(id);
  const q = document.getElementById(`${id}__q`);
  const list = document.getElementById(`${id}__list`);
  if (hidden) hidden.value = String(creatorId);
  if (q) q.value = `@${username}`;
  if (list) list.style.display = "none";
}

function hideCreatorPicker(id) {
  setTimeout(() => {
    const list = document.getElementById(`${id}__list`);
    if (list) list.style.display = "none";
  }, 150);
}

function multiCheckField(id, label, options, selected = []) {
  const values = Array.isArray(selected) ? selected : String(selected || "").split(/[，,]/).map((x) => x.trim()).filter(Boolean);
  return `
    <div class="form-field">
      <label>${escapeHtml(label)}</label>
      <div class="check-grid" id="${escapeHtml(id)}">
        ${options.map(([value, text]) => `
          <label class="check-option">
            <input type="checkbox" value="${escapeHtml(value)}" ${values.includes(String(value)) || values.includes(String(text)) ? "checked" : ""} onchange="updateOutreachPreview()" />
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
  if (!row) return; // 寄样不再支持手动新增，仅从建联/合作流转进来
  const c = creator(row.creatorId);
  const p = product(row.productId);
  openModal("更新寄样", `
    <div class="muted" style="margin-bottom:10px">寄样由建联 / 合作流程安排，这里只更新状态与运单。</div>
    <div class="form-grid">
      <div class="form-field"><label>达人</label><div>@${escapeHtml(c?.username || "-")}</div></div>
      <div class="form-field"><label>产品</label><div>${escapeHtml(p?.name || "-")}</div></div>
      ${selectField("sampleStatus", "寄样状态", [["待审核", "待审核"], ["待发货", "待发货"], ["已发货", "已发货"], ["已签收", "已签收"], ["已拒绝", "已拒绝"]], row.status || "待审核")}
      ${field("sampleTracking", "物流单号", "SG123456789", row.tracking || "")}
    </div>
    <input type="hidden" id="sampleCreatorId" value="${row.creatorId}" />
    <input type="hidden" id="sampleProductId" value="${row.productId}" />
  `, `<button class="btn primary" onclick="saveSample(${row.id})">保存</button>`);
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
  return `${escapeHtml(rule.matchType)}：${escapeHtml(rule.keywords || "-")}`;
}

function openAutoReplyModal(id = 0) {
  const row = id ? state.autoReplies.find((x) => x.id === id) : null;
  const replyType = row?.replyType === "图片" ? "图片" : "文本";
  openModal(row ? "编辑自动回复规则" : "新增自动回复规则", `
    <div class="notice">自动回复会在接入「自动收达人回复」后真正发送（开发中）；现在可用下方「测试」本地验证规则是否命中，不会向达人发真实消息。</div>
    <div class="var-guide muted" style="margin-top:10px">
      填写说明（都用中文填，系统帮你处理语言）：<br>
      · <b>规则名称</b>：给规则起个好记的名字<br>
      · <b>规则类型</b>：包含关键词＝命中其中任一词；完全匹配＝整条消息等于关键词<br>
      · <b>关键词</b>：<b>写中文即可</b>，用英文逗号分隔。达人用越南语等当地语言回复时，系统会<b>先把来信翻译成中文</b>再拿这些词匹配<br>
      · <b>优先级</b>：多个规则同时命中时，数字小的先生效<br>
      · <b>回复形式</b>：<b>文本</b>＝你写中文，发送时<b>按达人语言自动翻译</b>；<b>图片</b>＝填图片链接，直接发图、不翻译（群发省翻译成本）
    </div>
    <div class="form-grid" style="margin-top:12px">
      ${field("autoReplyName", "规则名称", "感兴趣回复", row?.name || "")}
      ${selectField("autoReplyMatchType", "规则类型", [["包含关键词", "包含关键词"], ["完全匹配", "完全匹配"]], row?.matchType || "包含关键词")}
      ${field("autoReplyKeywords", "关键词（中文，逗号分隔）", "感兴趣,可以,想了解,报价", row?.keywords || "")}
      ${field("autoReplyPriority", "优先级（数字越小越先命中）", "10", row?.priority ?? 50)}
      <div class="form-field"><label>回复形式</label>
        <select id="autoReplyReplyType" class="select" onchange="toggleAutoReplyType(this.value)">
          <option value="文本" ${replyType === "文本" ? "selected" : ""}>文本（按达人语言自动翻译）</option>
          <option value="图片" ${replyType === "图片" ? "selected" : ""}>图片（直接发图，不翻译）</option>
        </select>
      </div>
      ${selectField("autoReplyEnabled", "状态", [["启用", "启用"], ["停用", "停用"]], row?.enabled === false ? "停用" : "启用")}
    </div>
    <div class="form-field" id="autoReplyTextField" style="margin-top:12px;display:${replyType === "图片" ? "none" : "block"}"><label>回复内容（中文，发送时自动翻成达人语言）</label><textarea id="autoReplyContent" class="textarea" placeholder="感谢你的兴趣！我整理一下合作详情和样品安排马上发给你～">${escapeHtml(row?.replyContent || "")}</textarea></div>
    <div class="form-field" id="autoReplyImageField" style="margin-top:12px;display:${replyType === "图片" ? "block" : "none"}"><label>图片链接（直接发给达人，语言无关）</label><input id="autoReplyImageUrl" class="input" placeholder="https://...（商品图/活动图/报价图）" value="${escapeHtml(row?.replyImageUrl || "")}" /></div>
  `, `<button class="btn primary" onclick="saveAutoReply(${row?.id || 0})">保存规则</button>`);
}

function toggleAutoReplyType(value) {
  const img = value === "图片";
  const imageField = document.getElementById("autoReplyImageField");
  const textField = document.getElementById("autoReplyTextField");
  if (imageField) imageField.style.display = img ? "block" : "none";
  if (textField) textField.style.display = img ? "none" : "block";
}

function saveAutoReply(id = 0) {
  const get = (x) => (document.getElementById(x)?.value || "").trim();
  const name = get("autoReplyName");
  const replyType = get("autoReplyReplyType") === "图片" ? "图片" : "文本";
  const replyContent = get("autoReplyContent");
  const replyImageUrl = get("autoReplyImageUrl");
  if (!name) return alert("请填写规则名称");
  if (replyType === "文本" && !replyContent) return alert("请填写回复内容（中文）");
  if (replyType === "图片" && !replyImageUrl) return alert("请填写图片链接");
  if (!id && state.autoReplies.length >= 50) return alert("自动回复规则最多 50 条");
  const payload = normalizeAutoReply({
    id: id || Date.now(),
    name,
    matchType: get("autoReplyMatchType"),
    keywords: get("autoReplyKeywords"),
    priority: Number(get("autoReplyPriority") || 50),
    replyType,
    replyContent,
    replyImageUrl,
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

// message 应已是「翻译成中文」后的来信文本；关键词为中文。
function autoReplyMatches(rule, message, c) {
  if (!rule.enabled) return false;
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
    <div class="notice">本地测试：达人用当地语言发来的消息会<b>先翻译成中文</b>，再用你写的<b>中文关键词</b>匹配——验证规则命中。不会发送真实消息。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("autoReplyTestRule", "测试规则", [["0", "按优先级测试全部启用规则"], ...state.autoReplies.map((x) => [x.id, x.name])], row?.id || "0")}
      ${selectField("autoReplyTestCreator", "模拟达人", state.creators.filter((x) => x.status !== "黑名单").map((x) => [x.id, `@${x.username} · ${x.type} · ${x.region}`]), firstCreator?.id)}
    </div>
    <div class="form-field" style="margin-top:12px"><label>模拟达人消息（可填越南语等当地语言）</label><textarea id="autoReplyTestMessage" class="textarea">Tôi quan tâm, cho mình xin báo giá nhé</textarea></div>
  `, `<button class="btn primary" onclick="runAutoReplyTest()">运行测试</button>`);
}

async function runAutoReplyTest() {
  const selectedRuleId = Number(document.getElementById("autoReplyTestRule").value);
  const c = creator(Number(document.getElementById("autoReplyTestCreator").value));
  const raw = document.getElementById("autoReplyTestMessage").value.trim();
  if (!raw) return alert("请输入模拟达人消息。");
  // 来信先翻译成中文，再用中文关键词匹配（达人语言无关）。
  let zh = raw;
  if (featureEnabled("translation") && !/[一-龥]/.test(raw)) {
    try {
      const data = await apiRequest("/api/translate", { method: "POST", body: JSON.stringify({ text: raw, source: targetLanguageForCreator(c) || "越南语", target: "中文" }) });
      if (data.translatedText) zh = data.translatedText;
    } catch (error) {
      showToast(`翻译失败，按原文匹配：${error.message || "请稍后重试"}`, "info");
    }
  }
  const candidates = (selectedRuleId ? state.autoReplies.filter((x) => x.id === selectedRuleId) : state.autoReplies.filter((x) => x.enabled))
    .sort((a, b) => a.priority - b.priority);
  const matched = candidates.find((rule) => autoReplyMatches(rule, zh, c));
  if (!matched) return alert(`未命中规则。\n来信翻译为中文：「${zh}」\n请检查关键词是否覆盖到。`);
  const willSend = matched.replyType === "图片"
    ? `图片：${matched.replyImageUrl}`
    : `${matched.replyContent}（发送时按 ${targetLanguageForCreator(c) || "达人语言"} 自动翻译）`;
  pushMessage("自动回复触发", `本地测试命中「${matched.name}」。来信中文：${zh}。将回 @${c?.username || "-"}：${willSend}`);
  closeModal();
  saveState();
  state.page = "messages";
  location.hash = "#messages";
  render();
}

function insertAtTextarea(textareaId, text) {
  const el = document.getElementById(textareaId);
  if (!el) return;
  const start = Number.isInteger(el.selectionStart) ? el.selectionStart : el.value.length;
  const end = Number.isInteger(el.selectionEnd) ? el.selectionEnd : el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  el.focus();
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
}

function openTemplateModal(id = 0) {
  const row = state.templates.find((x) => x.id === id);
  openModal(row ? "编辑消息模板" : "新增消息模板", `
    <div class="form-grid">
      ${field("templateName", "模板名称", "首次建联 - 短视频", row?.name || "")}
      ${selectField("templateChannel", "渠道", [["TikTok私信", "TikTok私信"], ["Email", "Email"]], row?.channel || "TikTok私信")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>模板内容</label><textarea id="templateContent" class="textarea" placeholder="Hi {KOL名称}，我们想邀请你合作 {产品名称}。">${escapeHtml(row?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}，佣金为 {联盟佣金率}。")}</textarea></div>
    <div class="var-guide muted">
      <div>支持变量，点击插入到正文光标处，发送时自动替换：</div>
      <div class="var-chips">
        <button class="btn ghost btn-mini" type="button" onclick="insertAtTextarea('templateContent','{KOL名称}')">{KOL名称}</button>
        <button class="btn ghost btn-mini" type="button" onclick="insertAtTextarea('templateContent','{产品名称}')">{产品名称}</button>
        <button class="btn ghost btn-mini" type="button" onclick="insertAtTextarea('templateContent','{联盟佣金率}')">{联盟佣金率}</button>
      </div>
      <div>{KOL名称}=达人昵称 · {产品名称}=所选商品名 · {联盟佣金率}=商品佣金</div>
    </div>
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
    <div class="notice">本地版本记录团队配置和操作日志；真实邀请邮件、登录账号和权限拦截需要账号系统接入。</div>
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
  if (!confirm("确认清空本地数据？真实 TikTok 授权和平台达人库不会删除。")) return;
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
window.switchTikTokShop = switchTikTokShop;
window.loadTikTokSamples = loadTikTokSamples;
window.flagRiskCreator = flagRiskCreator;
window.clearRiskFlag = clearRiskFlag;
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
window.startProductOutreach = startProductOutreach;
window.clearOutreachContext = clearOutreachContext;
window.reviewCreatorOnTikTok = reviewCreatorOnTikTok;
window.findSimilarCreators = findSimilarCreators;
window.clearSimilar = clearSimilar;
window.openScoreHelp = openScoreHelp;
window.startBulkOutreach = startBulkOutreach;
window.skipVerifyOutreach = skipVerifyOutreach;
window.startVerifyWizard = startVerifyWizard;
window.verifyOpenTikTok = verifyOpenTikTok;
window.verifyRefresh = verifyRefresh;
window.verifyDecide = verifyDecide;
window.markNotInterested = markNotInterested;
window.clearNotInterested = clearNotInterested;
window.toggleCreatorSelection = toggleCreatorSelection;
window.toggleCreatorPageSelection = toggleCreatorPageSelection;
window.setKolPage = setKolPage;
window.setKolPageSize = setKolPageSize;
window.setProductPage = setProductPage;
window.setProductPageSize = setProductPageSize;
window.setDetailTab = setDetailTab;
window.openOutreachModal = openOutreachModal;
window.saveOutreachDraft = saveOutreachDraft;
window.bulkSetCommission = bulkSetCommission;
window.saveOutreach = saveOutreach;
window.updateOutreachPreview = updateOutreachPreview;
window.translateOutreachDraft = translateOutreachDraft;
window.openEmailSetupModal = openEmailSetupModal;
window.saveEmailSettings = saveEmailSettings;
window.copyInviteLink = copyInviteLink;
window.openOutreachApiResult = openOutreachApiResult;
window.openReplyModal = openReplyModal;
window.saveReply = saveReply;
window.openCoopModal = openCoopModal;
window.saveCoop = saveCoop;
window.addCoopTag = addCoopTag;
window.markOverdue = markOverdue;
window.advanceOutreach = advanceOutreach;
window.markOutreachApiSubmitted = markOutreachApiSubmitted;
window.submitOutreachApi = submitOutreachApi;
window.submitPendingOutreachBatch = submitPendingOutreachBatch;
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
// 启动时从后端拉真实授权店铺（多店铺并集），覆盖可能过期的本地缓存
setTimeout(() => checkTikTokShops({ silent: true }), 0);
