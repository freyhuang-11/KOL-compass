# Claude Code 继续开发指令

## 工作位置

只在本目录开发：

`D:\SamsoData\Documents\Kol compass`

禁止进入或修改：

`D:\tiktok-creator-tool`

原因：那是用户另一个项目，并且占用 `5173` / `5174`。

## 端口

本项目默认使用：

`http://127.0.0.1:5175`

不要占用 `5173` / `5174`。

## 当前状态

当前已实现一个本地可运行的静态后台版本：

- `index.html`
- `app.css`
- `app.js`
- `start-5175.bat`
- `stop-5175.bat`
- `smoke-test.js`

最近一次心跳检查：2026-06-21 23:14 CST，当前分支已连接 GitHub 远端，`node --check app.js` 与 `node smoke-test.js` 通过。本轮新增系统消息同步日志，用于展示 API/同步状态、失败原因和时间。

启动：

```bat
start-5175.bat
```

验收：

```bat
node smoke-test.js
```

## 不要做的事

不要重新做设计检测。

Stitch 风格已经确认，开发阶段只需要做：

1. 功能验收：页面能打开、按钮能用、数据能保存、路由能直达。
2. 业务边界验收：内容追踪只在合作管理；KOL详情不展示产出和经营指标。
3. 接入边界验收：TikTok API 未授权时必须给出明确状态，不伪造真实同步成功。

## 必须保持的业务边界

KOL详情页只能展示：

- 基础资料
- 联系方式
- 标签备注
- 沟通记录
- 合作记录入口

KOL详情页不能展示：

- 视频
- 直播
- GMV
- 订单
- 佣金
- ROI
- 已产出 / 未产出
- 内容追踪

以上字段只允许出现在“合作管理”。

## 下一步开发优先级

P0：

1. 保持 `smoke-test.js` 全绿。
2. 保持产品管理可用：
   - 支持关键词搜索
   - 支持类目、状态、合作模式筛选
   - 未授权 TikTok Partner API 时只展示本地数据和明确提示，不伪造同步成功
3. 补齐各页面的新增/编辑/删除闭环，不只是展示。
4. 把“合作管理”作为内容追踪主工作台继续增强：
   - 达人/产品/负责人/备注搜索
   - 已产出 / 未产出筛选
   - 固定标签 + 自定义标签
   - 逾期未产出检查
   - 有订单未匹配内容的处理动作
   - 催发、结束、删除等操作必须真实更新本地状态
5. 保持 KOL 池批量建联闭环：
   - 关键词、达人类型、类目、地区、粉丝量级、回复率区间筛选
   - 勾选达人
   - 一键建联
   - 选择产品/模板/渠道
   - 定时发送记录
   - 附加邀请链接时自动进入合作管理
6. 保持沟通闭环：
   - 达人编辑弹窗可录入 Email / WhatsApp
   - 建联记录可按达人/产品/消息关键词、沟通状态、渠道筛选
   - 建联记录可直接回复
   - KOL 详情沟通记录可直接回复
   - 回复后沟通状态回到待达人回复
   - 消息模板可新增、编辑、删除，并保留变量提示
7. 增强数据持久化：
   - 当前使用 localStorage
   - 后续如果需要后端，新增本项目自己的后端端口，例如 `8015`
   - 不接入 `D:\tiktok-creator-tool` 的后端

P1：

1. 保持 TikTok API 配置页面的字段保存：
   - client_key
   - redirect_url
   - scope 状态
   - last_sync_at
   - client_secret 不允许保存到前端 localStorage
2. “同步日志”视图已实现，位于系统消息页；后续接真实 API 时继续复用该日志展示同步失败原因。
3. 增加 CSV 导入 KOL / 合作记录。
   - 已有 `importCreatorsCsv` / `importCoopsCsv`
   - 后续增强时必须保持 `smoke-test.js` 里的 CSV 导入检查通过

P2：

1. 真正接入 TikTok Partner API。
2. 接入前必须先读 `docs/TIKTOK_API_HANDOFF.md`。
3. 如果遇到登录、验证码、scope 审批、OAuth 授权页，需要停下来给用户操作流程。

## 完成前必须跑

```bat
node smoke-test.js
```

## 记忆与 GitHub 提交规则

每次心跳或阶段性开发后，必须先更新：

- `docs/PROJECT_MEMORY.md`
- `docs/CLAUDE_CONTINUE.md`

记录内容只写会影响继续开发和验收的信息：

- 当前可运行状态
- 已验证命令
- 阻塞项
- 下一步
- GitHub 远端和授权状态

GitHub 提交流程：

1. 先跑 `node smoke-test.js`。
2. 确认只在 `D:\SamsoData\Documents\Kol compass`。
3. 如果存在 `origin` 且 GitHub 授权可用，按小步提交。
4. 如果 push 失败或授权过期，不要假装推送成功，写入阻塞项并等待用户处理。
5. 当前已复查：`origin` 为 `https://github.com/freyhuang-11/KOL-compass.git`。

如果有 UI 改动，使用 Edge headless 重新生成截图：

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --window-size=1440,1000 --screenshot="smoke-dashboard.png" "http://127.0.0.1:5175/#dashboard"
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --window-size=1440,1000 --screenshot="smoke-cooperations.png" "http://127.0.0.1:5175/#cooperations"
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --window-size=1440,1000 --screenshot="smoke-kol-detail.png" "http://127.0.0.1:5175/#kol/creator/1"
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --window-size=1440,1000 --screenshot="smoke-messages.png" "http://127.0.0.1:5175/#messages"
```
