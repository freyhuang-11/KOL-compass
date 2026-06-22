const STORAGE_KEY = "kol-compass-state-v1";

const pages = [
  ["运营", [
    ["dashboard", "控制台"],
    ["products", "产品管理"],
    ["kol", "KOL池"],
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
    productCategory: "全部",
    productStatus: "全部",
    productMode: "全部",
    kolSearch: "",
    kolType: "全部",
    kolCategory: "全部",
    kolRegion: "全部",
    kolFollowers: "全部",
    kolReplyRate: "全部",
    kolInterest: "可建联",
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
    lastCreatorSync: "尚未同步",
    tiktokClientKey: "",
    tiktokRedirectUrl: "http://localhost:8015/api/tiktok/callback",
    tiktokScopes: "product,affiliate,messaging,order",
    tiktokLastAuthCheck: "尚未检查",
    planName: "专业版",
    featureSwitches: {
      tiktokMessaging: true,
      emailMessaging: true,
      whatsappMessaging: false,
      translation: true,
      stripePayment: false,
    },
  },
  products: [
    { id: 1, name: "无线蓝牙耳机 Pro Max", category: "电子配件", price: "$49.90", commission: "15%", mode: "公开合作", status: "在售" },
    { id: 2, name: "瑜伽弹力紧身裤", category: "运动服饰", price: "$32.00", commission: "20%", mode: "定向合作", status: "在售" },
    { id: 3, name: "有机抹茶粉 100g", category: "食品饮料", price: "$18.80", commission: "25%", mode: "公开合作", status: "在售" },
  ],
  creators: [
    { id: 1, username: "beauty_emma", nickname: "Emma Beauty", type: "短视频达人", category: "美妆", region: "美国", followers: 2300000, gmv: "$125K/月", replyRate: "68%", tags: ["美妆达人", "英语"], status: "待联系", email: "", whatsapp: "", notes: "偏好测评型内容，适合新品首发。" },
    { id: 2, username: "tech_review_jack", nickname: "Jack Reviews", type: "短视频/直播达人", category: "3C数码", region: "英国", followers: 850000, gmv: "$48K/月", replyRate: "42%", tags: ["3C", "英语"], status: "已回复", email: "jack@example.com", whatsapp: "", notes: "已对耳机产品感兴趣，建议优先推进样品。" },
    { id: 3, username: "fashion_nina", nickname: "Nina Style", type: "直播达人", category: "服饰", region: "印尼", followers: 1500000, gmv: "$210K/月", replyRate: "55%", tags: ["服饰", "印尼语"], status: "已合作", email: "nina@example.com", whatsapp: "+62812345678", notes: "直播转化强，适合复投。" },
    { id: 4, username: "home_lisa", nickname: "Lisa Home", type: "短视频达人", category: "家居", region: "新加坡", followers: 240000, gmv: "$18K/月", replyRate: "36%", tags: ["家居"], status: "黑名单", email: "", whatsapp: "", notes: "历史合作低效，暂不重复触达。" },
  ],
  outreach: [
    { id: 1, creatorId: 2, productId: 1, channel: "Email", status: "待回复", lastMessage: "已发送耳机合作邀请，等待达人确认样品地址。", updatedAt: "2026-06-20 16:30" },
    { id: 2, creatorId: 3, productId: 2, channel: "WhatsApp", status: "待我方回复", lastMessage: "达人已确认下周直播档期，需要佣金确认。", updatedAt: "2026-06-21 10:12" },
  ],
  samples: [
    { id: 1, creatorId: 2, productId: 1, status: "待发货", tracking: "", updatedAt: "2026-06-21" },
    { id: 2, creatorId: 3, productId: 2, status: "已签收", tracking: "SG123456789", updatedAt: "2026-06-19" },
  ],
  cooperations: [
    {
      id: 1,
      creatorId: 3,
      productId: 2,
      type: "直播",
      status: "已直播",
      dueDate: "2026-06-25",
      videos: 0,
      lives: 2,
      orders: 186,
      gmv: 8200,
      commission: 1640,
      adSpend: 300,
      contentUrl: "https://www.tiktok.com/",
      tags: ["高ROI", "可复投"],
      owner: "Mia",
      notes: "直播间互动好，建议复投同类服饰产品。",
    },
    {
      id: 2,
      creatorId: 2,
      productId: 1,
      type: "短视频",
      status: "待产出",
      dueDate: "2026-06-28",
      videos: 0,
      lives: 0,
      orders: 0,
      gmv: 0,
      commission: 0,
      adSpend: 0,
      contentUrl: "",
      tags: ["需催发"],
      owner: "Sam",
      notes: "样品待寄出，产出截止日未到。",
    },
    {
      id: 3,
      creatorId: 1,
      productId: 3,
      type: "短视频+直播",
      status: "有订单未匹配内容",
      dueDate: "2026-06-18",
      videos: 0,
      lives: 0,
      orders: 14,
      gmv: 530,
      commission: 132,
      adSpend: 0,
      contentUrl: "",
      tags: ["需核对"],
      owner: "Luna",
      notes: "API 有联盟订单，但未匹配到视频/直播内容，需要人工归因。",
    },
  ],
  templates: [
    { id: 1, name: "首次建联 - 短视频", channel: "TikTok私信", content: "Hi {KOL名称}，我们正在寻找适合 {产品名称} 的创作者，想邀请你参与合作。" },
    { id: 2, name: "样品寄送确认", channel: "Email", content: "请确认收货地址，我们会在 48 小时内寄出样品。" },
  ],
  autoReplies: [
    { id: 1, name: "感兴趣回复", matchType: "包含关键词", keywords: "interested,yes,details,感兴趣", creatorType: "全部", region: "全部", minFollowers: 0, priority: 10, replyContent: "感谢你的回复，我们可以提供样品和联盟佣金，下面是合作说明。", enabled: true },
    { id: 2, name: "价格咨询", matchType: "包含关键词", keywords: "rate,price,paid,报价", creatorType: "全部", region: "全部", minFollowers: 0, priority: 20, replyContent: "当前合作以联盟佣金为主，具体佣金以产品卡片为准，也可以讨论固定费用。", enabled: true },
  ],
  systemMessages: [
    { id: 1, type: "合作提醒", text: "@tech_review_jack 距离产出截止日还有 7 天。", at: "2026-06-21 09:00", read: false },
    { id: 2, type: "API状态", text: "TikTok Partner API 尚未连接，当前使用本地数据模式。", at: "2026-06-21 09:05", read: false },
  ],
  syncLogs: [
    { id: 1, module: "API状态", status: "未连接", reason: "TikTok Partner API 尚未授权，当前使用本地数据模式。", at: "2026-06-21 09:05" },
  ],
  team: [
    { id: 1, name: "Sam", role: "超级管理员", email: "sam@example.com", stores: "全部店铺", status: "启用" },
    { id: 2, name: "Mia", role: "BD专员", email: "mia@example.com", stores: "美国店,英国店", status: "启用" },
  ],
  merchantApplications: [
    { id: 1, merchant: "GlowLab US", store: "美国店", contact: "ops@glowlab.example", plan: "专业版", apiStatus: "待授权", status: "待审批", appliedAt: "2026-06-20 11:30", notes: "已提交 Partner App 信息，等待 scope 审批。" },
    { id: 2, merchant: "FitWave SG", store: "新加坡店", contact: "bd@fitwave.example", plan: "基础版", apiStatus: "配置不完整", status: "资料补充", appliedAt: "2026-06-19 15:10", notes: "缺少 OAuth Redirect URL 和 Affiliate 权限截图。" },
    { id: 3, merchant: "Nina Fashion", store: "印尼店", contact: "nina@example.com", plan: "专业版", apiStatus: "待同步", status: "已通过", appliedAt: "2026-06-18 09:45", notes: "可进入本地试用，真实 API 同步仍需 OAuth。" },
  ],
  billingRecords: [
    { id: 1, plan: "专业版", amount: "$99", channel: "支付宝", status: "已支付", invoiceNo: "LOCAL-202606-001", period: "2026-06", createdAt: "2026-06-01 09:00", note: "本地演示账单，不代表真实扣款。" },
    { id: 2, plan: "基础版", amount: "$29", channel: "微信支付", status: "已支付", invoiceNo: "LOCAL-202605-001", period: "2026-05", createdAt: "2026-05-01 09:00", note: "历史演示账单。" },
  ],
  operationLogs: [
    { id: 1, operator: "System", action: "初始化", target: "KOL Compass", detail: "创建本地演示数据。", ip: "127.0.0.1", at: "2026-06-21 09:00" },
  ],
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
  if (Array.isArray(merged.autoReplies)) merged.autoReplies = merged.autoReplies.map(normalizeAutoReply);
  if (Array.isArray(merged.team)) merged.team = merged.team.map(normalizeTeamMember);
  if (!Array.isArray(merged.merchantApplications)) merged.merchantApplications = [];
  if (!Array.isArray(merged.billingRecords)) merged.billingRecords = [];
  if (!Array.isArray(merged.bulkCreatorIds)) merged.bulkCreatorIds = [];
  if (!Array.isArray(merged.syncLogs)) merged.syncLogs = [];
  if (!Array.isArray(merged.operationLogs)) merged.operationLogs = [];
  return merged;
}

function normalizeAutoReply(rule) {
  return {
    id: rule.id || Date.now(),
    name: rule.name || "未命名规则",
    matchType: rule.matchType || "包含关键词",
    keywords: rule.keywords || String(rule.condition || "").replace(/^包含\s*/, ""),
    creatorType: rule.creatorType || "全部",
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
  const value = Number(String(replyRate || "0").replace("%", ""));
  if (tier === ">=60%") return value >= 60;
  if (tier === "40%-60%") return value >= 40 && value < 60;
  if (tier === "<40%") return value < 40;
  return true;
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
        <span>${navIcon(key)}</span><span>${label}</span>
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
            <button class="btn" onclick="resetDemo()">重置演示数据</button>
          </div>
        </div>
        <div class="content">${content}</div>
      </main>
    </div>
    ${modalRoot()}
  `;
}

function navIcon(key) {
  return {
    dashboard: "▦", products: "▣", kol: "◎", outreach: "✉",
    autoReply: "↻", templates: "▤", blacklist: "⊘", samples: "□",
    cooperations: "◆", messages: "!", team: "☷", billing: "$", admin: "⚙",
  }[key] || "•";
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
  const categories = Array.from(new Set(state.products.map((p) => p.category).filter(Boolean)));
  const statuses = Array.from(new Set(state.products.map((p) => p.status).filter(Boolean)));
  const modes = Array.from(new Set(state.products.map((p) => p.mode).filter(Boolean)));
  const rows = state.products.filter((p) => {
    const kw = state.filters.productSearch.trim().toLowerCase();
    const kwOk = !kw || [p.name, p.category, p.mode, p.status].join(" ").toLowerCase().includes(kw);
    const categoryOk = state.filters.productCategory === "全部" || p.category === state.filters.productCategory;
    const statusOk = state.filters.productStatus === "全部" || p.status === state.filters.productStatus;
    const modeOk = state.filters.productMode === "全部" || p.mode === state.filters.productMode;
    return kwOk && categoryOk && statusOk && modeOk;
  });
  return `
    ${pageHead("产品管理", "同步和查看 TikTok Shop 商品、联盟佣金与合作模式。", `<button class="btn primary" onclick="syncProducts()">同步商品</button>`)}
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索产品名称、类目、模式..." value="${escapeHtml(state.filters.productSearch)}" oninput="setFilter('productSearch', this.value)" />
        <select class="select" onchange="setFilter('productCategory', this.value)">
          ${["全部", ...categories].map((x) => `<option ${state.filters.productCategory === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('productStatus', this.value)">
          ${["全部", ...statuses].map((x) => `<option ${state.filters.productStatus === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('productMode', this.value)">
          ${["全部", ...modes].map((x) => `<option ${state.filters.productMode === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
      <div class="filters">
        <span class="muted">上次同步：${state.settings.lastProductSync}</span>
        <button class="btn" onclick="addProduct()">商品来源说明</button>
      </div>
    </div>
    <div class="notice" style="margin-bottom:12px">真实商品、佣金率和合作模式应来自 TikTok Shop Partner API；当前未授权时仅使用本地数据，不伪造同步成功。</div>
    ${table(["产品", "类目", "价格", "佣金", "合作模式", "状态", "操作"], rows.map((p) => [
      `<b>${escapeHtml(p.name)}</b>`,
      p.category,
      p.price,
      p.commission,
      p.mode,
      badge(p.status),
      `<button class="btn" onclick="openProductModal(${p.id})">详情</button> <button class="btn ghost" onclick="goProductCoops(${p.id})">相关合作</button> <button class="btn ghost" onclick="goProductOutreach(${p.id})">相关建联</button>`,
    ]))}
  `;
}

function renderKolPool() {
  const categories = Array.from(new Set(state.creators.map((c) => c.category).filter(Boolean)));
  const regions = Array.from(new Set(state.creators.map((c) => c.region).filter(Boolean)));
  const rows = state.creators.filter((c) => {
    const kw = state.filters.kolSearch.trim().toLowerCase();
    const typeOk = state.filters.kolType === "全部" || c.type === state.filters.kolType;
    const categoryOk = state.filters.kolCategory === "全部" || c.category === state.filters.kolCategory;
    const regionOk = state.filters.kolRegion === "全部" || c.region === state.filters.kolRegion;
    const followersOk = creatorFollowerTierOk(c.followers, state.filters.kolFollowers);
    const replyRateOk = creatorReplyRateOk(c.replyRate, state.filters.kolReplyRate);
    const kwOk = !kw || [c.username, c.nickname, c.category, c.region, c.tags.join(",")].join(" ").toLowerCase().includes(kw);
    const interestOk = state.filters.kolInterest === "显示不感兴趣" ? c.status !== "黑名单" : c.status !== "黑名单" && !isNotInterestedBlocked(c);
    return typeOk && categoryOk && regionOk && followersOk && replyRateOk && kwOk && interestOk;
  });
  const availableRows = rows.filter((c) => !creatorOutreachBlockReason(c));
  const blockedRows = rows.filter((c) => creatorOutreachBlockReason(c));
  const selectedAvailableCount = (state.bulkCreatorIds || []).filter((id) => {
    const c = creator(id);
    return c && !creatorOutreachBlockReason(c);
  }).length;
  const visibleAvailableIds = `[${availableRows.map((c) => c.id).join(",")}]`;
  return `
    ${pageHead("KOL池", "筛选达人并发起建联。KOL 详情只看基础信息与沟通入口，不展示合作产出指标。", `<button class="btn primary" onclick="openCreatorModal()">新增达人</button>`)}
    <div class="notice" style="margin-bottom:12px">当前套餐：${escapeHtml(state.settings.planName)}，本月建联配额已用 ${quotaLabel()}。同一达人 24 小时内只能建联一次；标记不感兴趣后 30 天内不可建联。</div>
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("当前筛选", rows.length, "符合筛选条件的达人")}
      ${stat("可建联达人", availableRows.length, "未命中黑名单、冷却和不感兴趣规则")}
      ${stat("暂不可建联", blockedRows.length, "查看表格首列的拦截原因")}
      ${stat("已选择", selectedAvailableCount, "将进入一键建联")}
    </div>
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、用户名、标签..." value="${escapeHtml(state.filters.kolSearch)}" oninput="setFilter('kolSearch', this.value)" />
        <select class="select" onchange="setFilter('kolType', this.value)">
          ${["全部", "短视频达人", "直播达人", "短视频/直播达人"].map((x) => `<option ${state.filters.kolType === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('kolCategory', this.value)">
          ${["全部", ...categories].map((x) => `<option ${state.filters.kolCategory === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('kolRegion', this.value)">
          ${["全部", ...regions].map((x) => `<option ${state.filters.kolRegion === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('kolFollowers', this.value)">
          ${["全部", "<10K", "10K-100K", "100K-1M", ">1M"].map((x) => `<option ${state.filters.kolFollowers === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('kolReplyRate', this.value)">
          ${["全部", ">=60%", "40%-60%", "<40%"].map((x) => `<option ${state.filters.kolReplyRate === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('kolInterest', this.value)">
          ${["可建联", "显示不感兴趣"].map((x) => `<option ${state.filters.kolInterest === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
      </div>
      <div class="filters">
        <button class="btn" onclick="selectVisibleCreators(${visibleAvailableIds})">选择当前可建联</button>
        <button class="btn ghost" onclick="clearBulkSelection()">清空选择</button>
        <button class="btn primary" onclick="openOutreachModal()">一键建联(${state.bulkCreatorIds.length})</button>
        <button class="btn" onclick="importCreatorsCsv()">导入KOL CSV</button>
        <button class="btn" onclick="syncCreators()">同步达人数据</button>
      </div>
    </div>
    ${table(["选择", "达人", "类型", "类目/地区", "粉丝", "GMV", "回复率", "状态/标签", "操作"], rows.map((c) => {
      const blockReason = creatorOutreachBlockReason(c);
      return [
      blockReason ? `<span class="muted">${escapeHtml(blockReason)}</span>` : `<input type="checkbox" ${state.bulkCreatorIds.includes(c.id) ? "checked" : ""} onchange="toggleCreatorSelection(${c.id}, this.checked)" aria-label="选择 @${escapeHtml(c.username)}" />`,
      personCell(c),
      c.type,
      `${c.category}<br><span class="muted">${c.region}</span>`,
      c.followers.toLocaleString(),
      c.gmv,
      c.replyRate,
      `${c.status === "不感兴趣" ? badge("不感兴趣") : ""} ${c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}`,
      `${blockReason ? "" : `<button class="btn" onclick="openOutreachModal(${c.id})">建联</button>`} <button class="btn ghost" onclick="showCreator(${c.id})">详情</button> <button class="btn ghost" onclick="openCreatorModal(${c.id})">编辑</button> ${c.status === "不感兴趣" ? `<button class="btn ghost" onclick="clearNotInterested(${c.id})">恢复建联</button>` : `<button class="btn ghost" onclick="markNotInterested(${c.id})">不感兴趣</button>`} <button class="btn ghost" onclick="blacklistCreator(${c.id})">拉黑</button>`,
    ];
    }))}
  `;
}

function renderOutreach() {
  const channels = Array.from(new Set(state.outreach.map((o) => o.channel).filter(Boolean)));
  const statuses = Array.from(new Set(state.outreach.map((o) => o.status).filter(Boolean)));
  const totalCount = state.outreach.length;
  const waitingCreatorCount = state.outreach.filter((o) => o.status === "待回复").length;
  const waitingTeamCount = state.outreach.filter((o) => o.status === "待我方回复").length;
  const convertedCount = state.outreach.filter((o) => o.status === "已转合作").length;
  const rows = state.outreach.filter((o) => {
    const c = creator(o.creatorId);
    const p = product(o.productId);
    const kw = state.filters.outreachSearch.trim().toLowerCase();
    const kwOk = !kw || [c?.username, c?.nickname, p?.name, o.lastMessage].join(" ").toLowerCase().includes(kw);
    const statusOk = state.filters.outreachStatus === "全部" || o.status === state.filters.outreachStatus;
    const channelOk = state.filters.outreachChannel === "全部" || o.channel === state.filters.outreachChannel;
    return kwOk && statusOk && channelOk;
  });
  return `
    ${pageHead("建联记录", "统一查看 TikTok 私信、Email、WhatsApp 的沟通状态和待处理消息。")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${stat("建联总数", totalCount, "全部沟通记录", "setFilter('outreachStatus','全部')")}
      ${stat("待达人回复", waitingCreatorCount, "已发出邀请，等待达人响应", "setFilter('outreachStatus','待回复')")}
      ${stat("待我方回复", waitingTeamCount, "达人已响应，需要 BD 处理", "setFilter('outreachStatus','待我方回复')")}
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
      product(o.productId)?.name || "-",
      o.channel,
      badge(o.status),
      escapeHtml(o.lastMessage),
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
  const allTags = Array.from(new Set([...fixedTags, ...state.cooperations.flatMap((x) => x.tags)]));
  return `
    ${pageHead("合作管理", "内容追踪唯一主入口：视频、直播、GMV、订单、佣金、ROI 都在这里管理。", `<button class="btn primary" onclick="openCoopModal()">新增合作</button>`)}
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
        <button class="btn" onclick="importCoopsCsv()">导入合作 CSV</button>
        <button class="btn" onclick="syncCoopData()">同步 TikTok 内容/订单</button>
      </div>
    </div>
    ${table(["达人", "产品", "合作类型", "内容状态", "内容数据", "GMV / ROI", "标签", "负责人", "操作"], rows.map((c) => {
      const r = roi(c);
      return [
        personCell(creator(c.creatorId)),
        product(c.productId)?.name || "-",
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
      ${stat("当前套餐", state.settings.planName, "本地演示可切换")}
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
        <div class="warning-box">当前本地版本不会伪造 TikTok API 数据。未授权时，产品/达人/订单同步按钮只更新时间并写入系统提示。</div>
      </div>
      <div class="card">
        <h3>TikTok API 本地配置</h3>
        <div class="form-grid">
          ${field("apiClientKey", "client_key", "Partner App client_key", state.settings.tiktokClientKey || "")}
          ${field("apiRedirectUrl", "OAuth Redirect URL", "http://localhost:8015/api/tiktok/callback", state.settings.tiktokRedirectUrl || "")}
          ${field("apiScopes", "已申请 scope", "product,affiliate,messaging,order", state.settings.tiktokScopes || "")}
          ${field("apiLastCheck", "最近检查", "尚未检查", state.settings.tiktokLastAuthCheck || "尚未检查")}
        </div>
        <div class="warning-box" style="margin-top:12px">client_secret 不应保存在前端 localStorage。真实接入时请放在本项目后端环境变量中；遇到 OAuth、验证码、scope 审批时需要人工在浏览器完成。</div>
        <div style="margin-top:12px">
          <button class="btn primary" onclick="saveApiSettings()">保存配置</button>
          <button class="btn" onclick="markApiAuthBlocked()">标记授权阻塞</button>
        </div>
      </div>
      <div class="card">
        <h3>接入状态</h3>
        <p><b>当前状态：</b>${badge(state.settings.apiStatus)}</p>
        <p><b>商品同步：</b>${escapeHtml(state.settings.lastProductSync)}</p>
        <p><b>达人同步：</b>${escapeHtml(state.settings.lastCreatorSync)}</p>
        <p class="muted">保存配置不会触发真实 API 调用；它只让首次验收时能清楚看到接入准备状态。</p>
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
    ${pageHead("KOL详情", "只展示基础资料、联系方式、标签备注、沟通记录和合作入口；合作履约数据请进入合作管理查看。", `<button class="btn" onclick="setPage('kol')">返回KOL池</button>`)}
    <div class="split">
      <div>
        <div class="card">
          <div class="person">
            <span class="avatar">${c.username.slice(0, 1).toUpperCase()}</span>
            <div>
              <h2 style="margin:0">@${escapeHtml(c.username)}</h2>
              <div class="muted">${escapeHtml(c.nickname)} · ${c.category} · ${c.region}</div>
            </div>
          </div>
          <div style="margin-top:14px">${c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
          <p>${escapeHtml(c.notes)}</p>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>沟通记录</h3>
          <div class="timeline">
            ${records.map((r) => `<div class="message ${r.status === "待我方回复" ? "inbound" : "outbound"}"><b>${r.channel}</b> · ${badge(r.status)}<div>${escapeHtml(r.lastMessage)}</div><span class="muted">${r.updatedAt}</span><div style="margin-top:8px"><button class="btn ghost" onclick="openReplyModal(${r.id})">回复</button></div></div>`).join("") || `<div class="empty">暂无沟通记录。</div>`}
          </div>
        </div>
      </div>
      <aside>
        <div class="card">
          <h3>基础信息</h3>
          <p><b>粉丝：</b>${c.followers.toLocaleString()}</p>
          <p><b>类型：</b>${c.type}</p>
          <p><b>Email：</b>${c.email || "未提供"}</p>
          <p><b>WhatsApp：</b>${c.whatsapp || "未提供"}</p>
          <button class="btn primary" onclick="openOutreachModal(${c.id})">发起建联</button>
          <button class="btn" onclick="openCreatorModal(${c.id})">编辑联系方式</button>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>合作记录入口</h3>
          ${coops.map((x) => `<div class="message"><b>${product(x.productId)?.name || "-"}</b><br>${badge(detailCoopStage(x))}<br><button class="btn ghost" onclick="setPage('cooperations')">进入合作详情</button></div>`).join("") || `<div class="empty">暂无合作记录。</div>`}
        </div>
      </aside>
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

function personCell(c) {
  if (!c) return "-";
  return `
    <div class="person">
      <span class="avatar">${escapeHtml(c.username.slice(0, 1).toUpperCase())}</span>
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

function channelOptionsForCreators(targets, currentChannel = "") {
  const list = [];
  const add = (value, text = value) => list.push([value, text]);
  if (channelEnabled("TikTok私信")) add("TikTok私信");
  if (channelEnabled("Email") && targets.every((c) => c?.email)) add("Email");
  if (channelEnabled("WhatsApp") && targets.every((c) => c?.whatsapp)) add("WhatsApp");
  if (!list.length && currentChannel && channelEnabled(currentChannel)) add(currentChannel);
  return list;
}

function validateChannelForCreators(channel, targets) {
  if (!channelEnabled(channel)) {
    alert(`${channel} 已被平台管理端关闭，不能用于新建联或回复。`);
    return false;
  }
  if (channel === "Email" && !targets.every((c) => c?.email)) {
    alert("选择 Email 前，需要先为所有目标达人录入 Email。");
    return false;
  }
  if (channel === "WhatsApp" && !targets.every((c) => c?.whatsapp)) {
    alert("选择 WhatsApp 前，需要先为所有目标达人录入 WhatsApp。");
    return false;
  }
  return true;
}

function syncProducts() {
  state.settings.lastProductSync = nowText();
  const reason = "本地模式下仅更新时间；真实商品数据需完成 TikTok Partner API 授权。";
  addSyncLog("商品同步", state.settings.tiktokConnected ? "待OAuth授权" : "未连接", reason);
  pushMessage("商品同步", `已触发商品同步。${reason}`);
  saveState();
  render();
}

function syncCreators() {
  state.settings.lastCreatorSync = nowText();
  const reason = "本地模式下不会抓取 Partner API 达人数据；需完成 Affiliate / Messaging scope 授权。";
  addSyncLog("达人同步", state.settings.tiktokConnected ? "待OAuth授权" : "未连接", reason);
  pushMessage("达人同步", `已触发达人同步。${reason}`);
  saveState();
  render();
}

function syncCoopData() {
  state.settings.apiStatus = state.settings.tiktokConnected ? "待同步" : "未连接";
  const reason = "内容、直播和联盟订单需要 TikTok OAuth 授权及 Order / Affiliate scope。";
  addSyncLog("内容/订单同步", state.settings.apiStatus, reason);
  pushMessage("内容/订单同步", `已触发内容与联盟订单同步。${reason}`);
  saveState();
  render();
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
  const scopes = document.getElementById("apiScopes").value.trim();
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
  return {
    outreach: state.outreach.filter((x) => x.productId === productId),
    samples: state.samples.filter((x) => x.productId === productId),
    cooperations: state.cooperations.filter((x) => x.productId === productId),
  };
}

function openProductModal(id) {
  const row = product(id);
  if (!row) return alert("产品不存在。");
  const usage = productUsage(row.id);
  const source = state.settings.tiktokConnected ? "待 OAuth 授权后由 TikTok Partner API 同步" : "本地演示缓存，未连接真实 TikTok API";
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
  const sample = createSampleRecord(row.creatorId, row.productId, "待审核", "");
  row.status = "待我方回复";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 已从建联记录安排寄样，寄样状态：${sample.status}。`;
  pushMessage("寄样创建", `已为 @${creator(row.creatorId)?.username || "-"} 创建寄样任务。`);
  saveState();
  state.page = "samples";
  state.selectedCreatorId = null;
  location.hash = "#samples";
  render();
}

function createCoopRecord(creatorId, productId, source = "手动创建") {
  const existing = state.cooperations.find((x) => x.creatorId === creatorId && x.productId === productId && x.status !== "合作结束");
  if (existing) return existing;
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
    tags: ["需催发"],
    owner: "Sam",
    notes: `[${nowText()}] ${source}，等待达人产出内容。`,
  };
  state.cooperations.unshift(row);
  const c = creator(creatorId);
  if (c) c.status = "已合作";
  return row;
}

function createCoopFromOutreach(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const coop = createCoopRecord(row.creatorId, row.productId, "由建联记录转入合作");
  row.status = "已转合作";
  row.updatedAt = nowText();
  row.lastMessage = `[${row.updatedAt}] 已转入合作管理，合作截止日：${coop.dueDate}。`;
  pushMessage("合作创建", `@${creator(row.creatorId)?.username || "-"} 已从建联记录转入合作管理。`);
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
  openModal(row ? "编辑达人" : "新增达人", `
    <div class="form-grid">
      ${field("username", "TikTok用户名", "beauty_new", row?.username || "")}
      ${field("nickname", "昵称", "New Creator", row?.nickname || "")}
      ${field("type", "达人类型", "短视频达人", row?.type || "")}
      ${field("category", "类目", "美妆", row?.category || "")}
      ${field("region", "地区", "美国", row?.region || "")}
      ${field("followers", "粉丝数", "100000", row?.followers ?? "")}
      ${field("gmv", "近30天GMV", "$10K/月", row?.gmv || "")}
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
    type: get("type") || "短视频达人",
    category: get("category") || "未分类",
    region: get("region") || "-",
    followers: Number(get("followers") || 0),
    gmv: get("gmv") || "-",
    replyRate: get("replyRate") || "-",
    tags: document.getElementById("creatorTags").value.split(",").map((x) => x.trim()).filter(Boolean),
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
  const channelOptions = channelOptionsForCreators(targets);
  if (!channelOptions.length) return alert("当前没有可用发送渠道，请先到平台管理端开启 TikTok 私信、Email 或 WhatsApp。");
  const defaultTemplate = state.templates[0]?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}。";
  openModal("发起建联", `
    <div class="notice">本次将联系 ${targets.length} 位达人：${targets.slice(0, 4).map((c) => `@${escapeHtml(c.username)}`).join("、")}${targets.length > 4 ? " 等" : ""}。Email / WhatsApp 必须同时满足“平台开关已开启”和“所有目标达人已录入联系方式”才会显示。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("outreachProductId", "建联产品", state.products.map((x) => [x.id, `${x.name} · ${x.commission}`]), state.products[0]?.id)}
      ${selectField("outreachChannel", "发送渠道", channelOptions, channelOptions[0][0])}
      ${selectField("outreachTemplateId", "消息模板", [["0", "不使用模板"], ...state.templates.map((x) => [x.id, x.name])], state.templates[0]?.id || "0")}
      ${selectField("outreachSendMode", "发送方式", [["立即发送", "立即发送"], ["定时发送", "定时发送"]], "立即发送")}
      ${field("outreachScheduleAt", "定时发送时间", "2026-06-22 09:30", "")}
      ${selectField("outreachInvite", "附加邀请链接", [["否", "否"], ["是", "是，创建待产出合作"]], "否")}
    </div>
    <div class="form-field" style="margin-top:12px"><label>消息内容</label><textarea id="outreachMessage" class="textarea">${escapeHtml(defaultTemplate)}</textarea></div>
  `, `<button class="btn primary" onclick="saveOutreach('${selectedIds.join(",")}')">确认建联</button>`);
}

function renderTemplate(content, c, p) {
  return String(content || "")
    .replaceAll("{KOL名称}", c.nickname || c.username)
    .replaceAll("{达人名称}", c.nickname || c.username)
    .replaceAll("{产品名称}", p.name)
    .replaceAll("{联盟佣金率}", p.commission || "-");
}

function saveOutreach(idList) {
  const ids = String(idList || "").split(",").map((x) => Number(x)).filter(Boolean);
  const p = product(Number(document.getElementById("outreachProductId").value)) || state.products[0];
  const templateId = Number(document.getElementById("outreachTemplateId").value);
  const template = state.templates.find((x) => x.id === templateId);
  const channel = document.getElementById("outreachChannel").value;
  const sendMode = document.getElementById("outreachSendMode").value;
  const scheduleAt = document.getElementById("outreachScheduleAt").value.trim();
  const invite = document.getElementById("outreachInvite").value === "是";
  const message = document.getElementById("outreachMessage").value.trim() || template?.content || "";
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
  if (!validateChannelForCreators(channel, targets)) return;
  let created = 0;
  ids.forEach((id, index) => {
    const c = creator(id);
    if (!c || c.status === "黑名单") return;
    const rendered = renderTemplate(message, c, p);
    const scheduledText = sendMode === "定时发送" && scheduleAt ? `定时发送：${scheduleAt}` : "立即发送";
    state.outreach.unshift({
      id: Date.now() + index,
      creatorId: c.id,
      productId: p.id,
      channel,
      status: "待回复",
      lastMessage: `${scheduledText} · ${rendered}`,
      updatedAt: nowText(),
    });
    c.status = "已发送";
    if (invite) createCoopRecord(c.id, p.id, "建联时附加邀请链接");
    created += 1;
  });
  state.bulkCreatorIds = [];
  logOperation("建联发送", channel, `创建 ${created} 条建联记录；产品：${p.name}；方式：${sendMode}`);
  pushMessage("批量建联", `已创建 ${created} 条建联记录，渠道：${channel}，产品：${p.name}。`);
  closeModal();
  saveState();
  state.page = "outreach";
  state.selectedCreatorId = null;
  location.hash = "#outreach";
  render();
}

function openCoopModal(id) {
  const row = id ? state.cooperations.find((x) => x.id === id) : null;
  openModal(row ? "编辑合作" : "新增合作", `
    <div class="form-grid">
      ${selectField("coopCreatorId", "达人", state.creators.filter((x) => x.status !== "黑名单").map((x) => [x.id, `@${x.username}`]), row?.creatorId)}
      ${selectField("coopProductId", "产品", state.products.map((x) => [x.id, x.name]), row?.productId)}
      ${selectField("coopType", "合作类型", [["短视频", "短视频"], ["直播", "直播"], ["短视频+直播", "短视频+直播"], ["挂车", "挂车"]], row?.type)}
      ${selectField("coopStatus", "内容状态", outputStatuses.filter((x) => x !== "全部").map((x) => [x, x]), row?.status)}
      ${field("coopDueDate", "产出截止日", "2026-06-30", row?.dueDate || "")}
      ${field("coopOwner", "负责人", "Sam", row?.owner || "")}
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
  const creatorTypes = ["全部", ...Array.from(new Set(state.creators.map((x) => x.type).filter(Boolean)))];
  const regions = ["全部", ...Array.from(new Set(state.creators.map((x) => x.region).filter(Boolean)))];
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
  openModal(row ? "编辑团队成员" : "新增团队成员", `
    <div class="notice">本地版本记录团队配置和操作日志；真实邀请邮件、登录账号和权限拦截需要后端账号系统接入。</div>
    <div class="form-grid" style="margin-top:12px">
      ${field("teamName", "姓名", "Mia", row?.name || "")}
      ${field("teamEmail", "邮箱", "mia@example.com", row?.email || "")}
      ${selectField("teamRole", "角色", roleOptions, row?.role || "BD专员")}
      ${field("teamStores", "可访问店铺", "美国店,英国店", row?.stores || "全部店铺")}
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
    stores: get("teamStores") || "全部店铺",
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
        type: rowValue(row, headers, ["type", "creator_type", "达人类型"], existing?.type || "短视频达人"),
        category: rowValue(row, headers, ["category", "类目"], existing?.category || "未分类"),
        region: rowValue(row, headers, ["region", "地区", "国家"], existing?.region || ""),
        followers: Number(String(rowValue(row, headers, ["followers", "粉丝", "粉丝数"], existing?.followers || 0)).replaceAll(",", "")) || 0,
        gmv: rowValue(row, headers, ["gmv", "近30天GMV"], existing?.gmv || ""),
        replyRate: rowValue(row, headers, ["replyRate", "reply_rate", "回复率"], existing?.replyRate || ""),
        tags: rowValue(row, headers, ["tags", "标签"], (existing?.tags || []).join(",")).split(/[，,]/).map((x) => x.trim()).filter(Boolean),
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
  if (!confirm("确认重置本地演示数据？")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  render();
}

function escapeJs(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

window.setPage = setPage;
window.setFilter = setFilter;
window.dashboardGo = dashboardGo;
window.showCreator = showCreator;
window.syncProducts = syncProducts;
window.syncCreators = syncCreators;
window.syncCoopData = syncCoopData;
window.markMessageRead = markMessageRead;
window.markAllMessagesRead = markAllMessagesRead;
window.deleteMessage = deleteMessage;
window.simulateConnect = simulateConnect;
window.saveApiSettings = saveApiSettings;
window.markApiAuthBlocked = markApiAuthBlocked;
window.approveMerchantApplication = approveMerchantApplication;
window.rejectMerchantApplication = rejectMerchantApplication;
window.resetMerchantApplication = resetMerchantApplication;
window.toggleFeatureSwitch = toggleFeatureSwitch;
window.selectPlan = selectPlan;
window.addProduct = addProduct;
window.openProductModal = openProductModal;
window.goProductCoops = goProductCoops;
window.goProductOutreach = goProductOutreach;
window.openCreatorModal = openCreatorModal;
window.saveCreator = saveCreator;
window.markNotInterested = markNotInterested;
window.clearNotInterested = clearNotInterested;
window.toggleCreatorSelection = toggleCreatorSelection;
window.openOutreachModal = openOutreachModal;
window.saveOutreach = saveOutreach;
window.openReplyModal = openReplyModal;
window.saveReply = saveReply;
window.openCoopModal = openCoopModal;
window.saveCoop = saveCoop;
window.addCoopTag = addCoopTag;
window.markOverdue = markOverdue;
window.advanceOutreach = advanceOutreach;
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
window.importCreatorsCsv = importCreatorsCsv;
window.importCoopsCsv = importCoopsCsv;
window.resetDemo = resetDemo;
window.closeModal = closeModal;

window.addEventListener("hashchange", () => {
  applyRoute();
  render();
});

render();
