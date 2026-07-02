// KOL Compass 达人库采集器（内部）—— 解析 + 回流 + 面板（隔离世界）
// 采集靠 market-inject（MAIN 世界）直接轮询 find 接口，这里只负责：
//   收 market-inject emit 的 find 响应 → 解析 creator_profile_list → 去重 → 回流 Compass 后端；
//   底部面板显示已采数量 + 暂停/继续（暂停会通知 MAIN 世界停轮询）。
// 不再滚动 DOM、不换类目、不会把页面堆卡冻死。
(function () {
  "use strict";

  const sent = new Set();          // 本会话已回流的达人（去重）
  let lastGrowAt = Date.now();     // 上次有新达人的时间
  let total = 0;                   // 本会话扫描到的去重达人数（含已在库的旧人）
  let libTotal = 0;                // 后端达人库当前总数（真实入库，以此为准）
  let libStart = null;             // 本会话起点的库总数（算净增）
  let paused = false;
  let errMsg = "";                 // 接口报错提示（如签名过期）
  let curQuery = "";               // 当前正在采的搜索词（全自动换词）

  const num = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };
  const val = (f) => (f && typeof f === "object" && "value" in f) ? f.value : (f == null ? "" : f);
  function str(v) { return (typeof v === "string") ? v : ""; }
  // category.value 是数组 [{starling_key,name},...] → 取第一个 name
  function firstCategory(it) {
    const c = val(it.category);
    if (Array.isArray(c) && c[0] && typeof c[0].name === "string") return c[0].name;
    return str(val(it.main_industry));
  }
  function gmvStr(v) { return (typeof v === "string" || typeof v === "number") ? String(v) : ""; }
  // avatar.value = {url_list:[...], thumb_url_list:[...]} → 取第一个 URL（之前当字符串取，取空了）
  function avatarOf(it) {
    const a = val(it.avatar);
    if (a && typeof a === "object") { const l = (Array.isArray(a.url_list) && a.url_list) || (Array.isArray(a.thumb_url_list) && a.thumb_url_list); if (l && l[0]) return String(l[0]); }
    return (typeof a === "string") ? a : "";
  }
  // 门控字段返回 {is_authorized,status}，取不到真值 → 归一成空；数组类(top_follower_*)取首项 key
  function firstKey(v) { const a = val(v); return (Array.isArray(a) && a[0] && a[0].key) ? String(a[0].key) : ""; }

  function parseCreator(it) {
    const username = str(val(it.handle)).replace(/^@/, "").trim();
    if (!username || !/^[a-zA-Z0-9._]+$/.test(username)) return null; // 用户名必须是合法 handle
    const gmv = gmvStr(val(it.med_gmv_revenue_range)) || gmvStr(val(it.med_gmv_revenue)) || gmvStr(val(it.video_gmv)) || gmvStr(val(it.live_gmv));
    return {
      username,
      nickname: str(val(it.nickname)) || username,
      followers: num(val(it.follower_cnt)),
      avatarUrl: avatarOf(it),
      gmv: gmv,
      avgVideoViews: num(val(it.video_avg_view_cnt) || val(it.ec_video_avg_view_cnt)),
      region: str(val(it.selection_region)) || "SG",
      category: firstCategory(it),
      sourceId: str(val(it.creator_oecuid)),
      sourceUrl: "https://www.tiktok.com/@" + username,
      // 建联前评估信号（有真实值的字段）
      unitsSold: num(val(it.units_sold)),
      videoEngagement: num(val(it.video_engagement) || val(it.ec_video_engagement)),
      hasCollaborated: val(it.has_collaborated) === true,
      topFollowerAge: firstKey(it.top_follower_age),
      topFollowerGender: firstKey(it.top_follower_gender),
    };
  }

  // —— 收 market-inject 回流的 find 响应 → 解析入库 ——
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d) return;
    if (d.__kcmErr) { errMsg = "接口连续报错" + (d.code != null ? "（code " + d.code + "）" : "") + "，正在退避重试…若长时间不涨请 F5 刷新本页"; render(); return; }
    if (d.__kcmQuery) { curQuery = d.__kcmQuery; errMsg = ""; render(); return; }
    if (!d.__kcm || !d.resp) return;
    const list = Array.isArray(d.resp.creator_profile_list) ? d.resp.creator_profile_list : [];
    const creators = list.map(parseCreator).filter(Boolean).filter((c) => !sent.has(c.username.toLowerCase()));
    if (creators.length) {
      creators.forEach((c) => sent.add(c.username.toLowerCase()));
      total = sent.size;
      errMsg = "";
      chrome.runtime.sendMessage({ type: "ingest-marketplace", creators }, (resp) => {
        // 后端返回库总数 total —— 以它为准判断"真实入库新增"，会话去重数会误导（多是已在库的旧人）
        if (resp && resp.res && typeof resp.res.total === "number") {
          const t = resp.res.total;
          if (libStart == null) libStart = t;      // 本会话起点库总数
          if (t > libTotal) lastGrowAt = Date.now(); // 只有库总数真涨了才算"采到新人"
          libTotal = t;
          render();
        }
      });
    }
    render();
  });

  // —— 右下角状态面板（带暂停/继续开关）——
  let box = null, statusEl = null, toggleBtn = null;
  function setPaused(v) {
    paused = v;
    try { window.postMessage({ __kcmCtl: { paused } }, "*"); } catch (e) {}  // 通知 MAIN 世界停/续轮询
    render();
  }
  function buildBox() {
    box = document.createElement("div");
    box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483600;background:#0f172a;color:#fff;padding:10px 14px;border-radius:10px;font:600 13px -apple-system,'Segoe UI',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:300px;line-height:1.5;";
    statusEl = document.createElement("div");
    toggleBtn = document.createElement("button");
    toggleBtn.style.cssText = "margin-top:8px;width:100%;border:0;border-radius:8px;padding:7px 0;font:700 13px inherit;cursor:pointer;color:#0f172a;";
    toggleBtn.addEventListener("click", () => setPaused(!paused));
    box.appendChild(statusEl);
    box.appendChild(toggleBtn);
    document.documentElement.appendChild(box);
  }
  function render() {
    if (!box) buildBox();
    const net = (libStart == null) ? 0 : (libTotal - libStart);
    // 主数字 = 后端库总数（真实入库）；副行 = 本会话净增入库 + 扫描去重数
    const head = `KOL Compass 采集器<br>达人库总数 <b style="color:#38bdf8">${libTotal || "…"}</b>`
      + `<br><span style="font-weight:400;color:#cbd5e1">本会话净增入库 <b style="color:#4ade80">+${net}</b> · 已扫 ${total}（去重）</span>`;
    const idleSec = Math.round((Date.now() - lastGrowAt) / 1000);
    if (errMsg) {
      statusEl.innerHTML = `${head}<br><span style="color:#f87171">${errMsg}</span>`;
    } else if (paused) {
      statusEl.innerHTML = `${head}<br><span style="color:#f87171">已暂停</span>`;
    } else {
      const q = curQuery ? `当前采「${curQuery}」· ` : "";
      const tail = idleSec > 45 ? `${q}已 ${idleSec}s 库没再涨（词表可能快跑完，可暂停）` : `${q}全自动换词采集中…（看"净增入库"涨）`;
      statusEl.innerHTML = `${head}<br><span style="color:#94a3b8">${tail}</span>`;
    }
    toggleBtn.textContent = paused ? "▶ 继续采集" : "⏸ 暂停采集";
    toggleBtn.style.background = paused ? "#4ade80" : "#e2e8f0";
  }
  setTimeout(render, 1500);
  setInterval(render, 4000);       // 定时刷新面板（更新"已 Ns 没采到新人"）
})();
