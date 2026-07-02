# KOL Compass 建联前采集器（Chrome 扩展）

把 BD 已登录的 TikTok 页面上的达人**内容信号**（粉丝/简介/近期内容文案/内容主题）采集回 Compass 达人库——补足 TikTok 官方 API 拿不到的"内容契合"维度，是「建联前分析」的核心数据来源。

## 为什么需要它
- TikTok Affiliate 官方 API 只给粉丝/GMV/类目等结构化字段，**拿不到达人近期到底在发什么内容、内容和商家品类契不契合**。
- 这部分只能在 BD 自己登录的浏览器里、从达人公开主页读取。扩展就干这件事：**限速、只读当前在看的那一个达人页、绑定真实 BD 工作流**，不做后台批量爬。

## 安装（开发版 / 未打包）
1. Chrome 地址栏进 `chrome://extensions`，右上角打开「开发者模式」。
2. 点「加载已解压的扩展程序」，选本目录 `extension/`。
3. 确认 Compass 后端在跑（默认 `http://127.0.0.1:8015`）。

## 用法
1. 在浏览器打开任意 TikTok 达人主页：`https://www.tiktok.com/@用户名`。
2. 点扩展图标 → 弹窗显示识别到的达人（粉丝、内容条数、主题标签）。
3. 点「采集该达人到 Compass」→ 数据进达人库（按 username 合并，不覆盖已有联系方式）。
4. 可勾选「浏览达人页时自动采集」（同一达人 60 秒限速一次）。
5. 弹窗里可改 Compass 后端地址。

## 采到什么字段
`username / nickname / followers / likes / bio / recentCaptions[] / contentTopics[] / sourceUrl / capturedAt`
→ Compass `POST /api/creators/ingest`（`librarySource:"extension"`）→ 并入达人库。

## 边界与维护
- **DOM 依赖**：TikTok 前端会改版，`content.js` 用 `data-e2e` 选择器为主并留降级；改版后可能要更新选择器（这是这类工具的固有维护成本）。
- **合规**：仅采集 BD 当前正在浏览的公开主页、限速、绑真实工作流；不抓私信、不抓非公开数据、不批量后台爬。
- **下一步（未做）**：内容主题 vs 当前商家商品类目的**契合度评分**（把"通用粉丝数"升级成"契合你这个商品"），接进达人库潜力分；近期视频早期表现（为投流决策卡备料）。

## 文件
- `manifest.json` — MV3 配置
- `content.js` — TikTok 主页抽取（限速、降级）
- `background.js` — POST 到 Compass ingest
- `popup.html` / `popup.js` — 采集面板 + 设置
