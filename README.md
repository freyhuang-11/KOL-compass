# KOL Compass

独立的 TikTok Shop KOL 建联与合作管理后台原型，运行目录为：

`D:\SamsoData\Documents\Kol compass`

## 启动

不占用 `5173` / `5174`。推荐使用：

双击：

```text
start-5175.bat
```

或命令行：

```powershell
python -m http.server 5175
```

然后打开：

```text
http://localhost:5175
```

可直接打开的验收页面：

```text
http://localhost:5175/#dashboard
http://localhost:5175/#cooperations
http://localhost:5175/#kol/creator/1
http://localhost:5175/#admin
```

停止本项目服务：

```text
stop-5175.bat
```

## 冒烟测试

启动后运行：

```powershell
node smoke-test.js
```

测试会检查文件完整性、JS 语法、核心页面覆盖、合作管理边界、KOL 详情边界，以及 `5175` 服务是否可访问。

## CSV 导入字段

KOL CSV 支持表头：

`username,tiktok_username,TikTok用户名,达人账号,达人,nickname,昵称,type,creator_type,达人类型,category,类目,region,地区,followers,粉丝,gmv,replyRate,tags,email,whatsapp,notes`

合作 CSV 支持表头：

`username,tiktok_username,达人,product,product_name,产品,type,合作类型,status,内容状态,dueDate,产出截止日,videos,视频数,lives,直播场次,orders,订单数,gmv,commission,adSpend,contentUrl,tags,owner,notes`

## 当前版本范围

- 本地静态 SPA，无需安装 npm 依赖。
- 数据存储在浏览器 `localStorage`，支持刷新后保留。
- 顶部工具栏支持导出/导入 JSON，便于本地备份、迁移和恢复。
- 控制台支持本月/近7天/近30天/全部时间范围筛选、负责人筛选、指标下钻、内容状态分布和负责人概览。
- 产品管理支持搜索、类目筛选、状态筛选和合作模式筛选；商品详情为只读视图，可下钻相关建联和相关合作；未授权时仅使用本地数据，不伪造 TikTok API 同步成功。
- KOL池支持导入 KOL CSV、关键词/达人类型/类目/地区/粉丝量级/回复率筛选、当前筛选/可建联/暂不可建联/已选择状态总览、选择当前可建联、清空选择、一键建联、选择产品/模板/渠道、定时发送记录和附加邀请链接；合作管理支持导入合作 CSV。
- KOL池和建联保存会执行建联安全规则：月配额、同一达人 24 小时限发、不感兴趣 30 天屏蔽。
- 达人编辑弹窗支持录入 Email / WhatsApp；建联记录和 KOL 详情沟通记录支持直接回复。
- 平台管理端功能开关会约束建联和回复渠道；关闭 Email/WhatsApp 后，新建联和回复不会再显示对应渠道。
- 平台管理端支持本地商家统计和入驻审批台账，可通过、驳回、恢复待审；审批动作只更新本地状态和日志，不调用真实商户系统、支付系统或 TikTok API。
- KOL黑名单支持统计、达人/类目/地区/原因搜索、拉黑原因和拉黑时间记录，移出黑名单会写入系统消息和操作日志。
- 建联记录支持建联总数、待达人回复、待我方回复、已转合作状态总览，并可按状态卡片快速筛选；同时支持按达人/产品/消息关键词、沟通状态和渠道筛选。
- 自动回复支持新增、编辑、删除、启停、关键词/条件组合配置，并提供本地触发测试；测试不会发送真实外部消息。
- 合作管理支持按达人/产品/负责人/备注搜索，并支持全部/已产出/未产出筛选。
- 系统消息包含同步日志和通知中心，支持类型筛选、已读筛选、全部已读、单条已读、删除，并本地保留最近 90 天。
- 消息模板支持新增、编辑、删除，并提示可用变量。
- 账号与团队支持新增/编辑/启禁用成员、角色权限摘要、可访问店铺配置和操作日志。
- 建联记录支持从沟通状态推进到寄样或合作；寄样管理支持状态总览、达人/产品/物流单号搜索、状态筛选，并可从已签收样品进入合作管理。
- 订阅计费支持本地切换套餐，并即时影响建联配额提示和建联拦截；账单与支付记录为本地台账，切换套餐不会发起真实扣款或开票。
- 已覆盖控制台、产品管理、KOL池、建联记录、自动回复、消息模板、黑名单、寄样管理、合作管理、系统消息、账号团队、订阅计费、平台管理端。
- 合作管理是内容追踪唯一主入口，包含已产出/未产出、视频、直播、GMV、订单、佣金、ROI 和自定义标签筛选。
- KOL详情只展示基础资料、联系方式、标签备注、沟通记录和合作入口，不展示视频/直播/GMV/ROI。
- 产品不能手动新增或本地改写，避免本地数据和 TikTok Shop 真实商品源冲突；视频、直播、GMV、订单、佣金支出和 ROI 仍只在合作管理查看。

## TikTok API 接入边界

当前版本不会伪造 TikTok Partner API 数据。真实接入需要：

平台管理端可保存本地接入准备信息：client_key、OAuth Redirect URL、scope、最近检查时间；client_secret 不保存在前端。

1. Partner Center 已登录并有店铺 Affiliate 权限。
2. Partner App 已开通 Product、Affiliate、Messaging、Order 相关 scope。
3. 配置 OAuth Redirect URL。
4. 提供 client_key / client_secret。
5. 如果出现验证码、人机校验或 scope 审批缺失，需要人工在浏览器中处理。

详细交接见 `docs/TIKTOK_API_HANDOFF.md`。
