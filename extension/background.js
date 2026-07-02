// KOL Compass 建联前采集器 —— background service worker
// 负责把 content/popup 采集到的达人数据 POST 到 Compass 后端 ingest 端点。

const DEFAULT_COMPASS_URL = "http://127.0.0.1:8015";

async function compassUrl() {
  const { compassUrl } = await chrome.storage.local.get(["compassUrl"]);
  return (compassUrl || DEFAULT_COMPASS_URL).replace(/\/+$/, "");
}

async function ingest(creator) {
  const base = await compassUrl();
  const resp = await fetch(base + "/api/creators/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creators: [creator] }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.ok === false) {
    throw new Error(data.code || data.message || ("HTTP " + resp.status));
  }
  return data;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "ingest-creator" && msg.data) {
    ingest(msg.data)
      .then((res) => {
        chrome.storage.local.set({
          lastIngest: { at: new Date().toISOString(), username: msg.data.username, ok: true, res },
        });
        sendResponse({ ok: true, res });
      })
      .catch((err) => {
        chrome.storage.local.set({
          lastIngest: { at: new Date().toISOString(), username: msg.data.username, ok: false, error: String(err.message || err) },
        });
        sendResponse({ ok: false, error: String(err.message || err) });
      });
    return true; // async
  }
});
