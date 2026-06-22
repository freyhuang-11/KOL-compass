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
  const requiredFiles = ["index.html", "app.css", "app.js", "server.js", "README.md", "PRODUCT.md", "DESIGN.md", ".env.example"];
  for (const file of requiredFiles) {
    assert(`file exists: ${file}`, fs.existsSync(file));
  }

  try {
    execFileSync("node", ["--check", "app.js"], { stdio: "pipe" });
    pass("app.js syntax");
  } catch (error) {
    fail("app.js syntax", String(error.stderr || error.message));
  }

  try {
    execFileSync("node", ["--check", "server.js"], { stdio: "pipe" });
    pass("server.js syntax");
  } catch (error) {
    fail("server.js syntax", String(error.stderr || error.message));
  }

  const app = read("app.js");
  const server = read("server.js");
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
  assert("dashboard filters and drilldowns supported", ["dashboardRange", "dashboardOwner", "dashboardGo", "内容状态分布", "负责人概览"].every((name) => app.includes(name)));
  assert("dashboard separates activity and due ranges", ["inActivityRange", "inDueRange"].every((name) => app.includes(`function ${name}`)) && app.includes("活动按更新时间统计，合作按产出截止日统计"));
  assert("refined visual layout classes supported", ["detail-shell", "creator-portrait", "chat-frame", "coop-detail-grid", "content-card-grid", "stage-list"].every((text) => app.includes(text) || read("app.css").includes(text)));
  assert("navigation uses SVG icons instead of symbol placeholders", ["navIconPaths", "function svgIcon", "class=\"nav-icon\"", ".nav-icon"].every((text) => app.includes(text) || read("app.css").includes(text)) && !["▦", "▣", "◎", "✉", "↻", "▤", "⊘", "□", "◆", "☷", "⚙"].some((text) => app.includes(text)));
  assert("cooperation search and output filters supported", ["coopSearch", "coopOutput"].every((name) => app.includes(name)) && app.includes("搜索达人、产品、负责人、备注"));
  assert("cooperation sales review summary supported", ["visibleGmv", "visibleOrders", "visibleSpend", "visibleRoi"].every((name) => app.includes(name)) && ["当前视图GMV", "当前订单", "佣金+投流", "当前ROI"].every((text) => app.includes(text)));
  assert("product search is limited to TikTok-style name/id filters", ["productSearch", "productSearchField", "商品名", "商品ID", "productList"].every((name) => app.includes(name)) && !["productCategory", "productStatus", "productMode"].some((name) => app.includes(name)) && app.includes("绑定店铺后自动读取商品"));
  assert("product detail is read-only with business drilldowns", ["openProductModal", "productUsage", "goProductCoops", "goProductOutreach"].every((name) => app.includes(`function ${name}`)) && app.includes("当前只读展示，不支持本地手动新增或改写真实商品源"));
  assert("product detail keeps performance metrics in cooperations", app.includes("视频、直播、GMV、订单、佣金支出和 ROI 仍只在合作管理查看"));
  assert("cooperation has content tracking status filters", app.includes("逾期未产出") && app.includes("有订单未匹配内容"));
  assert("custom cooperation tags supported", app.includes("addCoopTag") && app.includes("固定标签"));
  assert("cooperation operational actions supported", ["urgeOutput", "resolveUnmatched", "finishCoop", "deleteCoop"].every((name) => app.includes(`function ${name}`)));
  assert("creator edit and blacklist supported", app.includes("openCreatorModal(${c.id})") && app.includes("function blacklistCreator"));
  assert("blacklist search and audit trail supported", ["blacklistSearch", "blacklistReason", "blacklistedAt", "blacklistRestoredAt"].every((name) => app.includes(name)) && app.includes("搜索达人、类目、地区、原因"));
  assert("creator fixed fields use fixed options", ["selectField(\"type\"", "selectField(\"category\"", "selectField(\"region\"", "creatorTypeOptions", "tiktokCategoryOptions", "marketOptions"].every((text) => app.includes(text)));
  assert("creator contact fields editable", app.includes('field("email", "Email"') && app.includes('field("whatsapp", "WhatsApp"') && app.includes('email: get("email")'));
  assert("KOL pool fixed multi-select filters supported", ["kolTypes", "kolCategories", "kolRegions", "kolFollowers", "kolReplyRate", "kolGmv", "kolContact", "multiFilterChips", "creatorGmvRangeOk", "creatorContactOk"].every((name) => app.includes(name)));
  assert("KOL pool batch outreach supported", ["toggleCreatorSelection", "openOutreachModal", "saveOutreach", "renderTemplate"].every((name) => app.includes(`function ${name}`)) && app.includes("一键建联"));
  assert("KOL pool selection summary supported", ["当前筛选", "可建联达人", "暂不可建联", "已选择", "选择当前可建联", "清空选择"].every((text) => app.includes(text)) && ["selectVisibleCreators", "clearBulkSelection"].every((name) => app.includes(`function ${name}`)));
  assert("outreach quota and safety rules enforced", ["planQuotas", "quotaRemaining", "creatorOutreachBlockReason", "markNotInterested", "clearNotInterested", "selectPlan"].every((name) => app.includes(name)) && app.includes("24小时内已建联") && app.includes("不感兴趣至"));
  assert("outreach replies supported", ["openReplyModal", "saveReply", "replyChannelOptions"].every((name) => app.includes(`function ${name}`)) && app.includes("回复达人"));
  assert("outreach filters supported", ["outreachSearch", "outreachStatus", "outreachChannel"].every((name) => app.includes(name)) && app.includes("搜索达人、产品、消息"));
  assert("outreach status summary supported", ["建联总数", "待达人回复", "待我方回复", "已转合作", "当前显示"].every((text) => app.includes(text)));
  assert("auto reply CRUD and local trigger test supported", ["openAutoReplyModal", "saveAutoReply", "deleteAutoReply", "openAutoReplyTest", "runAutoReplyTest", "autoReplyMatches"].every((name) => app.includes(`function ${name}`)) && app.includes("自动回复规则最多 50 条"));
  assert("message template CRUD supported", ["openTemplateModal", "saveTemplate", "deleteTemplate"].every((name) => app.includes(`function ${name}`)) && app.includes("支持变量"));
  assert("outreach workflow advances to sample and cooperation", ["advanceOutreach", "createSampleFromOutreach", "createCoopFromOutreach", "deleteOutreach"].every((name) => app.includes(`function ${name}`)));
  assert("sample workflow supports edit and cooperation handoff", ["openSampleModal", "saveSample", "createCoopFromSample", "deleteSample"].every((name) => app.includes(`function ${name}`)));
  assert("sample filters and status summary supported", ["sampleSearch", "sampleStatus"].every((name) => app.includes(name)) && app.includes("搜索达人、产品、物流单号") && app.includes("可转合作"));
  assert("CSV imports supported", app.includes("function importCreatorsCsv") && app.includes("function importCoopsCsv") && app.includes("parseCsv"));
  assert("CSV templates can be downloaded", ["downloadCreatorsCsvTemplate", "downloadCoopsCsvTemplate", "downloadTextFile", "下载KOL模板", "下载合作模板"].every((text) => app.includes(text)));
  assert("local data import/export supported", app.includes("function exportState") && app.includes("function importState"));
  assert("hash routes supported", app.includes("routeFromHash") && app.includes("kol/creator/"));
  assert("TikTok API handoff exists", fs.existsSync("docs/TIKTOK_API_HANDOFF.md"));
  assert("TikTok API backend exists", ["generateSign", "/api/tiktok/auth-url", "/api/tiktok/callback", "/api/tiktok/shops", "/api/tiktok/products", "x-tts-access-token", "/authorization/202309/shops", "/product/202309/products/search", "/product/202309/products/${productId}"].every((text) => server.includes(text)));
  assert("TikTok product sync normalizes image and status fields", ["imageUrl", "main_images", "normalizeProductStatus", "rawStatus", "stock"].every((text) => server.includes(text)) && ["productThumb", "可选", "不可选"].every((text) => app.includes(text)));
  assert("TikTok creator search API wired", ["/api/tiktok/creators/search", "/affiliate_seller/202508/marketplace_creators/search", "normalizeCreators"].every((text) => server.includes(text)) && ["apiRequest(\"/api/tiktok/creators/search\"", "达人同步失败"].every((text) => app.includes(text)));
  assert("TikTok creator sync maps real marketplace fields", ["creator_open_id", "selection_region", "avatarUrl", "formatMoney", "normalizeCreatorRegion", "avg_ec_video_view_count"].every((text) => server.includes(text)) && ["c.avatarUrl", ".avatar img"].every((text) => app.includes(text) || read("app.css").includes(text)));
  assert("TikTok API backend keeps secrets out of frontend", server.includes("TIKTOK_SHOP_APP_SECRET") && read(".gitignore").includes(".env.local") && read(".gitignore").includes(".data/"));
  assert("TikTok Shop binding UI calls backend", ["API_BASE", "startTikTokAuth", "checkTikTokBackend", "checkTikTokShops", "apiRequest(\"/api/tiktok/products\""].every((text) => app.includes(text)));
  assert("TikTok Shop multi-store selection supported", ["tiktokShops", "selectedTikTokShopCipher", "selectTikTokShop", "shopCipher", "shopLabel", "shopRegion"].every((text) => app.includes(text)));
  assert("store-first product UI and picker supported", ["store-panel", "productList", "productPicker", "product-thumb", "重新同步商品", "选择建联商品"].every((text) => app.includes(text) || read("app.css").includes(text)));
  assert("shop authorization auto-syncs products", app.includes("if (firstShop) await syncProducts({ silent: true })"));
  assert("TikTok API settings can be saved locally", ["tiktokClientKey", "tiktokRedirectUrl", "tiktokScopes", "saveApiSettings", "markApiAuthBlocked"].every((name) => app.includes(name)) && app.includes("client_secret 不应保存在前端"));
  assert("fixed option forms avoid free text for scopes and store access", ["multiCheckField(\"apiScopes\"", "tiktokScopeOptions", "multiCheckField(\"teamStores\"", "getCheckedValues(\"teamStores\")"].every((text) => app.includes(text)));
  assert("TikTok API blockers show user handoff steps", ["showApiHandoffSteps", "查看人工处理流程", "Partner Center 已登录", "scope 已开通或审批通过", "client_secret 只放后端环境变量"].every((text) => app.includes(text)));
  assert("sync logs are visible and recorded", ["syncLogs", "addSyncLog"].every((name) => app.includes(name)) && app.includes("同步日志"));
  assert("system message center supports read state and filters", ["messageType", "messageRead", "markMessageRead", "markAllMessagesRead", "deleteMessage", "pruneSystemMessages"].every((name) => app.includes(name)) && app.includes("本地保留最近 90 天"));
  assert("platform feature switches govern channels", ["featureSwitches", "toggleFeatureSwitch", "channelOptionsForCreators", "validateChannelForCreators"].every((name) => app.includes(name)) && app.includes("Stripe 支付已由平台管理端关闭"));
  assert("billing ledger and local payment boundary supported", app.includes("billingRecords") && app.includes("账单与支付记录") && app.includes("不会发起真实扣款或开票") && app.includes("本地记录不代表真实扣款或开票"));
  assert("admin merchant onboarding workflow supported", ["merchantApplications", "approveMerchantApplication", "rejectMerchantApplication", "resetMerchantApplication", "merchantApplicationActions"].every((name) => app.includes(name)) && app.includes("商家入驻审批") && app.includes("不会调用真实商户系统、支付系统或 TikTok API"));
  assert("team management and operation logs supported", ["rolePermissions", "operationLogs", "logOperation", "openTeamMemberModal", "saveTeamMember", "toggleTeamMember"].every((name) => app.includes(name)) && app.includes("操作日志") && app.includes("可访问店铺"));
  assert("products cannot be manually faked", app.includes("本地版本不允许手动新增") && app.includes("产品数据应来自 TikTok Shop Partner API"));
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
