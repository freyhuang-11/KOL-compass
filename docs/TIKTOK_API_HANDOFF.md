# TikTok Partner API 接入交接

本项目当前是可直接打开的本地后台版本。它不会伪造 TikTok Partner API 数据；未完成授权前，产品、达人、内容、订单同步按钮只会写入本地状态提示。

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
5. 先跑商品同步，再跑达人同步，再跑内容/订单同步。

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
