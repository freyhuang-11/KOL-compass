# TikTok Partner API 接入交接

## 2026-06-23 当前建联接口状态

- 商品同步：`POST /api/tiktok/products` 已返回当前授权店铺 3 个商品；产品页会在缓存为空或超过 60 秒时自动静默同步。
- TikTok 私信：`/api/tiktok/outreach/submit` dry-run 已返回 `POST /affiliate_seller/202412/conversations/{conversation_id}/messages`。
- Target Collaboration：官方入口和字段已确认并接入，入口为 `POST /affiliate_seller/202508/target_collaborations`。
- Target Collaboration 请求体字段：`name`、`message`、`end_time`、`products[].id`、`products[].target_commission_rate`、`products[].shop_ads_commission_rate`、`creator_user_open_ids`、`seller_contact_info`、`free_sample_rule`。
- 佣金单位：系统内百分比会在后端转换为 TikTok 官方“百分之一百分比”单位，例如 20% -> `2000`，5% -> `500`。
- 安全边界：dry-run 只返回 payload preview；非 dry-run 会真实请求 TikTok 官方接口。未明确确认达人、商品、消息内容前，不应执行真实外部发送。

---

本项目当前已新增本地 TikTok Shop API 后端 `server.js`。它不会伪造 TikTok Partner API 数据；未完成后端配置或 OAuth 授权前，产品、达人、内容、订单同步按钮会写入明确失败原因。

## 本地后端

后端端口：`http://127.0.0.1:8015`

配置文件：

1. 复制 `.env.example` 为 `.env.local`。
2. 填入 `TIKTOK_SHOP_APP_KEY` 和 `TIKTOK_SHOP_APP_SECRET`。
3. 确认 Partner Center Redirect URL 配置为 `http://127.0.0.1:8015/api/tiktok/callback`。
4. 运行 `start-api-8015.bat` 或 `node server.js`。
5. 打开 `http://127.0.0.1:5175/#admin`，点击 `检查后端`、`绑定店铺`、`读取已授权店铺`。

后端已实现：

- 生成 TikTok Shop 授权链接：`/api/tiktok/auth-url`
- OAuth 回调换 token：`/api/tiktok/callback`
- 获取已授权店铺：`/api/tiktok/shops`
- 搜索商品并映射到产品管理：`/api/tiktok/products`
- 提交建联发送任务：`/api/tiktok/outreach/submit`
  - TikTok 私信路径：先创建达人会话 `POST /affiliate_seller/202508/conversations`，再发送消息 `POST /affiliate_seller/202412/conversations/{conversation_id}/messages`
  - 定向邀约路径：官方入口为 `POST /affiliate_seller/202508/target_collaborations`；当前只生成 payload preview 并返回 `TARGET_COLLABORATION_SCHEMA_REQUIRED`，等 API Testing Tool 确认完整请求 schema 后才允许实发
- 提交 Email 建联：`/api/email/outreach/send`
  - 本地后端使用 SMTP AUTH LOGIN 发送文本邮件，支持 465 TLS 和 587 STARTTLS
  - 前端只在本地保存邮箱账号和应用专用密码；生产环境必须改为后端加密保存

Token 保存到 `.data/tiktok-token.json`，该目录已加入 `.gitignore`，不要提交。

## 需要人工处理的情况

以下情况无法由程序自动绕过，需要你在浏览器或 Partner Center 中处理：

1. Partner Center 登录态过期。
2. OAuth 授权页需要账号确认。
3. 人机验证、验证码、风控弹窗。
4. App scope 未开通或等待审核。
5. Redirect URL 与本地服务地址不一致。
6. 店铺没有 Affiliate / Messaging / Order 数据权限。

## 建议接入顺序

1. 在 TikTok Shop Partner Center 创建或选择 Partner App。
2. 确认 scope 至少覆盖：
   - Product / 商品读取
   - Affiliate creator marketplace / 达人搜索
   - Affiliate messaging / 会话收发
   - Affiliate order / 联盟订单
   - Collaboration / 定向或公开合作
3. 配置 OAuth Redirect URL。后续接后端时建议使用：
   - 本地：`http://127.0.0.1:8015/api/tiktok/callback`
   - 线上：使用正式 HTTPS 域名。
4. 记录 `client_key` 和 `client_secret`，不要写进前端代码。
5. 先跑店铺绑定和商品同步，再跑达人同步，再跑内容/订单同步。

## 验收口径

API 接通前：

- 后台能打开。
- 所有页面可进入。
- 本地新增/编辑/筛选/标签功能可用。
- 同步按钮给出明确状态，不假装成功抓到真实 TikTok 数据。

API 接通后：

- 产品管理显示 TikTok Shop 商品与佣金。
- KOL池显示 Partner API 返回的达人数据。
- 建联记录能读写 TikTok 私信会话。
- 合作管理能同步视频、直播、联盟订单、GMV、佣金、ROI。
- KOL详情仍不展示内容产出和经营结果，只保留入口。
