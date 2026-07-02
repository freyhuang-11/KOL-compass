# KOL Compass 达人库采集器（内部）

**仅 Samso 运营团队用，不发 B 端客户。** 客户用的是 `../extension/`（建联前体检）。

## 干什么
在卖家后台**达人广场**（`affiliate.tiktok.com/connection/creator`）**直接调用页面自己的达人接口**，把返回的达人自动回流到 Compass 后端，扩大达人库广度。
- 页面登录后自己发的 `creator/marketplace/find` 请求已带浏览器签名（msToken/X-Bogus/X-Gnarly，全在 URL）。采集器拿到这个带签名的 URL 后，直接反复 POST 它翻页/轮换。
- 只读运营本人登录会话里页面已经在用的接口，不自己签名、不爬别人。
- 官方 partner API 找达人封顶 ~2617；这套通过网页接口轮询能捞到更多。

## 架构（2026-07-01 重写：接口轮询，不再滚 DOM）
- `market-inject.js`（MAIN 世界）：钩住页面的 find 请求记住带签名 URL → **每 ~1.6s 直接 POST 一次接口翻页/轮换** → 回流。**不滚动页面、不堆卡、不卡死。**
- `harvester.js`（隔离世界）：解析 `creator_profile_list` → 去重 → 发给 background；右下角面板显示已采数 + 暂停/继续。
- `background.js`：POST 到 `http://127.0.0.1:8015/api/creators/ingest-marketplace`。

## 怎么用
1. `chrome://extensions` → 开发者模式 → 加载已解压的扩展 → 选本 `harvester/` 文件夹。
2. **每次重载扩展后，必须 F5 达人广场页面**（否则页面上是失效的旧脚本）。
3. F5 后页面会自动发一个 find（带签名）→ 采集器接管，右下角面板「本会话已采 N 位」持续上涨。
4. 想临时停 → 点面板 **⏸ 暂停采集**；恢复 → **▶ 继续采集**。彻底停 = 关标签页/关扩展。
5. 面板提示「已 Ns 没采到新人」= 推荐池这一轮采得差不多了，可暂停。

## 关键接口/字段（2026-07-01 真机验证）
- 列表：`POST /api/v1/oec/affiliate/creator/marketplace/find`（签名全在 URL query，只签 URL）→ `creator_profile_list[]` + `next_pagination.{has_more,next_page,search_key,next_item_cursor}` + `code`(0=success)。
- 翻页 body：`{pagination:{size:20,page,search_key,item_cursor}}`；`has_more=false` 重置 `page:1` 重开一轮。
- 每字段是 `{value,...}` 取 `.value`；`category.value` 是**数组** → 取第一个 `.name`，后端 EN→中文归一。
- 回流端点：`POST http://127.0.0.1:8015/api/creators/ingest-marketplace`（librarySource=marketplace）。

## 已知限制 / 待办
- **类目筛选**字段还没试对（要抓一次"手动勾类目"后页面发的请求看确切 body）。做通后可按类目分片、突破推荐池采全量。
- 签名可能有 TTL：连续报错时面板会提示「可能签名过期，F5 刷新」。
