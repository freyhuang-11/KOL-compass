# Documentation Rotation Rules

更新时间：2026-06-22 21:05 CST

## 目的

避免记忆文档无限膨胀。文档只服务继续开发和验收决策，不记录每一次过程性聊天。

## 当前文件职责

- `docs/PROJECT_MEMORY.md`：当前事实、业务边界、外部 API 状态、风险。
- `docs/CLAUDE_CONTINUE.md`：下一步怎么继续、先跑什么、禁止做什么。
- `docs/ACCEPTANCE_REPORT.md`：最近一次验收结论和未完成项。
- `docs/archive/`：历史完整记录。

## 轮转规则

1. 单个当前文档超过 150 行时，必须先归纳再继续追加。
2. 一个阶段完成后，把详细过程移入 `docs/archive/YYYY-MM-DD-<topic>.md`。
3. 当前文档只保留会改变下一次决策的信息。
4. 截图、浏览器缓存、临时验证目录不得进入当前文档。
5. `.tmp-*`、`.data/`、`node_modules/` 不提交。

## 阶段摘要模板

```md
## YYYY-MM-DD <topic>

- 目标：
- 改动：
- 验证：
- 阻塞：
- 下一步：
```
