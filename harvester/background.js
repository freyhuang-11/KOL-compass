// KOL Compass 达人库采集器（内部）—— background：把采集到的达人 POST 到 Compass 后端。
const DEFAULT_COMPASS_URL = "http://127.0.0.1:8015";
async function compassUrl() {
  const { compassUrl } = await chrome.storage.local.get(["compassUrl"]);
  return (compassUrl || DEFAULT_COMPASS_URL).replace(/\/+$/, "");
}
async function ingest(creators) {
  const base = await compassUrl();
  const resp = await fetch(base + "/api/creators/ingest-marketplace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creators }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.ok === false) throw new Error(data.code || data.message || ("HTTP " + resp.status));
  return data;
}
chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg && msg.type === "ingest-marketplace" && Array.isArray(msg.creators)) {
    ingest(msg.creators).then((res) => sendResponse({ ok: true, res })).catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
});
