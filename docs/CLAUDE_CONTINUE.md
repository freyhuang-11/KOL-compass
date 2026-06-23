# Claude Continue

更新时间：2026-06-23 12:45 Asia/Shanghai

## 当前状态
- 项目目录：`D:\SamsoData\Documents\Kol compass`
- 前端端口：5175
- 后端端口：8015
- 本轮修复：达人库 TikTok 类目与 GMV 展示归一化。

## 本轮根因
- 类目重复/混乱：前端把系统中文类目和 TikTok 返回的 `categoryLabels` 原始本地化名称一起渲染，部分越南语标签未映射成中文。
- GMV 混乱：TikTok 返回值同时存在 `USD amount` 和 `1Mđ+` 这类 shorthand，展示层没有统一格式。

## 已处理
- `app.js`：新增前端类目归一化，避免筛选栏显示越南语原始类目。
- `app.js`：新增 GMV 展示归一化，去掉 `/月`，并把 `₫/đ` shorthand 统一成 `VND ...`。
- `server.js`：同步入库和读取旧达人数据时归一化 `category/categoryLabels/gmv`。
- `smoke-test.js`：补充类目和 GMV 回归断言。

## 验收结果
- `node --check app.js`：通过
- `node --check server.js`：通过
- `node --check smoke-test.js`：通过
- `node smoke-test.js`：通过
- `git diff --check`：通过，仅有 CRLF 提示
- `http://127.0.0.1:8015/api/health`：通过

## 下一步
- 如果用户要求本地币种金额统一，必须先确认换算口径：直接显示 TikTok API 返回币种，还是按店铺市场汇率换算。
