# Claude Continue

更新时间：2026-06-23 18:05 Asia/Shanghai

## 最新状态
- 用户新上架的 2 个商品已通过实时 TikTok 商品接口验证：当前授权店铺返回 3 个商品。
- 商品数据质量：名称缺失 0，图片缺失 0，状态分布 `可选:3`。
- 产品页自动同步逻辑仍有效：进入产品页且已有授权店铺时，商品缓存为空或超过 60 秒会触发静默同步；手动“重新同步商品”只是兜底。
- 3 商品建联 dry-run 已通过：Target Collaboration payload 中 `products.length=3`，达人 open id 数 1。
- 佣金映射已修复：20%、25%、30% 分别写入 TikTok 官方字段 `target_commission_rate=2000,2500,3000`；广告佣金 5% 写入 `shop_ads_commission_rate=500`。
- TikTok 私信 dry-run 已返回 endpoint：`POST /affiliate_seller/202412/conversations/{conversation_id}/messages`。
- 未执行真实外部发送，避免未经用户确认触达达人或创建真实定向邀约。

## 本轮改动
- `server.js`：新增 `productTargetCommissionRate`、`productAdsCommissionRate`，在后端 Target Collaboration ingest/请求体构建阶段统一佣金归一。
- `server.js`：新增 `isTikTokImChannel`，渠道只要包含 TikTok 就进入私信发送路径，避免中文渠道名编码差异导致 dry-run 漏掉 IM endpoint。
- `smoke-test.js`：新增佣金映射与 TikTok 私信渠道判断断言。
- `docs/ACCEPTANCE_REPORT.md`：记录本轮真实商品同步和 3 商品 dry-run 验收数据。

## 待验证
- 运行完整冒烟测试。
- 若通过，提交并推送本轮小步 commit。

---

更新时间：2026-06-23 17:52 Asia/Shanghai

## 最新状态
- 已从 TikTok Partner 官方文档接口拿到 `Create Target Collaboration` 202508 字段，不再停留在 schema 未知状态。
- 官方接口：`POST /affiliate_seller/202508/target_collaborations`。
- 后端已实现真实提交路径：非 dry-run 会调用官方 Target Collaboration API；dry-run 只返回官方字段 payload preview。
- 官方字段映射已验证：`name`、`message`、`end_time`、`products[].id`、`products[].target_commission_rate`、`products[].shop_ads_commission_rate`、`creator_user_open_ids`、`seller_contact_info`、`free_sample_rule`。
- 多商品 dry-run 结果：真实商品 3 个，选中 2 个；`target_commission_rate` 分别为 `2000`、`2500`，第二个商品 `shop_ads_commission_rate=500`；`creator_user_open_ids.length=1`。
- 真实外部发送未执行：避免在未明确确认具体达人/商品/消息时向 TikTok 创建真实定向邀约或私信。

## 本轮改动
- `server.js`：新增 Target Collaboration 官方请求体构造、字段校验和真实提交函数。
- `app.js`：Email 建联选择定向邀约时会先提交 TikTok 定向邀约，再发送 Email；成功后保存官方邀约 ID，避免重复创建。
- `smoke-test.js`：从 schema blocker 断言改为官方字段映射断言。

## 本轮验证
- 真实官方文档接口：`/api/v1/document/detail?document_id=create-target-collaboration&workspace_id=3` 返回 202508 字段表。
- 真实商品接口：`POST /api/tiktok/products` 返回 3 个商品。
- dry-run：`/api/tiktok/outreach/submit` 返回 200，Target Collaboration payload preview 商品数 2，IM endpoint 正确。

---

更新时间：2026-06-23 17:24 Asia/Shanghai

## 最新状态
- 真实商品同步已验证：`POST /api/tiktok/products` 返回 3 个商品，包含用户新增的 2 个商品；3 个商品均为 `ACTIVATE/可选`，图片缺失 0。
- 前端自动同步逻辑仍有效：进入产品页时，已授权店铺存在且商品缓存为空或超过 60 秒，会静默触发 `syncProducts({ silent: true, auto: true })`。
- 多商品建联 dry-run 已验证：使用真实店铺、真实达人 `enreview2`、前 2 个真实商品提交 `/api/tiktok/outreach/submit` dry-run，返回 200；Target Collaboration payload preview 中 `products.length=2`、`creator_open_ids.length=1`。
- TikTok 私信 dry-run 已验证：`im.endpoint=POST /affiliate_seller/202412/conversations/{conversation_id}/messages`。
- Target Collaboration 仍按产品原则阻塞：接口入口已知，但完整 request schema 未确认，系统显示 `定向邀约待配置`，不再伪装为“待回复/已发成功”。

## 本轮改动
- `app.js`：新增 `isTargetSchemaRequired`、`applyTargetSchemaBlock`、`openOutreachApiResult`，定向邀约 schema 阻塞时可查看 payload preview。
- `app.js`：TikTok 私信/Email 触达成功但 Target Collaboration 未确认 schema 时，建联记录停在 `定向邀约待配置`。
- `app.css`：补充 API 结果预览样式。
- `smoke-test.js`：新增 Target Collaboration schema 阻塞不可伪装成功的断言。

