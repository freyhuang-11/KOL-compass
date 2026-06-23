# Agent Continue

更新时间：2026-06-22 21:05 CST

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
- 保持建联流程：可同时 TikTok 私信 + Email；Email 未绑定时引导邮箱配置；邀请链接和翻译稿必须持久化。

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
