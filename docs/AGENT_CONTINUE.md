# Agent Continue

> ⚠️ **方向已更新（2026-06-28）**：下方"当前优先级 P0/P1"是旧的（继续做建联/达人搜索/拆 app.js），**已被 `docs/STRATEGY.md` 取代**。新核心 = 建联前分析（选对人）+ 建联后管理（投流决策/深度跟踪/数据）。技术铁律仍有效，但**功能优先级以 STRATEGY.md 为准**，别再默认"继续打磨建联"。

## 必读工作铁律

- 每次继续前先读 `docs/CODEX_WORK_RULES.md`。
- 数据归一、字段映射、列表展示、统计聚合类改动，完成前必须跑不少于 20 条真实 production/sandbox 数据并输出统计；不能只用 `smoke-test.js`。
- 修 bug 先复现、找根因、最小修复、按复现路径复测。
- 不要把每个小改都变成完整验收。默认节奏是：影响点确认 -> 实现 -> 最小验证 -> 提交；只有准备交付给用户验收或报完成时，才做完整验收说明。
- 发现范围外问题时先记录，不顺手扩大本轮任务；除非它会直接导致当前功能不可用或误报成功。

更新时间：2026-06-23 18:30 CST

## 每次继续前先确认

1. 当前目录必须是 `D:\SamsoData\Documents\Kol compass`。
2. 不进入、不读取、不修改 `D:\tiktok-creator-tool`。
3. 不占用 `5173` / `5174`。
4. 先看 `docs/PROJECT_MEMORY.md` 和 `docs/DOC_ROTATION.md`。
5. 完成可验证阶段后运行 `node smoke-test.js`。

## 当前优先级

P0：

- 达人搜索后台任务保持 5 秒巡检；正常每次 1 页、页间隔 5 秒；限流后按 `nextRunAt` 退避续跑，不能停止任务。
- 不要把 `next_page_token` 为空解释成“国家达人抓完”。它只表示当前搜索条件游标结束；后续要实现类目/筛选条件分片抓取。
- 继续保证达人库只读平台库，客户侧不暴露导入/抓取入口。
- 保持建联流程：`TikTok定向邀约`、`TikTok私信`、`Email` 已拆成独立建联记录；定向邀约只提交 Target Collaboration，私信只提交 IM，Email 只提交 SMTP。Email 未绑定时引导邮箱配置；翻译稿必须持久化。

P1：

- 按业务边界拆分 `app.js`，优先拆：数据层、TikTok API 适配、达人库、建联、合作管理。
- 拆分时每一步都跑冒烟测试，不做大范围无验证重构。

## 当前可运行命令

启动前后端：

```bat
start-full.bat
```

只启动前端：

```bat
start-5175.bat
```

只启动后端：

```bat
start-api-8015.bat
```

冒烟测试：

```bat
node smoke-test.js
```

## Git 规则

- 小步 commit。
- commit 前必须跑可用的语法检查和 `node smoke-test.js`。
- push 失败就记录阻塞，不假装成功。

## 文档规则

- `PROJECT_MEMORY.md` 只保留当前决策需要的信息。
- `AGENT_CONTINUE.md` 只保留下一步执行信息。
- `ACCEPTANCE_REPORT.md` 只保留最近一次验收结果。
- 历史超过一个阶段就归档到 `docs/archive/`。