## 本轮验收
- `node --check app.js`：通过
- `node --check server.js`：通过
- `node --check smoke-test.js`：通过
- `node smoke-test.js`：通过
- 真实商品接口：3 条商品，选取 2 条做多商品 Target Collaboration dry-run，payload preview 商品数为 2。

## 下一步
- 如果要真正发 TikTok Target Collaboration，需要先在 Partner Center API Testing Tool 确认 `POST /affiliate_seller/202508/target_collaborations` 的完整字段 schema。
- 当前可继续验收：商品同步、多商品选择、佣金配置、TikTok 私信 dry-run、Email 配置引导、建联记录状态。

---

更新时间：2026-06-23 17:55 Asia/Shanghai

## 当前状态
- 项目目录：`D:\SamsoData\Documents\Kol compass`
- 前端端口：5175
- 后端端口：8015
- 当前目标：重做建联流程，区分 TikTok 定向邀约、TikTok 私信、Email 建联，支持多商品和佣金配置。

## 本轮已处理
- `app.js`：建联弹窗改为三段流程：确认达人、配置定向邀约、选择触达渠道。
- `app.js`：支持一次选择多个商品，并为每个商品配置标准佣金率和可选广告佣金率。
- `app.js`：新增本地 `targetCollaborations` 数据结构，定向邀约以 `待API发送` 草稿落库，不再用本地邀请链接伪装 TikTok 官方邀约。
- `app.js`：TikTok 私信和 Email 可以同时选择；缺邮箱时进入联系方式补充，未配置发件邮箱时引导到邮箱配置教程。
- `app.js`：建联记录保存商品与佣金快照，后续从建联转寄样/转合作时按多商品创建。
- `app.css`：补齐建联流程、模式卡片、多商品佣金表格和定向邀约摘要样式。
- `smoke-test.js`：补充建联流程、多商品佣金、定向邀约草稿、多商品转寄样/转合作断言。
- `server.js`：新增 `/api/tiktok/outreach/submit`，TikTok 私信按官方路径先创建达人会话再发送 IM 消息。
- `server.js`：Target Collaboration 生成 payload preview 并返回 `TARGET_COLLABORATION_SCHEMA_REQUIRED`，不在 schema 未确认时实发。
- `server.js`：新增 `/api/email/outreach/send`，支持 SMTP AUTH LOGIN、465 TLS、587 STARTTLS。
- `app.js`：建联记录 `待API发送` 操作改为“提交到后端发送”，不再只是手动标记成功。
- `app.js`：Email 建联改为调用 SMTP 后端发送；缺邮箱进入联系方式补充，SMTP 失败会写入发送失败原因。
- `docs/ACCEPTANCE_REPORT.md`：新增 2026-06-23 建联流程验收记录。
- `docs/TIKTOK_API_HANDOFF.md`：补充建联发送端点与 TikTok 官方 API 路径。

## 已知边界
- 当前 sandbox 授权店铺只有 1 个真实商品；多商品流程已经验证代码路径和数据结构，但无法用 2 个不同真实商品做业务级验收。
- TikTok 私信发送链已接到后端，但本轮验收只跑 dry-run，没有替用户真实私信达人。
- Target Collaboration 官方入口已确认，但完整请求 schema 仍需在 Partner Center API Testing Tool 中确认；当前不会实发。
- Email 发送链已接到后端；真实发信需要本地保存应用专用密码，且达人必须有 Email。

## 本轮验收结果
- `node --check app.js`：通过
- `node --check server.js`：通过
- `node --check smoke-test.js`：通过
- `node smoke-test.js`：通过
- `git diff --check`：通过，仅有 CRLF 提示
- 真实商品接口：`POST /api/tiktok/products` 返回 3 个商品，3 个均为可选，图片缺失 0。
- 真实达人库：`.data/platform-creators.json` 当前 406 个达人；前 20 条样本 `sourceId/avatarUrl/gmv` 缺失均为 0。
- 自动商品同步：产品页会在已授权店铺且缓存为空或超过 60 秒时静默同步商品。
- 真实 dry-run：`/api/tiktok/outreach/submit` 使用真实店铺、真实达人 `enreview2`、3 个真实商品返回 200；私信 endpoint preview 正确；定向邀约返回 `TARGET_COLLABORATION_SCHEMA_REQUIRED`。
- Email dry-run：`/api/email/outreach/send` 返回 200；样本达人 `enreview2` 当前无邮箱，因此只验证 SMTP payload，不发送真实邮件。

## 下一步
- 提交并推送本轮可验证阶段。
- 后续接 TikTok 官方发送时，先确认私信和 Target Collaboration 的正式 scope、请求体、限流和错误码，再从 `待API发送` 队列对接。
