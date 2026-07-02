// KOL Compass 达人库采集器（内部）—— 达人广场钩子 + 接口轮询（页面世界 MAIN）
// 原理：页面登录后自己发的 creator/marketplace/find 请求已带浏览器签名（msToken/X-Bogus/X-Gnarly，全在 URL query）。
//   1) 钩住页面自己的 find 响应 → postMessage 给隔离世界（顺带抓到带签名的 URL）。
//   2) 拿到带签名的 URL 后，直接用页面 fetch（带 cookie）反复 POST 这个接口翻页/轮换 → 不滚 DOM、不堆卡、不卡死。
// 仅读运营本人登录会话里页面已在用的接口，不自己签名、不爬别人。
(function () {
  "use strict";
  function isFind(u) { return /creator\/marketplace\/find/.test(String(u || "")); }
  function emit(resp) { try { window.postMessage({ __kcm: true, resp }, "*"); } catch (e) {} }

  let lastFindUrl = "";                 // 钩子抓到的 find URL（可能是加签名之前的，仅作兜底）
  function remember(u) { if (isFind(u)) { const s = String(u); if (s.indexOf("http") === 0) lastFindUrl = s; } }
  // 从 performance 取实际发出去（已带完整签名）的 find URL —— 这才是能重放的那个。
  function signedFindUrl() {
    try { const es = performance.getEntriesByType("resource").filter((r) => isFind(r.name) && /msToken=/.test(r.name)); if (es.length) return es[es.length - 1].name; } catch (e) {}
    return lastFindUrl;
  }

  // —— 钩 fetch / XHR：既回流页面自己的响应，也顺手记住带签名的 URL ——
  const of = window.fetch;
  window.fetch = function (...a) {
    const p = of.apply(this, a);
    try { const u = String((a[0] && a[0].url) || a[0] || ""); if (isFind(u)) { remember(u); p.then((r) => r.clone().json().then((j) => emit(j)).catch(() => {})); } } catch (e) {}
    return p;
  };
  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; remember(u); return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => { try { if (isFind(this.__u)) emit(JSON.parse(this.responseText || "{}")); } catch (e) {} });
    return os.apply(this, arguments);
  };

  // —— 接口轮询循环：拿到带签名 URL 后，直接 POST 翻页 + 全自动换搜索词 ——
  // 关键事实(真机验证)：find 接口 body 带 query 就按关键词搜，返回的达人跟推荐池 0 重合。
  //   → 循环换关键词(类目/品类词)每个深翻采尽，就能突破推荐天花板、采到全量。
  const POLL_MS = 3500;                 // 每 ~3.5s 一次（放慢避免风控）
  const MAX_PAGES_PER_QUERY = 60;       // 单个词最多翻 60 页(~1200)，翻到底或到上限就换下一个词
  // 词表：第 1 个 "" = 推荐池；其余是类目/品类关键词，尽量覆盖 SG 达人各领域。
  const QUERIES = [
    "", "beauty", "skincare", "makeup", "haircare", "perfume", "nails", "health", "supplement", "wellness",
    "food", "snacks", "beverage", "coffee", "dessert", "kitchen", "cookware", "home", "decor", "furniture",
    "appliance", "cleaning", "phone", "electronics", "gadget", "audio", "computer", "fashion", "clothing", "dress",
    "menswear", "womenswear", "lingerie", "shoes", "sneakers", "bag", "luggage", "accessories", "jewelry", "watch",
    "sports", "fitness", "outdoor", "toys", "baby", "maternity", "pet", "dog", "cat", "book",
    "stationery", "car", "automotive", "tools", "garden", "camera", "gaming", "travel", "kids", "student",
  ];
  // 从 localStorage 恢复"上次采到第几个词"，F5/重开页面接着采，不从头重扫。
  let qi = 0;
  try { const s = parseInt(localStorage.getItem("__kcm_qi") || "0", 10); if (Number.isFinite(s) && s >= 0 && s < QUERIES.length) qi = s; } catch (e) {}
  let pagesThisQuery = 0;               // 当前词已翻页数
  let pg = (QUERIES[qi] === "") ? { size: 20, page: 1 } : { size: 20, page: 0 };
  let paused = false, fails = 0, backoffUntil = 0, busy = false;

  function resetPg() { pagesThisQuery = 0; pg = (QUERIES[qi] === "") ? { size: 20, page: 1 } : { size: 20, page: 0 }; }
  function nextQuery() {
    qi = (qi + 1) % QUERIES.length; resetPg();
    try { localStorage.setItem("__kcm_qi", String(qi)); } catch (e) {}   // 存进度
    try { window.postMessage({ __kcmQuery: QUERIES[qi] || "推荐池" }, "*"); } catch (e) {}
  }
  function buildBody() {
    const q = QUERIES[qi];
    return (q === "") ? { pagination: pg } : { query: q, pagination: pg, query_type: 1, filter_params: {}, algorithm: 1 };
  }

  // 隔离世界（面板暂停键）发来的控制指令
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (d && d.__kcmCtl && typeof d.__kcmCtl.paused === "boolean") paused = d.__kcmCtl.paused;
  });

  async function pollOnce() {
    const url = signedFindUrl();
    if (busy || paused || !url || Date.now() < backoffUntil) return;
    busy = true;
    try {
      const r = await window.fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
        credentials: "include",
      });
      const j = await r.json();
      if (!j || (typeof j.code === "number" && j.code !== 0)) {
        // 非 0 = 风控/限速/签名过期 → 退避重试；连败太多换下一个词（可能这个词卡了）。
        fails++;
        backoffUntil = Date.now() + Math.min(60000, 10000 * fails);
        if (fails >= 3) nextQuery();
        if (fails >= 6) { try { window.postMessage({ __kcmErr: true, code: j && j.code }, "*"); } catch (e) {} }
        return;
      }
      fails = 0;
      emit(j);                          // 走原有管道 → 隔离世界解析+去重+入库
      pagesThisQuery++;
      const np = j.next_pagination;
      if (np && np.has_more && pagesThisQuery < MAX_PAGES_PER_QUERY) {
        pg = { size: 20, page: (np.next_page != null ? np.next_page : pg.page + 1), search_key: np.search_key, item_cursor: np.next_item_cursor, next_item_cursor: np.next_item_cursor };
      } else {
        nextQuery();                    // 这个词采尽/到上限 → 换下一个词（全自动）
      }
    } catch (e) {
      fails++; backoffUntil = Date.now() + 4000;
    } finally { busy = false; }
  }
  setInterval(pollOnce, POLL_MS);
  setTimeout(() => { try { window.postMessage({ __kcmQuery: "推荐池" }, "*"); } catch (e) {} }, 2000);
})();
