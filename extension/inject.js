// KOL Compass 采集器 —— 注入页面世界(MAIN)的接口钩子
// 在 document_start 钩住 fetch/XHR，捕获 TikTok 自己调的 item_list 接口响应，
// 把每条视频的统计数据 postMessage 给隔离世界的 content.js 聚合。
// 不发请求、不改请求，只读 TikTok 已经在拉的数据。

(function () {
  "use strict";

  function isItemList(u) {
    return /\/api\/(post|repost|user)\/item_list/.test(String(u || ""));
  }
  function isCommentList(u) {
    return /\/api\/comment\/list/.test(String(u || ""));
  }
  function extractComments(json) {
    const list = (json && (json.comments || json.comment_list)) || [];
    const out = [];
    for (const c of list) {
      try {
        const t = String(c.text || c.comment || (c.share_info && c.share_info.desc) || "");
        if (t) out.push({ text: t, likes: Number(c.digg_count || c.like_count || 0) });
      } catch (e) {}
    }
    return out;
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // 带货视频判定：达人主页上挂了商品的视频，TikTok 会在 anchors 里留商品锚点。
  // 经实测放宽：达人页上"有 anchors"基本就是挂了商品 → 任意非空 anchors 即记为带货。
  // 仍保留 anchorTypes + dbgKeys 诊断，用来核对/继续校准漏检。
  function ecSignal(it) {
    const anchors = Array.isArray(it.anchors) ? it.anchors
      : (Array.isArray(it.anchor_list) ? it.anchor_list
      : (Array.isArray(it.anchors_v2) ? it.anchors_v2 : []));
    const anchorTypes = anchors.map((a) => String(a && (a.type ?? a.component_key ?? a.keyword) || "")).filter(Boolean);
    // 商品锚点里的商品名（产品级匹配用：达人到底在带什么货）
    const anchorKeywords = anchors.map((a) => String((a && (a.keyword || a.title || a.description)) || "").trim()).filter(Boolean);
    const commerce = it.commerce_info || it.commerceInfo || null;
    const commercePromotable = !!(commerce && (commerce.adv_promotable || commerce.bake_param || commerce.organic_log_extra));
    // 宽口径：任意锚点 / 广告标记 / 商业信息 → 带货
    const isEc = anchors.length > 0 || it.isAd === true || it.is_ads === true || commercePromotable;
    // 诊断：当 isEc=false 时，看看这条视频到底带了哪些可能跟商品相关的 key
    let dbgKeys = [];
    if (!isEc) {
      try { dbgKeys = Object.keys(it).filter((k) => /anchor|shop|product|commerce|ad|tcm|promot|seo/i.test(k)).slice(0, 10); } catch (e) {}
    }
    return { isEc, anchorTypes, anchorKeywords, hasAnchor: anchors.length > 0, dbgKeys };
  }

  function extract(json) {
    const list = (json && (json.itemList || json.items || json.aweme_list)) || [];
    const out = [];
    for (const it of list) {
      try {
        const s = it.stats || it.statsV2 || it.statistics || {};
        const ec = ecSignal(it);
        out.push({
          id: String(it.id || it.aweme_id || ""),
          desc: String(it.desc || it.title || ""),
          createTime: num(it.createTime || it.create_time),
          playCount: num(s.playCount || s.play_count),
          diggCount: num(s.diggCount || s.digg_count),
          commentCount: num(s.commentCount || s.comment_count),
          shareCount: num(s.shareCount || s.share_count),
          collectCount: num(s.collectCount || s.collect_count),
          duration: num((it.video && it.video.duration) || it.duration),
          author: (it.author && (it.author.uniqueId || it.author.unique_id)) || "",
          isEc: ec.isEc,
          hasAnchor: ec.hasAnchor,
          anchorTypes: ec.anchorTypes,
          anchorKeywords: ec.anchorKeywords,
          dbgKeys: ec.dbgKeys,
        });
      } catch (e) { /* skip */ }
    }
    return out;
  }

  function emit(type, items) {
    if (!items || !items.length) return;
    try { window.postMessage({ __kc: true, type, items }, "*"); } catch (e) {}
  }
  function handle(url, json) {
    if (isItemList(url)) emit("kc-items", extract(json));
    else if (isCommentList(url)) emit("kc-comments", extractComments(json));
  }

  // hook fetch
  const of = window.fetch;
  window.fetch = function (...a) {
    const p = of.apply(this, a);
    try {
      const u = String((a[0] && a[0].url) || a[0] || "");
      if (isItemList(u) || isCommentList(u)) p.then((r) => { r.clone().json().then((j) => handle(u, j)).catch(() => {}); });
    } catch (e) {}
    return p;
  };

  // hook XHR
  const oo = XMLHttpRequest.prototype.open;
  const os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__kcUrl = u; return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => {
      try {
        const u = this.__kcUrl;
        if (isItemList(u) || isCommentList(u)) handle(u, JSON.parse(this.responseText || "{}"));
      } catch (e) {}
    });
    return os.apply(this, arguments);
  };
})();
