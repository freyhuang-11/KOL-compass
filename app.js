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
  filters: {
    kolSearch: "",
    kolType: "全部",
    coopStatus: "全部",
    coopTag: "全部",
  },
  settings: {
    tiktokConnected: false,
    apiStatus: "未连接",
    lastProductSync: "尚未同步",
    lastCreatorSync: "尚未同步",
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

let state = loadState();
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
  return `
    ${pageHead("产品管理", "同步和查看 TikTok Shop 商品、联盟佣金与合作模式。", `<button class="btn primary" onclick="syncProducts()">同步商品</button>`)}
    <div class="toolbar">
      <div class="muted">上次同步：${state.settings.lastProductSync}</div>
      <div class="filters">
        <button class="btn" onclick="addProduct()">手动新增测试商品</button>
      </div>
    </div>
    ${table(["产品", "类目", "价格", "佣金", "合作模式", "状态"], state.products.map((p) => [
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
  const rows = state.creators.filter((c) => {
    const kw = state.filters.kolSearch.trim().toLowerCase();
    const typeOk = state.filters.kolType === "全部" || c.type === state.filters.kolType;
    const kwOk = !kw || [c.username, c.nickname, c.category, c.region, c.tags.join(",")].join(" ").toLowerCase().includes(kw);
    return typeOk && kwOk && c.status !== "黑名单";
  });
  return `
    ${pageHead("KOL池", "筛选达人并发起建联。KOL 详情只看基础信息与沟通入口，不展示合作产出指标。", `<button class="btn primary" onclick="openCreatorModal()">新增达人</button>`)}
    <div class="toolbar">
      <div class="filters">
        <input class="input" placeholder="搜索达人、用户名、标签..." value="${escapeHtml(state.filters.kolSearch)}" oninput="setFilter('kolSearch', this.value)" />
        <select class="select" onchange="setFilter('kolType', this.value)">
          ${["全部", "短视频达人", "直播达人", "短视频/直播达人"].map((x) => `<option ${state.filters.kolType === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
      </div>
      <div class="filters">
        <button class="btn" onclick="importCreatorsCsv()">导入KOL CSV</button>
        <button class="btn" onclick="syncCreators()">同步达人数据</button>
      </div>
    </div>
    ${table(["达人", "类型", "类目/地区", "粉丝", "GMV", "回复率", "标签", "操作"], rows.map((c) => [
      personCell(c),
      c.type,
      `${c.category}<br><span class="muted">${c.region}</span>`,
      c.followers.toLocaleString(),
      c.gmv,
      c.replyRate,
      c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(""),
      `<button class="btn" onclick="createOutreach(${c.id})">建联</button> <button class="btn ghost" onclick="showCreator(${c.id})">详情</button> <button class="btn ghost" onclick="openCreatorModal(${c.id})">编辑</button> <button class="btn ghost" onclick="blacklistCreator(${c.id})">拉黑</button>`,
    ]))}
  `;
}

function renderOutreach() {
  return `
    ${pageHead("建联记录", "统一查看 TikTok 私信、Email、WhatsApp 的沟通状态和待处理消息。")}
    ${table(["达人", "产品", "渠道", "状态", "最后消息", "更新时间", "操作"], state.outreach.map((o) => [
      personCell(creator(o.creatorId)),
      product(o.productId)?.name || "-",
      o.channel,
      badge(o.status),
      escapeHtml(o.lastMessage),
      o.updatedAt,
      `<button class="btn ghost" onclick="showCreator(${o.creatorId})">查看沟通</button>`,
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
    ${pageHead("消息模板", "维护 TikTok 私信、Email、WhatsApp 的建联与跟进模板。", `<button class="btn primary" onclick="addTemplate()">新增模板</button>`)}
    ${table(["模板名称", "渠道", "内容", "操作"], state.templates.map((t) => [
      t.name,
      t.channel,
      escapeHtml(t.content),
      `<button class="btn" onclick="editTemplate(${t.id})">编辑</button>`,
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
    ${pageHead("寄样管理", "同步或手工维护样品申请、审核、发货和签收状态。", `<button class="btn primary" onclick="addSample()">新增寄样</button>`)}
    ${table(["达人", "产品", "状态", "物流单号", "更新时间", "操作"], state.samples.map((s) => [
      personCell(creator(s.creatorId)),
      product(s.productId)?.name || "-",
      badge(s.status),
      s.tracking || "-",
      s.updatedAt,
      `<button class="btn" onclick="updateSample(${s.id})">更新</button>`,
    ]))}
  `;
}

function renderCooperations() {
  const rows = state.cooperations.filter((c) => {
    const statusOk = state.filters.coopStatus === "全部" || c.status === state.filters.coopStatus;
    const tagOk = state.filters.coopTag === "全部" || c.tags.includes(state.filters.coopTag);
    return statusOk && tagOk;
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
            ${records.map((r) => `<div class="message ${r.status === "待我方回复" ? "inbound" : "outbound"}"><b>${r.channel}</b> · ${badge(r.status)}<div>${escapeHtml(r.lastMessage)}</div><span class="muted">${r.updatedAt}</span></div>`).join("") || `<div class="empty">暂无沟通记录。</div>`}
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
          <button class="btn primary" onclick="createOutreach(${c.id})">发起建联</button>
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

function addProduct() {
  const name = prompt("产品名称");
  if (!name) return;
  state.products.push({ id: Date.now(), name, category: "未分类", price: "-", commission: "10%", mode: "公开合作", status: "在售" });
  saveState();
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
    email: id ? (creator(id)?.email || "") : "",
    whatsapp: id ? (creator(id)?.whatsapp || "") : "",
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

function createOutreach(creatorId) {
  const productId = Number(prompt("输入产品ID（1/2/3），留空默认第一个产品", state.products[0]?.id || ""));
  const p = product(productId) || state.products[0];
  state.outreach.unshift({
    id: Date.now(),
    creatorId,
    productId: p.id,
    channel: "TikTok私信",
    status: "待回复",
    lastMessage: `已创建给 @${creator(creatorId)?.username} 的 ${p.name} 建联任务。`,
    updatedAt: nowText(),
  });
  const c = creator(creatorId);
  if (c) c.status = "已发送";
  saveState();
  state.page = "outreach";
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

function updateSample(id) {
  const row = state.samples.find((x) => x.id === id);
  if (!row) return;
  const status = prompt("新状态：待审核/待发货/已发货/已签收/已拒绝", row.status);
  if (!status) return;
  row.status = status;
  row.tracking = prompt("物流单号", row.tracking) || row.tracking;
  row.updatedAt = nowText();
  saveState();
  render();
}

function addSample() {
  const c = state.creators[0];
  const p = state.products[0];
  state.samples.unshift({ id: Date.now(), creatorId: c.id, productId: p.id, status: "待审核", tracking: "", updatedAt: nowText() });
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

function addTemplate() {
  const name = prompt("模板名称");
  if (!name) return;
  state.templates.push({ id: Date.now(), name, channel: "TikTok私信", content: "Hi {KOL名称}，我们想邀请你合作。" });
  saveState();
  render();
}

function editTemplate(id) {
  const row = state.templates.find((x) => x.id === id);
  if (!row) return;
  const content = prompt("模板内容", row.content);
  if (content == null) return;
  row.content = content;
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
window.addProduct = addProduct;
window.openCreatorModal = openCreatorModal;
window.saveCreator = saveCreator;
window.createOutreach = createOutreach;
window.openCoopModal = openCoopModal;
window.saveCoop = saveCoop;
window.addCoopTag = addCoopTag;
window.markOverdue = markOverdue;
window.addSample = addSample;
window.updateSample = updateSample;
window.addAutoReply = addAutoReply;
window.toggleAutoReply = toggleAutoReply;
window.addTemplate = addTemplate;
window.editTemplate = editTemplate;
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
