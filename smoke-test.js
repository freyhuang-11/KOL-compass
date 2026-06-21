const fs = require("node:fs");
const http = require("node:http");
const { execFileSync } = require("node:child_process");

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
}

function assert(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => resolve({ statusCode: res.statusCode, body }));
    }).on("error", reject);
  });
}

async function main() {
  const requiredFiles = ["index.html", "app.css", "app.js", "README.md", "PRODUCT.md", "DESIGN.md"];
  for (const file of requiredFiles) {
    assert(`file exists: ${file}`, fs.existsSync(file));
  }

  try {
    execFileSync("node", ["--check", "app.js"], { stdio: "pipe" });
    pass("app.js syntax");
  } catch (error) {
    fail("app.js syntax", String(error.stderr || error.message));
  }

  const app = read("app.js");
  const index = read("index.html");
  assert("index loads app.js", index.includes("./app.js"));
  assert("port boundary documented", read("README.md").includes("5175") && read("README.md").includes("5173"));

  const requiredPages = [
    "控制台", "产品管理", "KOL池", "建联记录", "自动回复", "消息模板", "KOL黑名单",
    "寄样管理", "合作管理", "系统消息", "账号与团队", "订阅计费", "平台管理端",
  ];
  for (const pageName of requiredPages) {
    assert(`page present: ${pageName}`, app.includes(pageName));
  }

  assert("cooperation has produced/unproduced metrics", app.includes("已产出达人") && app.includes("未产出达人"));
  assert("cooperation search and output filters supported", ["coopSearch", "coopOutput"].every((name) => app.includes(name)) && app.includes("搜索达人、产品、负责人、备注"));
  assert("product filters supported", ["productSearch", "productCategory", "productStatus", "productMode"].every((name) => app.includes(name)) && app.includes("真实商品、佣金率和合作模式应来自 TikTok Shop Partner API"));
  assert("cooperation has content tracking status filters", app.includes("逾期未产出") && app.includes("有订单未匹配内容"));
  assert("custom cooperation tags supported", app.includes("addCoopTag") && app.includes("固定标签"));
  assert("cooperation operational actions supported", ["urgeOutput", "resolveUnmatched", "finishCoop", "deleteCoop"].every((name) => app.includes(`function ${name}`)));
  assert("creator edit and blacklist supported", app.includes("openCreatorModal(${c.id})") && app.includes("function blacklistCreator"));
  assert("creator contact fields editable", app.includes('field("email", "Email"') && app.includes('field("whatsapp", "WhatsApp"') && app.includes('email: get("email")'));
  assert("KOL pool multi-dimensional filters supported", ["kolCategory", "kolRegion", "kolFollowers", "kolReplyRate", "creatorFollowerTierOk", "creatorReplyRateOk"].every((name) => app.includes(name)));
  assert("KOL pool batch outreach supported", ["toggleCreatorSelection", "openOutreachModal", "saveOutreach", "renderTemplate"].every((name) => app.includes(`function ${name}`)) && app.includes("一键建联"));
  assert("outreach replies supported", ["openReplyModal", "saveReply", "replyChannelOptions"].every((name) => app.includes(`function ${name}`)) && app.includes("回复达人"));
  assert("outreach filters supported", ["outreachSearch", "outreachStatus", "outreachChannel"].every((name) => app.includes(name)) && app.includes("搜索达人、产品、消息"));
  assert("message template CRUD supported", ["openTemplateModal", "saveTemplate", "deleteTemplate"].every((name) => app.includes(`function ${name}`)) && app.includes("支持变量"));
  assert("outreach workflow advances to sample and cooperation", ["advanceOutreach", "createSampleFromOutreach", "createCoopFromOutreach", "deleteOutreach"].every((name) => app.includes(`function ${name}`)));
  assert("sample workflow supports edit and cooperation handoff", ["openSampleModal", "saveSample", "createCoopFromSample", "deleteSample"].every((name) => app.includes(`function ${name}`)));
  assert("CSV imports supported", app.includes("function importCreatorsCsv") && app.includes("function importCoopsCsv") && app.includes("parseCsv"));
  assert("local data import/export supported", app.includes("function exportState") && app.includes("function importState"));
  assert("hash routes supported", app.includes("routeFromHash") && app.includes("kol/creator/"));
  assert("TikTok API handoff exists", fs.existsSync("docs/TIKTOK_API_HANDOFF.md"));
  assert("TikTok API settings can be saved locally", ["tiktokClientKey", "tiktokRedirectUrl", "tiktokScopes", "saveApiSettings", "markApiAuthBlocked"].every((name) => app.includes(name)) && app.includes("client_secret 不应保存在前端"));
  assert("sync logs are visible and recorded", ["syncLogs", "addSyncLog"].every((name) => app.includes(name)) && app.includes("同步日志"));
  assert("Claude continuation doc exists", fs.existsSync("docs/CLAUDE_CONTINUE.md"));
  assert("acceptance report exists", fs.existsSync("docs/ACCEPTANCE_REPORT.md"));

  const detailStart = app.indexOf("function renderCreatorDetail");
  const detailEnd = app.indexOf("function table(", detailStart);
  const detail = app.slice(detailStart, detailEnd);
  const forbiddenInDetail = ["视频", "直播", "GMV", "订单", "佣金", "ROI", "内容追踪", "已产出", "未产出"];
  const foundForbidden = forbiddenInDetail.filter((word) => detail.includes(word));
  assert("KOL detail excludes output/performance terms", foundForbidden.length === 0, foundForbidden.join(", "));
  assert("KOL detail maps cooperation status to lifecycle stage", app.includes("detailCoopStage") && !detail.includes("badge(x.status)"));

  try {
    const html = await get("http://127.0.0.1:5175/");
    assert("local server responds on 5175", html.statusCode === 200, `status=${html.statusCode}`);
  } catch (error) {
    fail("local server responds on 5175", "Start it with start-5175.bat or python -m http.server 5175 --bind 127.0.0.1");
  }

  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
  }

  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
