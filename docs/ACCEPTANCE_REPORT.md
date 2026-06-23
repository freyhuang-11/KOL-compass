# Acceptance Report

## 2026-06-23 建联流程重构验收

### 结论

建联主流程已从“单商品 + 普通消息 + 本地邀请链接”调整为“定向邀约对象 + 触达渠道”的本地可用流程。当前版本支持：

- 多达人发起建联。
- 多商品选择。
- 每个商品配置标准佣金率。
- 每个商品可选广告佣金率。
- 创建本地 TikTok 定向邀约草稿，状态为 `待API发送`。
- TikTok 私信、Email 多渠道触达记录分别落库。
- Email 未绑定时继续引导邮箱配置；达人缺少 Email 时进入联系方式补充。
- 建联记录保留商品与佣金快照，后续转寄样/转合作时按多商品批量创建。

### 真实数据验证

本轮验证使用当前 sandbox/平台库真实数据，不使用 demo seed。

达人样本：

- 数据源：`.data/platform-creators.json`
- 总数：406
- 抽样：前 20 条真实平台达人
- sourceId 缺失：0
- avatarUrl 缺失：0
- GMV 缺失：0
- 类型分布：短视频达人 19，短视频+直播达人 1
- 类目 Top：食品饮料 8，家居日用 7，时尚配饰 6，母婴用品 6，女装与内衣 5，美妆个护 5
- GMV 格式样例：`USD 169,404`、`VND 1M+`、`USD 232,956`

商品样本：

- 数据源：`POST /api/tiktok/products`
- 授权店铺：`SANDBOX_VN7651055422359521044`
- shop_cipher：`ROW__LZifAAAAACJT0l46EyaPAB-vLKGASpO`
- 返回商品数：3
- 可选商品数：3
- 图片缺失：0
- 商品字段：名称、图片、价格、库存、状态均可读取
- 自动同步：进入产品页时，如果已授权店铺且商品缓存为空或超过 60 秒，前端会静默触发 `syncProducts({ silent: true, auto: true })`；不会要求客户手动点击“重新同步商品”才能看到新增商品。
- 多商品验收：当前 sandbox 已返回 3 个可选商品，可用于多商品建联和佣金配置验收。

### API 边界

- TikTok 私信官方能力存在独立接口，包括 `Create Conversation with creator` 和 `Send IM Message`，所需 scope 为 `seller.affiliate_messages.write`。
- TikTok 定向邀约不是普通消息里的本地链接，应作为 Target Collaboration 对象处理。
- 当前实现不会把本地草稿伪装为 TikTok 官方发送成功；建联记录先以 `待API发送` 状态落库。
- TikTok 私信后端路径已接入：`POST /affiliate_seller/202508/conversations` 创建/获取会话，再 `POST /affiliate_seller/202412/conversations/{conversation_id}/messages` 发送文本消息。
- TikTok Target Collaboration 官方入口已确认：`POST /affiliate_seller/202508/target_collaborations`；当前生成 payload preview 并返回 `TARGET_COLLABORATION_SCHEMA_REQUIRED`，等 API Testing Tool 确认完整请求 schema 后才允许实发。

### 后端发送 dry-run 验收

使用当前真实授权店铺、真实达人和 3 个真实商品运行 `/api/tiktok/outreach/submit` dry-run：

- HTTP：200
- `ok`：true
- TikTok 私信 dry-run endpoint：`POST /affiliate_seller/202412/conversations/{conversation_id}/messages`
- 定向邀约 endpoint：`POST /affiliate_seller/202508/target_collaborations`
- 定向邀约商品数：3
- 定向邀约达人 open_id 数：1
- 使用真实达人：`enreview2`
- 使用真实店铺：`SANDBOX_VN7651055422359521044`
- 本次没有实际发送 TikTok 私信，避免未经人工确认触达真实达人。

Email SMTP dry-run：

- endpoint：`/api/email/outreach/send`
- HTTP：200
- `ok`：true
- SMTP：`smtp.gmail.com:587`
- secure：false（587 STARTTLS）
- dry-run 收件人：`creator@example.com`
- 真实达人样本：`enreview2`
- 样本达人邮箱：缺失，因此没有实际发送邮件；真实发送前必须先补齐达人 Email，并在本地邮箱配置中保存应用专用密码。

### 本轮验证命令

```bat
node --check app.js
node --check smoke-test.js
node smoke-test.js
git diff --check
```

更新时间：2026-06-22 21:05 CST

## 最近验收结论

当前版本可用于本地继续验收，但还不是完整生产版。主要差距在真实外部账号授权、TikTok 达人库全量回填节流、后端持久化和正式消息发送通道。

## 最近通过的验证

```bat
node --check app.js
node --check server.js
node --check smoke-test.js
node smoke-test.js
```

## 最近已验收范围

- 商品同步：TikTok sandbox 商品可同步，图片、价格、库存、状态可显示。
- 达人库：读取平台达人库，客户侧不导入、不抓取，按当前店铺市场过滤。
- 达人字段：隐藏 API 技术标签；达人类型收敛为三种；MCN 仅为标签。
- 达人 GMV：展示 TikTok 返回的币种和格式，不自行换算，不加 `/月`。
- KOL 详情：头像与列表同步；不展示合作产出和经营指标。
- 建联：支持 TikTok 私信和 Email 多渠道；Email 未绑定时引导配置；邀请链接和翻译稿持久化。
- 分页批量选择：达人库支持本页全选、筛选结果全选、清空选择、分页和每页数量切换。

## 未完成/需继续验收

- TikTok 达人搜索后台任务已按 5 秒巡检、`nextRunAt` 退避续跑方向处理；仍需真实长时间运行观察。
- SG / MY / TH / PH 需要真实授权店铺后才能回填对应市场达人。
- Email SMTP/IMAP、WhatsApp Business、TikTok 私信真实发送尚未完成生产接入。
- `app.js` 需要模块化拆分，降低维护风险。

## 历史验收归档

完整历史验收记录见：

- `docs/archive/ACCEPTANCE_REPORT_2026-06-22.full.md`
