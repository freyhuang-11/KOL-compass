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
    outreachSearch: "",
    outreachStatus: "全部",
    outreachChannel: "全部",
    coopSearch: "",
    coopOutput: "全部",
    coopStatus: "全部",
    coopTag: "全部",
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
    { id: 1, name: "感兴趣回复", condition: "包含 interested / yes / details", action: "发送合作说明与样品申请指引", enabled: true },
    { id: 2, name: "价格咨询", condition: "包含 rate / price / paid", action: "发送佣金与付费合作口径", enabled: true },
  ],
  systemMessages: [
    { id: 1, type: "合作提醒", text: "@tech_review_jack 距离产出截止日还有 7 天。", at: "2026-06-21 09:00", read: false },
    { id: 2, type: "API状态", text: "TikTok Partner API 尚未连接，当前使用本地数据模式。", at: "2026-06-21 09:05", read: false },
  ],
  team: [
    { id: 1, name: "Sam", role: "超级管理员", email: "sam@example.com", status: "启用" },
    { id: 2, name: "Mia", role: "BD专员", email: "mia@example.com", status: "启用" },
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
  if (!Array.isArray(merged.bulkCreatorIds)) merged.bulkCreatorIds = [];
  return merged;
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

function stat(label, value, note = "") {
  return `<div class="card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`;
}

function renderDashboard() {
  const totalOutreach = state.outreach.length;
  const replied = state.outreach.filter((x) => x.status === "待我方回复").length;
  const activeCoops = state.cooperations.filter((x) => x.status !== "合作结束").length;
  const sampleOpen = state.samples.filter((x) => x.status !== "已签收").length;
  const gmv = state.cooperations.reduce((sum, x) => sum + Number(x.gmv || 0), 0);
  const output = state.cooperations.filter((x) => x.videos > 0 || x.lives > 0).length;
  return `
    ${pageHead("控制台", "查看建联、寄样、合作履约和归因 GMV 的整体状态。")}
    <div class="grid grid-4">
      ${stat("本月建联数", totalOutreach, "点击建联记录查看明细")}
      ${stat("待回复消息", replied, "需要 BD 处理")}
      ${stat("合作中 KOL", activeCoops, "包含待产出与已产出")}
      ${stat("寄样中", sampleOpen, "待审核/待发货/运输中")}
      ${stat("本月预估 GMV", money(gmv), "仅统计合作管理中的归因 GMV")}
      ${stat("已产出合作", output, "视频或直播数大于 0")}
      ${stat("逾期未产出", state.cooperations.filter((x) => x.status === "逾期未产出").length, "需要催发或终止")}
      ${stat("API连接状态", state.settings.apiStatus, "未连接时使用本地数据")}
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <h3>今日优先事项</h3>
        <div class="timeline">
          ${state.cooperations.filter((x) => ["逾期未产出", "有订单未匹配内容", "待产出"].includes(x.status)).slice(0, 4).map((x) => `
            <div class="message">
              <b>${creator(x.creatorId)?.username || "-"}</b> · ${product(x.productId)?.name || "-"} · ${badge(x.status)}
              <div class="muted">${escapeHtml(x.notes)}</div>
            </div>
          `).join("") || `<div class="empty">暂无需要处理的合作。</div>`}
        </div>
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
        <button class="btn" onclick="addProduct()">手动新增测试商品</button>
      </div>
    </div>
    <div class="notice" style="margin-bottom:12px">真实商品、佣金率和合作模式应来自 TikTok Shop Partner API；当前未授权时仅使用本地数据，不伪造同步成功。</div>
    ${table(["产品", "类目", "价格", "佣金", "合作模式", "状态"], rows.map((p) => [
      `<b>${escapeHtml(p.name)}</b>`,
      p.category,
      p.price,
      p.commission,
      p.mode,
      badge(p.status),
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
    return typeOk && categoryOk && regionOk && followersOk && replyRateOk && kwOk && c.status !== "黑名单";
  });
  return `
    ${pageHead("KOL池", "筛选达人并发起建联。KOL 详情只看基础信息与沟通入口，不展示合作产出指标。", `<button class="btn primary" onclick="openCreatorModal()">新增达人</button>`)}
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
      </div>
      <div class="filters">
        <button class="btn primary" onclick="openOutreachModal()">一键建联(${state.bulkCreatorIds.length})</button>
        <button class="btn" onclick="importCreatorsCsv()">导入KOL CSV</button>
        <button class="btn" onclick="syncCreators()">同步达人数据</button>
      </div>
    </div>
    ${table(["选择", "达人", "类型", "类目/地区", "粉丝", "GMV", "回复率", "标签", "操作"], rows.map((c) => [
      `<input type="checkbox" ${state.bulkCreatorIds.includes(c.id) ? "checked" : ""} onchange="toggleCreatorSelection(${c.id}, this.checked)" aria-label="选择 @${escapeHtml(c.username)}" />`,
      personCell(c),
      c.type,
      `${c.category}<br><span class="muted">${c.region}</span>`,
      c.followers.toLocaleString(),
      c.gmv,
      c.replyRate,
      c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(""),
      `<button class="btn" onclick="openOutreachModal(${c.id})">建联</button> <button class="btn ghost" onclick="showCreator(${c.id})">详情</button> <button class="btn ghost" onclick="openCreatorModal(${c.id})">编辑</button> <button class="btn ghost" onclick="blacklistCreator(${c.id})">拉黑</button>`,
    ]))}
  `;
}

function renderOutreach() {
  const channels = Array.from(new Set(state.outreach.map((o) => o.channel).filter(Boolean)));
  const statuses = Array.from(new Set(state.outreach.map((o) => o.status).filter(Boolean)));
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
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、产品、消息..." value="${escapeHtml(state.filters.outreachSearch)}" oninput="setFilter('outreachSearch', this.value)" />
        <select class="select" onchange="setFilter('outreachStatus', this.value)">
          ${["全部", ...statuses].map((x) => `<option ${state.filters.outreachStatus === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
        <select class="select" onchange="setFilter('outreachChannel', this.value)">
          ${["全部", ...channels].map((x) => `<option ${state.filters.outreachChannel === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}
        </select>
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
  return `
    ${pageHead("自动回复", "配置关键词和条件触发后的自动回复动作。", `<button class="btn primary" onclick="addAutoReply()">新增规则</button>`)}
    ${table(["规则名称", "触发条件", "执行动作", "状态", "操作"], state.autoReplies.map((r) => [
      r.name,
      r.condition,
      r.action,
      r.enabled ? badge("启用") : badge("停用"),
      `<button class="btn" onclick="toggleAutoReply(${r.id})">${r.enabled ? "停用" : "启用"}</button>`,
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
  const rows = state.creators.filter((c) => c.status === "黑名单");
  return `
    ${pageHead("KOL黑名单", "管理不可再触达的达人，防止重复骚扰和低效合作。")}
    ${table(["达人", "类目", "原因/备注", "操作"], rows.map((c) => [
      personCell(c),
      c.category,
      escapeHtml(c.notes),
      `<button class="btn" onclick="restoreCreator(${c.id})">移出黑名单</button>`,
    ]))}
  `;
}

function renderSamples() {
  return `
    ${pageHead("寄样管理", "同步或手工维护样品申请、审核、发货和签收状态。", `<button class="btn primary" onclick="openSampleModal()">新增寄样</button>`)}
    ${table(["达人", "产品", "状态", "物流单号", "更新时间", "操作"], state.samples.map((s) => [
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
  return `
    ${pageHead("系统消息", "新回复、自动回复、寄样状态、合作到期和系统公告。")}
    <div class="timeline">
      ${state.systemMessages.map((m) => `
        <div class="message ${m.read ? "" : "inbound"}">
          <b>${m.type}</b> · <span class="muted">${m.at}</span>
          <div>${escapeHtml(m.text)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTeam() {
  return `
    ${pageHead("账号与团队", "管理团队成员、角色、渠道账号和 TikTok Shop 连接。", `<button class="btn primary" onclick="addTeamMember()">新增成员</button>`)}
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
      ${table(["姓名", "角色", "邮箱", "状态"], state.team.map((m) => [m.name, m.role, m.email, badge(m.status)]))}
    </div>
  `;
}

function renderBilling() {
  return `
    ${pageHead("订阅计费", "查看套餐、配额和账单。支付通道由平台管理端开关控制。")}
    <div class="grid grid-4">
      ${["免费版|$0|100 建联/月", "基础版|$29|1,000 建联/月", "专业版|$99|5,000 建联/月", "企业版|$299|不限量"].map((raw) => {
        const [name, price, quota] = raw.split("|");
        return `<div class="card"><h3>${name}</h3><div class="stat-value">${price}</div><p>${quota}</p><button class="btn ${name === "专业版" ? "primary" : ""}">${name === "专业版" ? "当前推荐" : "选择套餐"}</button></div>`;
      }).join("")}
    </div>
  `;
}

function renderAdmin() {
  return `
    ${pageHead("平台管理端", "功能开关、API 接入状态、商家统计和入驻审批。")}
    <div class="grid grid-2">
      <div class="card">
        <h3>功能开关</h3>
        ${["TikTok私信", "Email消息", "WhatsApp消息", "消息翻译", "Stripe支付"].map((x, i) => `
          <div class="toolbar" style="margin:8px 0">
            <span>${x}</span>
            ${badge(i === 4 ? "停用" : "启用")}
          </div>
        `).join("")}
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

function showCreator(id) {
  navigateHash(`kol/creator/${Number(id)}`);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function syncProducts() {
  state.settings.lastProductSync = nowText();
  state.systemMessages.unshift({ id: Date.now(), type: "商品同步", text: "已触发商品同步。本地模式下仅更新时间；真实数据需完成 TikTok Partner API 授权。", at: nowText(), read: false });
  saveState();
  render();
}

function syncCreators() {
  state.settings.lastCreatorSync = nowText();
  state.systemMessages.unshift({ id: Date.now(), type: "达人同步", text: "已触发达人同步。本地模式下不会抓取 Partner API 数据。", at: nowText(), read: false });
  saveState();
  render();
}

function syncCoopData() {
  state.systemMessages.unshift({ id: Date.now(), type: "内容/订单同步", text: "已触发内容与联盟订单同步。若 API 未授权，请先到平台管理端完成接入。", at: nowText(), read: false });
  state.settings.apiStatus = state.settings.tiktokConnected ? "待同步" : "未连接";
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
  pushMessage("API配置", `TikTok API 本地配置已保存，状态：${state.settings.apiStatus}。`);
  saveState();
  render();
}

function markApiAuthBlocked() {
  state.settings.apiStatus = "授权阻塞";
  state.settings.tiktokLastAuthCheck = nowText();
  pushMessage("API授权阻塞", "TikTok API 接入需要人工处理 OAuth、验证码、scope 审批或 redirect URL 配置。");
  saveState();
  render();
}

function addProduct() {
  const name = prompt("产品名称");
  if (!name) return;
  state.products.push({ id: Date.now(), name, category: "未分类", price: "-", commission: "10%", mode: "公开合作", status: "在售" });
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
  const channels = new Map();
  channels.set(row.channel || "TikTok私信", row.channel || "TikTok私信");
  channels.set("TikTok私信", "TikTok私信");
  if (c?.email) channels.set("Email", "Email");
  if (c?.whatsapp) channels.set("WhatsApp", "WhatsApp");
  return Array.from(channels.entries());
}

function openReplyModal(id) {
  const row = state.outreach.find((x) => x.id === id);
  if (!row) return;
  const c = creator(row.creatorId);
  const p = product(row.productId) || state.products[0];
  const defaultTemplate = state.templates[1]?.content || "Hi {KOL名称}，感谢回复，我们会继续推进 {产品名称} 的合作。";
  openModal("回复达人", `
    <div class="notice">正在回复 @${escapeHtml(c?.username || "-")}。如达人已提供 Email 或 WhatsApp，可先在 KOL 详情中录入联系方式后切换渠道。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("replyChannel", "回复渠道", replyChannelOptions(row), row.channel || "TikTok私信")}
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
  row.channel = document.getElementById("replyChannel").value;
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
  c.notes = reason;
  saveState();
  render();
}

function toggleCreatorSelection(id, checked) {
  const next = new Set(state.bulkCreatorIds || []);
  if (checked) next.add(id);
  else next.delete(id);
  state.bulkCreatorIds = Array.from(next);
  saveState();
  render();
}

function openOutreachModal(creatorId = 0) {
  const selectedIds = creatorId ? [creatorId] : (state.bulkCreatorIds || []);
  const targets = selectedIds.map((id) => creator(id)).filter(Boolean).filter((c) => c.status !== "黑名单");
  if (!targets.length) {
    alert("请先选择至少一位可建联达人");
    return;
  }
  const first = targets[0];
  const channelOptions = [["TikTok私信", "TikTok私信"]];
  if (targets.every((c) => c.email)) channelOptions.push(["Email", "Email"]);
  if (targets.every((c) => c.whatsapp)) channelOptions.push(["WhatsApp", "WhatsApp"]);
  const defaultTemplate = state.templates[0]?.content || "Hi {KOL名称}，我们想邀请你合作 {产品名称}。";
  openModal("发起建联", `
    <div class="notice">本次将联系 ${targets.length} 位达人：${targets.slice(0, 4).map((c) => `@${escapeHtml(c.username)}`).join("、")}${targets.length > 4 ? " 等" : ""}。未录入 Email/WhatsApp 的达人仅显示 TikTok 私信渠道。</div>
    <div class="form-grid" style="margin-top:12px">
      ${selectField("outreachProductId", "建联产品", state.products.map((x) => [x.id, `${x.name} · ${x.commission}`]), state.products[0]?.id)}
      ${selectField("outreachChannel", "发送渠道", channelOptions, "TikTok私信")}
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

function addAutoReply() {
  const name = prompt("规则名称");
  if (!name) return;
  state.autoReplies.push({ id: Date.now(), name, condition: "自定义关键词", action: "发送指定模板", enabled: true });
  saveState();
  render();
}

function toggleAutoReply(id) {
  const row = state.autoReplies.find((x) => x.id === id);
  if (row) row.enabled = !row.enabled;
  saveState();
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
  pushMessage("模板更新", `消息模板“${name}”已保存。`);
  closeModal();
  saveState();
  render();
}

function deleteTemplate(id) {
  if (!confirm("确认删除该消息模板？")) return;
  state.templates = state.templates.filter((x) => x.id !== id);
  saveState();
  render();
}

function restoreCreator(id) {
  const c = creator(id);
  if (c) c.status = "待联系";
  saveState();
  render();
}

function addTeamMember() {
  const name = prompt("成员姓名");
  if (!name) return;
  state.team.push({ id: Date.now(), name, role: "BD专员", email: `${name.toLowerCase()}@example.com`, status: "启用" });
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
window.showCreator = showCreator;
window.syncProducts = syncProducts;
window.syncCreators = syncCreators;
window.syncCoopData = syncCoopData;
window.simulateConnect = simulateConnect;
window.saveApiSettings = saveApiSettings;
window.markApiAuthBlocked = markApiAuthBlocked;
window.addProduct = addProduct;
window.openCreatorModal = openCreatorModal;
window.saveCreator = saveCreator;
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
window.addAutoReply = addAutoReply;
window.toggleAutoReply = toggleAutoReply;
window.openTemplateModal = openTemplateModal;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.restoreCreator = restoreCreator;
window.addTeamMember = addTeamMember;
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
