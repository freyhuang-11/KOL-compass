# KOL Compass Project Memory

## Codex 工作铁律

- 后续开发和验收必须遵守 `docs/CODEX_WORK_RULES.md`。
- 涉及数据归一、字段映射、列表展示、统计聚合时，`smoke-test.js` 不能代替真实数据验证；完成前必须拉不少于 20 条真实 production/sandbox 数据跑真实代码路径并输出统计。
- 数据归一必须在 ingest 阶段完成，渲染层只显示 normalized 字段。
- scheduler / worker / batch job 必须暴露 run metric 和 `GET /api/jobs/health`。
- 修 bug 必须先复现、写清根因，再做最小修复和复测。

更新时间：2026-06-22 21:05 CST

## 工作边界

- 只在 `D:\SamsoData\Documents\Kol compass` 开发。
- 禁止触碰 `D:\tiktok-creator-tool`。
- 本项目端口：前端 `5175`，后端 `8015`。
- 禁止占用或关闭 `5173` / `5174`。

## 当前版本状态

- 分支：`codex/kol-compass-mvp`
- 远端：`https://github.com/freyhuang-11/KOL-compass.git`
- 启动：`start-full.bat`
- 冒烟测试：`node smoke-test.js`

## 已确认产品边界

- 客户主流程：绑定 TikTok Shop 店铺 -> 同步商品 -> 进入达人库筛选 -> 发起建联 -> 建联记录/合作管理跟进。
- 达人库是平台库，客户侧不导入 CSV、不新增达人、不直接触发全量抓取。
- 达人库按当前绑定店铺市场自动过滤，不让客户手选国家。
- 达人类型只允许：`短视频达人`、`直播达人`、`短视频+直播达人`。
- `MCN达人` 只能作为标签，不作为达人类型。
- 客户可见标签不得出现 `TikTok API`、`联盟达人`、`均播 ...`、`直播UV ...`。
- 内容产出、视频、直播、GMV、订单、佣金、ROI 只放在合作管理，不放在 KOL 详情。
- 商品数据以 TikTok Shop API 为准；产品管理不允许本地手动新增或改写真实商品源。

## TikTok API 当前事实

- OAuth sandbox 已跑通，当前授权店铺为 `SANDBOX_VN7651055422359521044`，市场 `VN`。
- 商品同步可用，已能读取商品图片、价格、库存和状态。
- 达人搜索接口：`POST /affiliate_seller/202508/marketplace_creators/search`。
- 达人搜索 `page_size` 只能使用 `12` 或 `20`。
- TikTok rate limit 没有公开固定 QPS；官方说明为按隔离单元动态分配。
- `36009002` 表示 TikTok 下游限流，不是系统代码错误。
- 全量达人库必须由平台后台分页任务维护，客户页面只能查本地平台库。
- 达人任务调度器默认每 5 秒检查一次；正常请求每次只抓 1 页、每页间隔 5 秒；遇到 `36009002` 后写入 `nextRunAt` 并按 1 分钟、2 分钟、5 分钟、10 分钟退避续跑。
- TikTok 不返回 `next_page_token` 只代表当前搜索条件分页结束，不代表该国家达人全量抓完；当前会 10 分钟后刷新当前搜索。要继续扩大达人库，下一步必须做 TikTok 类目/筛选条件分片抓取。

## 当前本地数据原则

- `.data/` 存储本机运行数据与 token，已被 git 忽略。
- 内置演示数据已清空；后续教程页需要演示数据时单独加载，不混入正式业务库。
- 旧 localStorage 演示数据通过 `demoDataClearedVersion=2` 清理。

## 最近验收

- `node --check app.js` 通过。
- `node --check server.js` 通过。
- `node --check smoke-test.js` 通过。
- `node smoke-test.js` 通过。

## 当前风险

- `app.js` 已接近 180KB，需要下一阶段模块化拆分，但不应在用户验收关键路径中临时大拆。
- 平台达人库全量回填受 TikTok 下游限流影响；当前策略是不停任务，只按 `nextRunAt` 节流续跑。

## 历史归档

完整历史已归档到：

- `docs/archive/PROJECT_MEMORY_2026-06-22.full.md`
- `docs/archive/AGENT_CONTINUE_2026-06-22.full.md`
- `docs/archive/ACCEPTANCE_REPORT_2026-06-22.full.md`
