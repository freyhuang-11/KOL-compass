// KOL Compass 建联前采集器 —— content script（隔离世界）
// 接收 inject.js（页面世界）钩到的 TikTok item_list 视频数据，聚合成"建联前体检"：
// 近期视频表现（均播/互动率/发布频率/范围）+ 话题词云 + 达人头部资料 → 回传 Compass。
// 内容信号是 TikTok API 给不了的，这是建联前选对人的核心。

(function () {
  "use strict";

  // —— 收集 inject.js 钩到的视频/评论（去重）——
  const videos = new Map();
  const comments = new Map();
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || !d.__kc || !Array.isArray(d.items)) return;
    if (d.type === "kc-items") { for (const v of d.items) if (v && v.id) videos.set(v.id, v); }
    else if (d.type === "kc-comments") { for (const c of d.items) if (c && c.text) comments.set(c.text, c); }
  });

  // 买家意向关键词（中/英/东南亚常见）
  const BUY_INTENT = [
    /where (can i |to )?(buy|get|find)/i, /how (much|to buy)/i, /\bprice\b/i, /\blink( pls| please)?\b/i,
    /\bbuy\b/i, /want (this|it)/i, /need (this|it)/i, /\bcart\b/i, /\border\b/i, /available/i, /interested/i,
    /哪.{0,2}买/, /链接/, /多少钱/, /怎么买/, /求链接/, /在哪.{0,2}买/, /想要/, /现货/, /多少钱/, /购买/,
  ];
  function buildCommentIntent() {
    const all = [...comments.values()];
    if (!all.length) return null;
    const matched = all.filter((c) => BUY_INTENT.some((re) => re.test(c.text)));
    return {
      sampled: all.length,
      intentCount: matched.length,
      intentRatio: +(matched.length / all.length * 100).toFixed(1),
      samples: matched.slice(0, 5).map((c) => c.text.slice(0, 80)),
    };
  }

  function handleFromUrl() {
    const m = location.pathname.match(/^\/@([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function text(sel) {
    const el = document.querySelector(sel);
    return el ? (el.textContent || "").trim() : "";
  }

  // "42K" / "1.2M" / "3,456" → number
  function parseCount(raw) {
    const s = String(raw || "").trim().replace(/,/g, "");
    const m = s.match(/([\d.]+)\s*([KMB万亿]?)/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    const u = m[2].toUpperCase();
    if (u === "K") n *= 1e3; else if (u === "M") n *= 1e6; else if (u === "B") n *= 1e9;
    else if (u === "万") n *= 1e4; else if (u === "亿") n *= 1e8;
    return Math.round(n) || 0;
  }

  const TOPIC_WORDS = ["beauty","skincare","makeup","fashion","outfit","haul","review","fitness","food","recipe","home","kitchen","tech","gadget","pet","baby","mom","travel","health","supplement","hair","nails","fragrance","massage","prenatal","postnatal","shopeehaul","affiliate","美妆","护肤","穿搭","美食","母婴","宠物","健康","数码","居家"];
  function extractTopics(blob) {
    const lower = String(blob || "").toLowerCase();
    // 高频 hashtag
    const tags = (String(blob).match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase());
    const tagFreq = {};
    tags.forEach((t) => { tagFreq[t] = (tagFreq[t] || 0) + 1; });
    const topTags = Object.keys(tagFreq).sort((a, b) => tagFreq[b] - tagFreq[a]).slice(0, 10);
    const known = TOPIC_WORDS.filter((k) => lower.includes(k));
    return Array.from(new Set([...topTags, ...known])).slice(0, 15);
  }

  // —— 从钩到的视频算近期表现体检 ——
  function buildPerf() {
    const all = [...videos.values()].filter((v) => v.createTime > 0 || v.playCount > 0);
    if (!all.length) return null;
    all.sort((a, b) => b.createTime - a.createTime);
    const recent = all.slice(0, 15);
    const n = recent.length;
    const sum = (f) => recent.reduce((s, v) => s + f(v), 0);
    const avgPlay = Math.round(sum((v) => v.playCount) / n);
    const avgLike = Math.round(sum((v) => v.diggCount) / n);
    const avgComment = Math.round(sum((v) => v.commentCount) / n);
    const eng = recent.map((v) => v.playCount ? (v.diggCount + v.commentCount + v.shareCount) / v.playCount : 0);
    const avgEngagement = +(eng.reduce((s, x) => s + x, 0) / n * 100).toFixed(2);
    const plays = recent.map((v) => v.playCount);
    const times = recent.map((v) => v.createTime).filter(Boolean).sort((a, b) => b - a);
    let postsPerWeek = 0;
    if (times.length > 1) {
      const spanDays = (times[0] - times[times.length - 1]) / 86400;
      postsPerWeek = spanDays > 0 ? +((times.length / spanDays) * 7).toFixed(1) : 0;
    }
    const captions = recent.map((v) => v.desc).filter(Boolean).slice(0, 20);
    // 带货信号：近期视频里挂了商品/带货标记的条数（替代不可靠的评论率）
    const ecCount = recent.filter((v) => v.isEc).length;
    const anchorTypeSet = Array.from(new Set(recent.flatMap((v) => v.anchorTypes || []))).slice(0, 12);
    // 达人在带的商品名（产品级匹配用）
    const ecProductNames = Array.from(new Set(recent.flatMap((v) => v.anchorKeywords || []).filter(Boolean))).slice(0, 20);
    // 诊断：若漏检（带货数 < 视频数），打印未识别视频带了哪些可能相关的字段，便于继续校准
    try {
      const missed = recent.filter((v) => !v.isEc);
      if (missed.length) {
        console.log(`[KC带货诊断] 带货 ${ecCount}/${n}，未识别 ${missed.length} 条 →`, missed.map((v) => ({ id: String(v.id).slice(-6), dbgKeys: v.dbgKeys || [] })));
      }
    } catch (e) {}
    return {
      sampleCount: n,
      avgPlay, avgLike, avgComment, avgEngagement,
      playMin: Math.min(...plays), playMax: Math.max(...plays),
      postsPerWeek,
      lastPostAt: times[0] ? new Date(times[0] * 1000).toISOString() : "",
      recentCaptions: captions,
      contentTopics: extractTopics(captions.join(" ")),
      ecVideoCount: ecCount,
      ecVideoRatio: +(ecCount / n * 100).toFixed(1),
      ecProductNames,
      _anchorTypesSeen: anchorTypeSet, // 诊断：真机核对带货字段用
    };
  }

  function extractCreator() {
    const username = handleFromUrl();
    if (!username) return null;
    const nickname = text('[data-e2e="user-title"]') || text('[data-e2e="user-subtitle"]') || text("h1") || username;
    const followers = parseCount(text('[data-e2e="followers-count"]'));
    const bio = text('[data-e2e="user-bio"]');
    const perf = buildPerf();
    return {
      username,
      nickname,
      followers,
      bio,
      sourceUrl: location.href.split("?")[0],
      capturedAt: new Date().toISOString(),
      // 建联前体检（来自 TikTok item_list 接口，API 给不了的内容信号）
      avgVideoViews: perf ? perf.avgPlay : 0,
      recentCaptions: perf ? perf.recentCaptions : [],
      contentTopics: perf ? perf.contentTopics : [],
      recentPerf: perf || null,
      // 评论买家意向已撤（评论率不可靠，BD 反馈不能作参考）→ 改用 recentPerf.ecVideoCount 带货信号
    };
  }

  // ============ 页面内浮动面板（打开达人页自动显示，不用点扩展图标）============
  let merchantCats = [];
  let merchantProducts = []; // 客户产品名（用于显示 TA 贴近你哪个产品）
  (async function loadMerchantCats() {
    try {
      const { compassUrl } = await chrome.storage.local.get(["compassUrl"]);
      const base = (compassUrl || "http://127.0.0.1:8015").replace(/\/+$/, "");
      const r = await fetch(base + "/api/merchant/context");
      const d = await r.json();
      merchantCats = Array.isArray(d.categories) ? d.categories : [];
      merchantProducts = Array.isArray(d.productNames) ? d.productNames.filter(Boolean) : [];
    } catch (e) { merchantCats = []; merchantProducts = []; }
  })();

  // 停用词：功能词 + 营销/电商噪声词，绝不当产品关键词（避免 pin/deal/get 这种碎词）
  const KC_STOPWORDS = new Set(["the","and","for","with","without","from","your","you","our","this","that","these","those","are","was","can","will","just","not","all","any","per","via","new","now","get","got","use","used","using","one","two","set","pcs","pack","kit","piece","pieces","size","sizes","sized","color","colour","colors","style","type","item","items","free","hot","sale","best","top","good","great","super","more","most","plus","pro","max","mini","big","small","large","light","soft","high","low","off","out","has","have","its","only","each","portable","electric","rechargeable","wireless","waterproof","premium","quality","original","multi","multifunction","multifunctional","adjustable","foldable","compact","pocket","powerful","power","airflow","usb","led","gift","home","fashion","women","men","unisex","kids","brand","cute","review","haul","unboxing","tiktok","shopee","lazada","video","like","follow","fyp","viral","trending","pin","deal","deals","promo","code","voucher","discount","offer","offers","link","buy","shop","store","official","order","cart","price","cheap","seller","ready","stock","restock","local","fast","delivery","shipping","ship","pcssg","sgstock"]);
  const kcStem = (w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
  function kcTokens(blob) {
    const out = new Set();
    const lower = String(blob || "").toLowerCase();
    (lower.match(/[a-z][a-z0-9]{2,}/g) || []).forEach((t) => { if (!KC_STOPWORDS.has(t) && !/^\d+$/.test(t)) out.add(kcStem(t)); });
    (lower.match(/[一-龥]{2,}/g) || []).forEach((seg) => { for (let i = 0; i + 2 <= seg.length; i++) out.add(seg.slice(i, i + 2)); });
    return out;
  }
  // 产品名 → 简短可读的"东西名字"（去营销词，取核心）
  function productShortName(name) {
    const en = (String(name).toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []).filter((t) => !KC_STOPWORDS.has(t));
    const zh = String(name).match(/[一-龥]{2,}/g) || [];
    if (zh.length) return zh.slice(0, 2).join("");
    return en.slice(0, 3).join(" ") || String(name).slice(0, 16);
  }
  // 达人内容 vs 客户产品：逐个产品比，返回 TA 贴近的产品名（不再列碎词）
  function productMatch(d) {
    if (!merchantProducts.length) return { hasKeywords: false, matched: [], hasContent: false };
    const p = d.recentPerf;
    const blob = [
      (p && Array.isArray(p.ecProductNames) ? p.ecProductNames.join(" ") : ""),
      (d.contentTopics || []).join(" "),
      (d.recentCaptions || []).join(" "),
    ].join(" ");
    const terms = kcTokens(blob);
    const hits = [];
    for (const pname of merchantProducts) {
      const pkw = [...kcTokens(pname)];
      if (!pkw.length) continue;
      const n = pkw.filter((k) => terms.has(k)).length;
      if (n >= 1) hits.push({ name: productShortName(pname), n });
    }
    hits.sort((a, b) => b.n - a.n);
    const seen = new Set();
    const matched = hits.map((h) => h.name).filter((x) => x && !seen.has(x) && seen.add(x)).slice(0, 3);
    return { hasKeywords: true, matched, hasContent: terms.size > 0 };
  }

  const TOPIC_TO_CATEGORY = {
    beauty: "美妆个护", skincare: "美妆个护", makeup: "美妆个护", hair: "美妆个护", nails: "美妆个护", fragrance: "美妆个护",
    fashion: "时尚配饰", outfit: "女装与内衣", haul: "女装与内衣",
    food: "食品饮料", recipe: "食品饮料",
    home: "家居日用", kitchen: "厨房用品",
    tech: "手机数码", gadget: "手机数码",
    pet: "宠物用品", baby: "母婴用品", mom: "母婴用品",
    fitness: "户外运动", health: "健康保健", supplement: "健康保健", massage: "健康保健", prenatal: "母婴用品", postnatal: "母婴用品",
    "美妆": "美妆个护", "护肤": "美妆个护", "穿搭": "时尚配饰", "美食": "食品饮料", "母婴": "母婴用品", "宠物": "宠物用品", "健康": "健康保健", "数码": "手机数码", "居家": "家居日用",
  };
  function creatorCats(d) {
    const out = new Set();
    (d.contentTopics || []).forEach((t) => { const c = TOPIC_TO_CATEGORY[String(t).toLowerCase()]; if (c) out.add(c); });
    return [...out];
  }
  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  const DOT = { green: "🟢", yellow: "🟡", red: "🔴", gray: "⚪" };
  function computeLights(d) {
    const p = d.recentPerf;
    // 内容契合：优先产品级（达人在带/在发的东西 vs 客户产品关键词），无产品关键词则退回大类目
    let fit;
    const pm = productMatch(d);
    if (pm.hasKeywords) {
      if (pm.matched.length) fit = { level: "green", text: `贴近你的产品：${pm.matched.slice(0, 3).join("、")}`, ok: true };
      else if (pm.hasContent) fit = { level: "red", text: "内容跟你的产品不沾", ok: false };
      else fit = { level: "gray", text: "未采到内容", ok: null };
    } else {
      const ccats = creatorCats(d);
      const matched = ccats.filter((c) => merchantCats.includes(c));
      if (!merchantCats.length) fit = { level: "gray", text: "未设置店铺品类", ok: null };
      else if (matched.length) fit = { level: "green", text: `命中 ${matched.join("、")}`, ok: true };
      else fit = { level: "red", text: ccats.length ? `在发 ${ccats.join("、")}` : "未发你的品类", ok: false };
    }
    let eng;
    if (!p) eng = { level: "gray", text: "未采集", ok: null };
    else if (p.avgEngagement >= 2.5) eng = { level: "green", text: p.avgEngagement + "%（高）", ok: true };
    else if (p.avgEngagement >= 1) eng = { level: "yellow", text: p.avgEngagement + "%（中）", ok: null };
    else eng = { level: "red", text: p.avgEngagement + "%（低）", ok: false };
    let ec;
    if (!p || p.ecVideoCount == null) ec = { level: "gray", text: "未采集", ok: null };
    else if (p.ecVideoCount >= 3) ec = { level: "green", text: `${p.ecVideoCount}/${p.sampleCount} 条带货`, ok: true };
    else if (p.ecVideoCount >= 1) ec = { level: "yellow", text: `${p.ecVideoCount}/${p.sampleCount} 条带货`, ok: null };
    else ec = { level: "red", text: "近期未见带货", ok: false };
    let act;
    if (!p) act = { level: "gray", text: "未采集", ok: null };
    else if (p.postsPerWeek >= 1 && p.postsPerWeek <= 21) act = { level: "green", text: p.postsPerWeek + "条/周", ok: true };
    else act = { level: "yellow", text: (p.postsPerWeek || 0) + "条/周", ok: null };
    return { fit, eng, ec, act };
  }
  function verdict(L) {
    if (L.fit.ok === false) return { level: "red", text: "谨慎 · 不发你的品类" };
    const greens = [L.fit, L.eng, L.ec].filter((x) => x.ok === true).length;
    if (greens >= 2) return { level: "green", text: "建议建联" };
    return { level: "yellow", text: "可考虑" };
  }

  let panelHost = null, panelRoot = null, panelHidden = false;
  function ensurePanel() {
    if (panelHost) return;
    panelHost = document.createElement("div");
    panelHost.id = "kc-compass-panel";
    panelHost.style.cssText = "position:fixed;top:90px;right:16px;z-index:2147483600;width:300px;font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;";
    panelRoot = panelHost.attachShadow({ mode: "open" });
    document.documentElement.appendChild(panelHost);
  }
  function lightRow(label, level, text) {
    const color = { green: "#15803d", yellow: "#b45309", red: "#b91c1c", gray: "#94a3b8" }[level];
    return `<div class="row"><span>${DOT[level]} ${label}</span><b style="color:${color}">${text}</b></div>`;
  }
  function renderPanel() {
    const d = extractCreator();
    if (!d || !d.username) { if (panelHost) panelHost.style.display = "none"; return; }
    ensurePanel();
    panelHost.style.display = panelHidden ? "none" : "block";
    const p = d.recentPerf;
    const L = computeLights(d);
    const v = verdict(L);
    const vBg = { green: "#dcfce7", yellow: "#fef9c3", red: "#fee2e2" }[v.level];
    const vFg = { green: "#15803d", yellow: "#b45309", red: "#b91c1c" }[v.level];
    panelRoot.innerHTML = `
      <style>
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 8px 24px rgba(15,23,42,.18); overflow:hidden; color:#0f172a; }
        .head { background:#2563eb; color:#fff; padding:8px 12px; font-size:13px; font-weight:600; display:flex; justify-content:space-between; align-items:center; }
        .head .x { cursor:pointer; opacity:.85; font-size:16px; line-height:1; }
        .body { padding:12px; }
        .who { font-size:13px; margin-bottom:8px; } .who b{ font-size:14px; } .muted{ color:#94a3b8; }
        .verdict { text-align:center; font-weight:700; font-size:15px; padding:7px; border-radius:8px; margin-bottom:10px; background:${vBg}; color:${vFg}; }
        .row { display:flex; justify-content:space-between; align-items:center; font-size:13px; padding:2px 0; }
        .row span { color:#475569; }
        .detail { margin-top:9px; font-size:12px; color:#64748b; line-height:1.5; }
        .warn { color:#dc2626; }
      </style>
      <div class="card">
        <div class="head"><span>KOL Compass · 建联前体检</span><span class="x" title="收起">×</span></div>
        <div class="body">
          <div class="who"><b>${d.nickname || d.username}</b> <span class="muted">@${d.username}</span> · 粉丝 ${fmtNum(d.followers)}</div>
          <div class="verdict">${DOT[v.level]} ${v.text}</div>
          ${lightRow("内容契合", L.fit.level, L.fit.text)}
          ${lightRow("互动率", L.eng.level, L.eng.text)}
          ${lightRow("带货频率", L.ec.level, L.ec.text)}
          ${lightRow("发布活跃", L.act.level, L.act.text)}
          <div class="detail">${p ? `近${p.sampleCount}条 · 均播 ${fmtNum(p.avgPlay)} · 带货 ${p.ecVideoCount ?? 0}条 · 发布 ${p.postsPerWeek || 0}/周` : '<span class="warn">正在体检——往下滚一屏让视频墙加载…</span>'}</div>
        </div>
      </div>`;
    const x = panelRoot.querySelector(".x");
    if (x) x.onclick = () => { panelHidden = true; panelHost.style.display = "none"; };
  }

  // —— popup 请求当前达人 ——
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg && msg.type === "extract-current") { sendResponse({ ok: true, data: extractCreator() }); return true; }
  });

  // —— 自动采集（默认开，限速 60s）——
  async function maybeAuto() {
    const c = extractCreator();
    if (!c || !c.recentPerf) return; // 没钩到视频数据不采
    const { autoCapture } = await chrome.storage.local.get(["autoCapture"]);
    if (autoCapture === false) return; // 仅显式关闭时不采；未设置=默认开
    const key = "kc_last_" + c.username;
    const store = await chrome.storage.local.get([key]);
    if (Date.now() - Number(store[key] || 0) < 60000) return;
    await chrome.storage.local.set({ [key]: Date.now() });
    chrome.runtime.sendMessage({ type: "ingest-creator", data: c });
  }

  // 数据变化时刷新面板（钩到新视频/评论就重画）
  window.addEventListener("message", (e) => {
    if (e.data && e.data.__kc) { try { renderPanel(); } catch (err) {} }
  });

  // 面板尽早出现（即使还没钩到视频，先显示"正在体检"），随后持续刷新；视频墙加载后自动采集
  let tries = 0;
  let lastHandle = handleFromUrl();
  function safeRender() {
    const h = handleFromUrl();
    if (h !== lastHandle) { lastHandle = h; videos.clear(); comments.clear(); tries = 0; } // 切达人清缓存，防数据串台
    try { renderPanel(); } catch (err) {}
  }
  safeRender();
  const timer = setInterval(() => {
    tries += 1;
    safeRender();
    if (videos.size >= 6 || tries > 12) { clearInterval(timer); maybeAuto(); safeRender(); }
  }, 1500);
  // SPA 路由：TikTok 切达人不刷新整页，定期校正面板对应当前 @handle
  setInterval(safeRender, 3000);
})();
