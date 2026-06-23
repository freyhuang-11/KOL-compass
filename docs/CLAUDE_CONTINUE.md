# Claude Continue

更新时间：2026-06-23 13:35 Asia/Shanghai

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
- `docs/ACCEPTANCE_REPORT.md`：新增 2026-06-23 建联流程验收记录。

## 已知边界
- 当前 sandbox 授权店铺只有 1 个真实商品；多商品流程已经验证代码路径和数据结构，但无法用 2 个不同真实商品做业务级验收。
- TikTok 私信发送和 Target Collaboration 官方提交仍处于 `待API发送` 状态；系统不会声称已发出官方邀约。
- 后续要接真实发送时，需要先确认 TikTok Target Collaboration 的精确请求 schema、scope 和限流规则，再把 `targetCollaborations` 草稿提交到后端发送队列。

## 本轮验收结果
- `node --check app.js`：通过
- `node --check server.js`：通过
- `node --check smoke-test.js`：通过
- `node smoke-test.js`：通过
- `git diff --check`：通过，仅有 CRLF 提示
- 真实商品接口：`POST /api/tiktok/products` 返回 3 个商品，3 个均为可选，图片缺失 0。
- 真实达人库：`.data/platform-creators.json` 当前 406 个达人；前 20 条样本 `sourceId/avatarUrl/gmv` 缺失均为 0。
- 自动商品同步：产品页会在已授权店铺且缓存为空或超过 60 秒时静默同步商品。

## 下一步
- 提交并推送本轮可验证阶段。
- 后续接 TikTok 官方发送时，先确认私信和 Target Collaboration 的正式 scope、请求体、限流和错误码，再从 `待API发送` 队列对接。
