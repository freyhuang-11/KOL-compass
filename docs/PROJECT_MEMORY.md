# KOL Compass 项目记忆

更新时间：2026-06-21 23:20 CST

## 当前工作目录

只允许在以下目录继续：

`D:\SamsoData\Documents\Kol compass`

禁止触碰：

`D:\tiktok-creator-tool`

原因：那是用户的另一个项目，并且占用 `5173` / `5174`。

## 当前可运行版本

本项目当前是本地静态后台版本，默认端口：

`http://127.0.0.1:5175`

当前 Git 分支：

`codex/kol-compass-mvp`

启动：

```bat
start-5175.bat
```

验收：

```bat
node smoke-test.js
```

## 本轮已确认

- `node --check app.js` 通过。
- `node smoke-test.js` 全部通过。
- 平台管理端截图 `smoke-admin.png` 已重新生成并目视检查通过，功能开关可见且可切换。
- 订阅计费截图 `smoke-billing.png` 已生成并目视检查通过，Stripe 关闭状态可见。
- 系统消息截图 `smoke-messages.png` 已生成并目视检查通过。
- 产品管理截图 `smoke-products.png` 已生成并目视检查通过。
- 平台管理端截图 `smoke-admin.png` 已重新生成并目视检查通过。
- 合作管理截图 `smoke-cooperations.png` 已重新生成并目视检查通过。
- 建联记录截图 `smoke-outreach.png` 已重新生成并目视检查通过。
- KOL 池截图 `smoke-kol-pool.png` 已重新生成并目视检查通过。
- KOL 详情截图 `smoke-kol-detail.png` 已重新生成并目视检查通过。
- 消息模板截图 `smoke-templates.png` 已生成并目视检查通过。
- 寄样管理截图 `smoke-samples.png` 已生成并目视检查通过。
- `5175` 是本项目端口。
- `5173` / `5174` 不属于本项目，不能占用或关闭。
- KOL 详情页不展示内容产出、视频、直播、GMV、订单、佣金、ROI。
- 内容追踪只放在合作管理。
- 产品管理已支持按产品关键词、类目、状态、合作模式筛选，并明确提示真实数据来自 TikTok Shop Partner API。
- KOL 池已支持按关键词、达人类型、类目、地区、粉丝量级、回复率区间筛选。
- 建联记录已支持按达人/产品/消息关键词、沟通状态、渠道筛选。
- 合作管理已支持按达人/产品/负责人/备注搜索，并支持全部/已产出/未产出筛选。
- 平台管理端已支持保存 TikTok API 本地配置：client_key、OAuth Redirect URL、scope、最近检查时间；client_secret 明确不保存到前端。
- 平台管理端功能开关已从静态展示变成真实状态：TikTok 私信、Email、WhatsApp、消息翻译、Stripe 支付可切换。
- 建联和回复渠道会读取功能开关；关闭 Email/WhatsApp 后，新建联和回复不会再显示对应渠道，保存时也会二次校验。
- 订阅计费页会读取 Stripe 支付开关，关闭时明确展示 Stripe 不可用。
- 产品管理不允许手动新增商品，避免本地商品和 TikTok Shop 真实商品源冲突。
- KOL 池和合作管理已支持 CSV 导入。
- KOL 池已支持勾选达人、一键建联、选择产品/模板/渠道、定时发送记录和附加邀请链接。
- 达人联系方式已支持在编辑弹窗录入 Email / WhatsApp。
- 建联记录和 KOL 详情沟通记录已支持直接回复，回复后状态回到待达人回复。
- 消息模板已支持新增、编辑、删除，编辑字段包括模板名称、渠道、内容，并提示可用变量。
- 本地数据支持 JSON 导入/导出。
- 建联记录已支持：标记已回复、安排寄样、进入合作、关闭、删除。
- 寄样管理已支持：新增/更新寄样、删除、已签收后进入合作。
- 系统消息已支持同步日志，记录 API/商品/达人/内容订单同步的模块、状态、失败原因和时间；外部 API 未授权时不伪造同步成功。

## 当前阻塞

暂无 GitHub 远端阻塞：

- `origin` 已配置为 `https://github.com/freyhuang-11/KOL-compass.git`。
- 当前分支为 `codex/kol-compass-mvp`。
- 每次可验证阶段完成后，先跑 `node smoke-test.js`，再小步 commit/push。

仍未真实接入的外部能力：

- TikTok Partner API
- WhatsApp Business API
- Email SMTP/IMAP
- 支付

## 下次继续优先级

1. 继续保持 `docs/PROJECT_MEMORY.md` 和 `docs/CLAUDE_CONTINUE.md` 最新。
2. 每次阶段完成后先跑 `node smoke-test.js`。
3. 验证通过后小步提交并推送到 GitHub。
4. TikTok Partner API 接入前先读 `docs/TIKTOK_API_HANDOFF.md`，遇到 OAuth、验证码、scope、redirect URL 问题时给用户操作流程。
