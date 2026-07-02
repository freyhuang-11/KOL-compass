// KOL Compass 建联前采集器 —— popup（采集明细 + 红绿灯 + 综合结论）
const $ = (id) => document.getElementById(id);
let current = null;
let merchantCats = []; // 当前店铺商品品类，从 Compass 取，用来算"内容契合"
let merchantProducts = []; // 客户产品名，做产品级内容匹配 + 显示 TA 贴近你哪个产品

const KC_STOPWORDS = new Set(["the","and","for","with","without","from","your","you","our","this","that","these","those","are","was","can","will","just","not","all","any","per","via","new","now","get","got","use","used","using","one","two","set","pcs","pack","kit","piece","pieces","size","sizes","sized","color","colour","colors","style","type","item","items","free","hot","sale","best","top","good","great","super","more","most","plus","pro","max","mini","big","small","large","light","soft","high","low","off","out","has","have","its","only","each","portable","electric","rechargeable","wireless","waterproof","premium","quality","original","multi","multifunction","multifunctional","adjustable","foldable","compact","pocket","powerful","power","airflow","usb","led","gift","home","fashion","women","men","unisex","kids","brand","cute","review","haul","unboxing","tiktok","shopee","lazada","video","like","follow","fyp","viral","trending","pin","deal","deals","promo","code","voucher","discount","offer","offers","link","buy","shop","store","official","order","cart","price","cheap","seller","ready","stock","restock","local","fast","delivery","shipping","ship"]);
const kcStem = (w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
function kcTokens(blob) {
  const out = new Set();
  const lower = String(blob || "").toLowerCase();
  (lower.match(/[a-z][a-z0-9]{2,}/g) || []).forEach((t) => { if (!KC_STOPWORDS.has(t) && !/^\d+$/.test(t)) out.add(kcStem(t)); });
  (lower.match(/[一-龥]{2,}/g) || []).forEach((seg) => { for (let i = 0; i + 2 <= seg.length; i++) out.add(seg.slice(i, i + 2)); });
  return out;
}
function productShortName(name) {
  const en = (String(name).toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || []).filter((t) => !KC_STOPWORDS.has(t));
  const zh = String(name).match(/[一-龥]{2,}/g) || [];
  if (zh.length) return zh.slice(0, 2).join("");
  return en.slice(0, 3).join(" ") || String(name).slice(0, 16);
}
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

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
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

const DOT = { green: "🟢", yellow: "🟡", red: "🔴", gray: "⚪" };
function lightRow(label, level, text) {
  const color = { green: "#15803d", yellow: "#b45309", red: "#b91c1c", gray: "#94a3b8" }[level];
  return `<div class="light-row"><span>${DOT[level]} ${label}</span><b style="color:${color}">${text}</b></div>`;
}

function computeLights(d) {
  const p = d.recentPerf;
  // 内容契合：优先产品级（达人在带/在发 vs 客户产品关键词），无产品关键词则退回大类目
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
  // 互动率
  let eng;
  if (!p) eng = { level: "gray", text: "未采集", ok: null };
  else if (p.avgEngagement >= 2.5) eng = { level: "green", text: p.avgEngagement + "%（高）", ok: true };
  else if (p.avgEngagement >= 1) eng = { level: "yellow", text: p.avgEngagement + "%（中）", ok: null };
  else eng = { level: "red", text: p.avgEngagement + "%（低）", ok: false };
  // 带货频率（近期挂商品的视频数）—— 替代不可靠的评论率
  let ec;
  if (!p || p.ecVideoCount == null) ec = { level: "gray", text: "未采集", ok: null };
  else if (p.ecVideoCount >= 3) ec = { level: "green", text: `${p.ecVideoCount}/${p.sampleCount} 条带货`, ok: true };
  else if (p.ecVideoCount >= 1) ec = { level: "yellow", text: `${p.ecVideoCount}/${p.sampleCount} 条带货`, ok: null };
  else ec = { level: "red", text: "近期未见带货", ok: false };
  // 发布活跃
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

function renderCreator(d) {
  if (!d || !d.username) {
    $("creator").innerHTML = '<span class="muted">未识别到达人，请在 tiktok.com/@用户名 主页打开</span>';
    return;
  }
  current = d;
  const p = d.recentPerf;
  const L = computeLights(d);
  const v = verdict(L);
  const vColor = { green: "#dcfce7", yellow: "#fef9c3", red: "#fee2e2" }[v.level];
  const vText = { green: "#15803d", yellow: "#b45309", red: "#b91c1c" }[v.level];
  const tags = (d.contentTopics || []).slice(0, 8).map((t) => `<span>${t}</span>`).join("");
  $("creator").innerHTML = `
    <div class="ckhead"><b>${d.nickname || d.username}</b> <span class="muted">@${d.username}</span> · 粉丝 ${fmt(d.followers)}</div>
    <div class="verdict" style="background:${vColor};color:${vText}">${DOT[v.level]} ${v.text}</div>
    <div class="lights">
      ${lightRow("内容契合", L.fit.level, L.fit.text)}
      ${lightRow("互动率", L.eng.level, L.eng.text)}
      ${lightRow("带货频率", L.ec.level, L.ec.text)}
      ${lightRow("发布活跃", L.act.level, L.act.text)}
    </div>
    <div class="detail muted">
      ${p ? `采集明细：近${p.sampleCount}条 · 均播 ${fmt(p.avgPlay)} · 带货 ${p.ecVideoCount ?? 0}条 · 发布 ${p.postsPerWeek || 0}/周` : '<span style="color:#dc2626">未钩到视频——滚动一下主页让视频墙加载再采集</span>'}
    </div>
    ${tags ? `<div class="tags">${tags}</div>` : ""}`;
}

async function loadCurrent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/www\.tiktok\.com\/@/.test(tab.url || "")) { renderCreator(null); return; }
  chrome.tabs.sendMessage(tab.id, { type: "extract-current" }, (resp) => {
    if (chrome.runtime.lastError || !resp) { renderCreator(null); return; }
    renderCreator(resp.data);
  });
}

async function fetchMerchantCats() {
  try {
    const { compassUrl } = await chrome.storage.local.get(["compassUrl"]);
    const base = (compassUrl || "http://127.0.0.1:8015").replace(/\/+$/, "");
    const r = await fetch(base + "/api/merchant/context");
    const d = await r.json();
    merchantCats = Array.isArray(d.categories) ? d.categories : [];
    merchantProducts = Array.isArray(d.productNames) ? d.productNames.filter(Boolean) : [];
  } catch (e) { merchantCats = []; merchantProducts = []; }
}

$("autoCapture").addEventListener("change", (e) => chrome.storage.local.set({ autoCapture: e.target.checked }));
$("compassUrl").addEventListener("change", async (e) => { await chrome.storage.local.set({ compassUrl: e.target.value.trim() }); fetchMerchantCats(); });

(async function init() {
  const s = await chrome.storage.local.get(["compassUrl", "autoCapture", "lastIngest"]);
  $("compassUrl").value = s.compassUrl || "http://127.0.0.1:8015";
  $("autoCapture").checked = s.autoCapture !== false; // 默认开：浏览即自动体检回流
  if (s.lastIngest) {
    const li = s.lastIngest;
    $("lastIngest").textContent = `上次采集：@${li.username} · ${li.ok ? "成功" : "失败"} · ${new Date(li.at).toLocaleString()}`;
  }
  await fetchMerchantCats();
  loadCurrent();
})();
