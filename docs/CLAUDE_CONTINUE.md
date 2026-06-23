# Claude Continue

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
