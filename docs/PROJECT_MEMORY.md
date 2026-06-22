# KOL Compass 项目记忆

更新时间：2026-06-22 20:05 CST

## 当前工作目录

只允许在以下目录继续：

`D:\SamsoData\Documents\Kol compass`

禁止触碰：

`D:\tiktok-creator-tool`

原因：那是用户的另一个项目，并且占用 `5173` / `5174`。

## 当前可运行版本

本项目当前包含本地前端和 TikTok Shop API 后端，默认端口：

`http://127.0.0.1:5175`

TikTok Shop API 后端：

`http://127.0.0.1:8015`

当前 Git 分支：

`codex/kol-compass-mvp`

启动：

```bat
start-5175.bat
```

同时启动前端和后端：

```bat
start-full.bat
```

后端单独启动：

```bat
start-api-8015.bat
```

验收：

```bat
node smoke-test.js
```

## 本轮已确认

- 2026-06-22 16:30 CST：产品页已按真实 TikTok 商品数据重验收。`node --check app.js`、`node --check server.js`、`node smoke-test.js`、`git diff --check` 已通过；`smoke-products.png` 已更新，截图中商品图片来自 TikTok 返回的 `imageUrl`，状态显示为 `可选`，搜索只保留“商品名 / 商品ID”。
- 2026-06-22 17:20 CST：KOL 池筛选已补齐固定选项。达人类型、TikTok 类目、市场地区为多选 chip；粉丝量级、近30天GMV、回复率、联系方式、建联状态为固定单选。新增/编辑达人中的达人类型、类目、地区改为固定下拉；API scope 和团队成员可访问店铺改为固定勾选。`smoke-kol-pool.png` 已重截。
- 2026-06-22 17:40 CST：TikTok Affiliate Seller 达人搜索接口恢复响应，本地接口曾成功返回真实达人。已修正 `normalizeCreators`：`creator_open_id` 映射到 `sourceId`，`selection_region=VN` 显示为越南，`gmv.amount/currency` 显示为可读 GMV，`avatar.url` 显示为达人头像，均播/直播 UV 写入标签。连续请求该接口仍可能触发 429，后续测试应低频执行。
- 2026-06-22 17:50 CST：侧边栏导航已从字符占位图标改为统一的内联 SVG 图标组件，包含控制台、产品、KOL、建联、自动回复、模板、黑名单、寄样、合作、消息、团队、订阅和平台管理；冒烟测试新增断言，禁止回退到符号图标。
- 2026-06-22 18:03 CST：客户主流程已明确为“第一步绑定店铺/同步商品 -> 第二步进入达人库筛选达人”。原 `KOL池` 导航和页面标题改为 `达人库`；产品管理页新增“下一步：筛选达人”和“进入达人库”入口；达人库顶部新增店铺来源、真实达人数量、本地/演示达人数量和上次抓取信息。真实达人来源仍是 TikTok Affiliate Seller Marketplace Creator Search，不伪造数据。
- 2026-06-22 18:16 CST：达人库抓取逻辑已改为按所有已授权 TikTok Shop 店铺市场分页抓取，系统会逐个 `shop_cipher` 调用 `/api/tiktok/creators/search`，使用 `page_token` 继续翻页并写入 `sourceShopCipher/sourceShopRegion`。达人库展示不再让客户手选国家，改为按当前绑定店铺市场自动过滤；店铺切到哪个国家，只展示该国家达人。
- 2026-06-22 18:48 CST：达人库边界已修正为“平台已有达人库 + 客户按店铺市场筛选”。客户绑定店铺不会触发客户侧自动抓取达人，进入达人库或切换店铺也不会自动抓取；`syncCreators` 不再暴露到 `window`。达人基础资料由平台内部导入/维护，客户侧只能筛选、查看、建联、拉黑/不感兴趣。只有客户选择 Email 建联且达人缺少邮箱时，系统才创建 `联系方式补充` 任务，状态进入 `联系方式补充中`，补充完成前不发送 Email。
- 2026-06-22 19:18 CST：已补齐真正的平台达人库数据源。后端新增 `.data/platform-creators.json` 持久化文件、`GET /api/platform/creators` 读取接口和 `POST /api/platform/creators/import-tiktok` 平台内部导入接口；前端启动时只读取平台达人库，不在客户侧调用 TikTok 抓取。平台管理端新增“更新平台达人库”按钮，默认按多页导入。已用当前授权 VN sandbox 店铺从 TikTok API 写入 40 个真实达人到本地平台库；TikTok 在继续分页时返回 downstream 限流，需要后续做节流分页任务继续全量回填。类目已接 `/product/202309/categories` 映射，客户侧不再展示 `类目ID ...`，已将当前 VN 返回的常见类目中文化为“时尚配饰 / 美妆个护 / 家居日用 / 母婴用品”等固定筛选项。
- 2026-06-22 19:40 CST：平台达人库自动任务已补齐。后端启动后会按 `SG -> MY -> TH -> VN -> PH` 优先级运行定时任务，任务状态保存到 `.data/platform-creator-job.json`，每个授权店铺市场保存 `nextPageToken` 游标，遇到 TikTok 限流会记录 `lastError` 并在后续定时任务继续。新增 `GET /api/platform/creators/job` 查看状态和 `POST /api/platform/creators/job/run` 手动触发。当前 TikTok 授权列表只返回 VN sandbox 店铺，所以 SG/MY/TH/PH 会等对应真实店铺授权后再抓；刚手动触发任务时 TikTok 仍返回 downstream 限流，平台库保持 40 个 VN 真实达人。达人库前端已自动清理旧的无效类目/类型筛选，避免 localStorage 残留的旧 `类目ID` 筛选把 40 个达人过滤成 0。
- 2026-06-22 19:55 CST：已按用户要求清除所有内置演示数据。`seed` 中的产品、达人、建联、寄样、合作、模板、自动回复、系统消息、同步日志、团队、商家入驻、账单和操作日志全部为空；新增一次性迁移清理旧浏览器 localStorage 中的演示数据，只保留带 `sourceId` 的真实 TikTok 商品和平台达人。CSV 模板只保留表头，不再带 `sample_creator` 示例行。后续如需引导教程页，再单独在教程上下文加载演示数据。
- 2026-06-22 20:05 CST：达人库字段口径已按用户反馈修正。客户可见达人类型只保留 `短视频达人`、`直播达人`、`短视频+直播达人` 三种；`联盟达人` 不再作为类型展示，旧值会按均播/直播UV指标迁移为内容形态。`MCN达人` 只作为业务标签展示。`TikTok API`、`联盟达人`、`均播 ...`、`直播UV ...` 都不允许作为客户可见标签。均播和直播UV改为独立表格字段，来源为 TikTok 的 `avg_ec_video_view_count/avg_video_view_count` 和 `avg_ec_live_uv/avg_live_uv`，没有返回时显示 `-`。已重启 8015 后端并低频触发一次平台达人导入，当前 `/api/platform/creators` 返回 60 个真实达人，验收计数为 `badTags=0`、`badTypes=0`、`withMetrics=52`。
- `node --check app.js` 通过。
- `node smoke-test.js` 全部通过。
- 控制台截图 `smoke-dashboard.png` 已重新生成并目视检查通过，时间范围筛选、负责人筛选、指标下钻、内容状态分布和负责人概览可见。
- 系统消息截图 `smoke-messages.png` 已重新生成并目视检查通过，类型筛选、已读筛选、全部已读、单条已读/删除可见。
- 账号与团队截图 `smoke-team.png` 已生成并目视检查通过，成员管理、角色权限、可访问店铺和操作日志可见。
- KOL 池截图 `smoke-kol-pool.png` 已重新生成并目视检查通过，建联配额、状态总览、选择当前可建联、24 小时限发和不感兴趣入口可见。
- KOL 黑名单截图 `smoke-blacklist.png` 已生成并目视检查通过，统计、搜索、拉黑原因、拉黑时间和移出入口可见。
- 订阅计费截图 `smoke-billing.png` 已重新生成并目视检查通过，套餐切换、配额、账单与支付记录台账可见。
- 自动回复截图 `smoke-auto-reply.png` 已生成并目视检查通过，规则配置和本地测试入口可见。
- 平台管理端截图 `smoke-admin.png` 已重新生成并目视检查通过，功能开关、商家统计、入驻审批台账、API 配置和人工处理流程入口可见。
- 订阅计费截图 `smoke-billing.png` 已生成并目视检查通过，Stripe 关闭状态可见。
- 系统消息截图 `smoke-messages.png` 已生成并目视检查通过。
- 产品管理截图 `smoke-products.png` 已重新生成并目视检查通过，详情、相关合作、相关建联入口可见。
- 平台管理端截图 `smoke-admin.png` 已重新生成并目视检查通过。
- 合作管理截图 `smoke-cooperations.png` 已重新生成并目视检查通过，点阵背景、生命周期侧栏、内容追踪、直播追踪和 ROI 分析模块可见。
- 建联记录截图 `smoke-outreach.png` 已重新生成并目视检查通过，建联总数、待达人回复、待我方回复、已转合作状态总览和当前显示条数可见。
- KOL 池截图 `smoke-kol-pool.png` 已重新生成并目视检查通过。
- KOL 详情截图 `smoke-kol-detail.png` 已重新生成并目视检查通过，左侧达人资料卡、联系方式卡、右侧沟通工作台和合作入口可见。
- 消息模板截图 `smoke-templates.png` 已生成并目视检查通过。
- 寄样管理截图 `smoke-samples.png` 已重新生成并目视检查通过，状态总览、搜索、状态筛选和转合作入口可见。
- `5175` 是本项目端口。
- `5173` / `5174` 不属于本项目，不能占用或关闭。
- 控制台已支持按本月/近7天/近30天/全部筛选，并支持按合作负责人筛选；活动指标按更新时间统计，合作履约指标按产出截止日统计。
- 控制台关键指标可下钻到建联记录、寄样管理、合作管理、系统消息和平台管理端；合作状态分布和负责人概览可直接筛选。
- KOL 详情页不展示内容产出、视频、直播、GMV、订单、佣金、ROI。
- 内容追踪只放在合作管理。
- 产品管理已按参考后台收敛为“商品名 / 商品ID”两个检索条件，不再保留类目、状态、合作模式三组非必要筛选；商品图片、价格、库存和原始状态来自 TikTok Shop API。
- TikTok 商品同步已补充商品详情读取，实测 sandbox 商品返回真实 `imageUrl`；`rawStatus=ACTIVATE` 会在前端列表归一显示为 `可选`，避免直接暴露英文技术状态影响判断。
- 产品管理已支持只读商品详情，显示商品源、价格、佣金、合作模式、状态、相关建联/寄样/合作数量，并可下钻到相关建联和相关合作；不允许本地新增或改写真实商品源。
- 产品详情不展示视频、直播、GMV、订单、佣金支出和 ROI，这些履约指标仍只放在合作管理。
- KOL 池已支持关键词搜索、达人类型多选、TikTok 类目多选、市场地区多选、粉丝量级、近30天GMV、回复率、联系方式和建联状态筛选，并展示当前筛选、可建联达人、暂不可建联、已选择状态总览。
- KOL 池和建联保存已执行建联安全规则：月配额、同一达人 24 小时限发、不感兴趣 30 天屏蔽；建联记录和 KOL 池均可标记不感兴趣。
- KOL 黑名单已支持统计、达人/类目/地区/原因搜索、拉黑原因、拉黑时间、移出黑名单；拉黑和移出动作写入系统消息和操作日志。
- 订阅计费页已支持本地切换套餐，并即时影响建联配额显示和建联拦截；账单与支付记录为本地台账，切换套餐只写本地记录、系统消息和操作日志，不会发起真实扣款或开票。
- 建联记录已支持按达人/产品/消息关键词、沟通状态、渠道筛选。
- 建联记录已支持建联总数、待达人回复、待我方回复、已转合作状态总览；状态卡片可直接筛选列表，并展示当前显示条数。
- 合作管理已支持按达人/产品/负责人/备注搜索，并支持全部/已产出/未产出筛选；筛选后的当前视图会汇总 GMV、订单、佣金+投流和 ROI，便于复投或终止判断。
- 平台管理端已支持保存 TikTok API 本地配置：client_key、OAuth Redirect URL、scope、最近检查时间；client_secret 明确不保存到前端。
- 已新增本地 TikTok Shop API 后端 `server.js`：支持 `/api/health`、授权链接、OAuth 回调换 token、读取已授权店铺、商品搜索同步；token 保存到 `.data/tiktok-token.json`，`.data/` 与 `.env.local` 已加入 `.gitignore`。
- TikTok Shop sandbox OAuth 已跑通：已授权测试店铺 `SANDBOX_VN7651055422359521044`，region `VN`，商品同步成功返回 1 个商品。
- 已接入 Affiliate Seller 达人搜索后端 `/api/tiktok/creators/search`，对应 TikTok Open API `/affiliate_seller/202508/marketplace_creators/search`；当前 sandbox 实测返回 `36009002 Too many requests for downstream`，前端会把真实错误写入同步日志，不伪造达人数据。
- 达人搜索接口已确认可恢复响应；系统会把真实返回字段归一为 KOL 池可用字段，包括头像、sourceId、地区、粉丝数、GMV 和 TikTok API 标签。
- TikTok API 未授权或授权阻塞时，商品、达人、内容/订单同步按钮会优先调用真实后端并展示失败原因；不会伪造同步成功。
- 平台管理端功能开关已从静态展示变成真实状态：TikTok 私信、Email、WhatsApp、消息翻译、Stripe 支付可切换。
- 平台管理端已支持本地商家统计和入驻审批台账：申请商家、待审批、已通过、接入阻塞统计可见；入驻申请可通过、驳回、恢复待审；动作写入系统消息和操作日志，不调用真实商户系统、支付系统或 TikTok API。
- 建联和回复渠道会读取功能开关；关闭 Email/WhatsApp 后，新建联和回复不会再显示对应渠道，保存时也会二次校验。
- 订阅计费页会读取 Stripe 支付开关，关闭时明确展示 Stripe 不可用。
- 账号与团队已支持成员新增、编辑、启禁用、角色权限摘要、可访问店铺和操作日志；关键动作会写入 operationLogs。
- 产品管理不允许手动新增商品，避免本地商品和 TikTok Shop 真实商品源冲突。
- 合作管理已支持 CSV 模板下载与 CSV 导入；达人库客户侧不提供 CSV 导入。
- 达人库已支持勾选达人、选择当前可建联、清空选择、一键建联、选择产品/模板/渠道、定时发送记录和附加邀请链接。
- 达人联系方式不在客户侧编辑；客户选择 Email 建联且达人缺少邮箱时进入联系方式补充任务。
- 建联记录和 KOL 详情沟通记录已支持直接回复，回复后状态回到待达人回复。
- 自动回复已支持新增、编辑、删除、启停、关键词/完全匹配/条件组合规则配置、本地触发测试；本地测试只写系统消息，不发送真实 TikTok/Email/WhatsApp。
- 消息模板已支持新增、编辑、删除，编辑字段包括模板名称、渠道、内容，并提示可用变量。
- 本地数据支持 JSON 导入/导出。
- 建联记录已支持：标记已回复、安排寄样、进入合作、关闭、删除。
- 寄样管理已支持：状态总览、达人/产品/物流单号搜索、状态筛选、新增/更新寄样、删除、已签收后进入合作。
- 系统消息已支持同步日志与通知中心：记录 API/商品/达人/内容订单同步的模块、状态、失败原因和时间；支持类型筛选、已读筛选、全部已读、单条已读、删除和 90 天本地保留；外部 API 未授权时不伪造同步成功。

## 当前阻塞

暂无 GitHub 远端阻塞：

- `origin` 已配置为 `https://github.com/freyhuang-11/KOL-compass.git`。
- 当前分支为 `codex/kol-compass-mvp`。
- 每次可验证阶段完成后，先跑 `node smoke-test.js`，再小步 commit/push。

仍未完整真实接入的外部能力：

- TikTok Partner API：店铺绑定和商品同步代码已接入，仍需要真实 `TIKTOK_SHOP_APP_KEY` / `TIKTOK_SHOP_APP_SECRET`、Partner Center Redirect URL 和人工 OAuth 授权后验证。
- WhatsApp Business API
- Email SMTP/IMAP
- 支付

## 下次继续优先级

1. 继续保持 `docs/PROJECT_MEMORY.md` 和 `docs/CLAUDE_CONTINUE.md` 最新。
2. 每次阶段完成后先跑 `node smoke-test.js`。
3. 验证通过后小步提交并推送到 GitHub。
4. TikTok Partner API 接入前先读 `docs/TIKTOK_API_HANDOFF.md`，遇到 OAuth、验证码、scope、redirect URL 问题时给用户操作流程。
