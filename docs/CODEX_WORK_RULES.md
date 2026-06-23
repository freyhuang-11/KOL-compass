# Codex 工作铁律

更新时间：2026-06-23

## 1. 报完成前必须跑真实数据

触发条件：任何涉及数据归一、字段映射、列表展示、统计聚合的改动。

必做：
- 从生产或 sandbox 数据拉取不少于 20 条真实记录，不能用 demo seed 代替。
- 跑改完的真实代码路径，输出统计：unique value 分布、格式异常 outlier、空值率。
- 把统计写进 commit message、acceptance report 或同轮交付说明。
- `smoke-test.js` 不能代替真实数据验证；它只证明基础渲染和关键入口不崩。

## 2. 数据归一必须在 ingest 时完成

原则：渲染层只显示 normalized 字段，不负责反复清洗脏数据。

要求：
- 类目同义词在导入时写入 normalized category 字段。
- GMV 在导入时拆成结构化金额和币种字段，例如 `gmv_value`、`gmv_currency`、`gmv_display`。
- 前端不得依赖临时过滤掩盖源头脏数据。

## 3. Scheduler / Worker / Batch Job 必须暴露真实指标

触发条件：任何后台定时任务、轮询、批量处理。

必做：
- 每次 run 写完整 metric：`attempted`、`succeeded`、`failed`、`skipped_reason_counts`、`nextRunAt`、`blocked_reason`。
- 保留至少 7 天 run 历史。
- 暴露 `GET /api/jobs/health`，返回最近 N 小时成功率、失败 top 3 原因、当前是否被 `nextRunAt` 挡住。
- 失败率超过 30% 时写 system message 提醒。

## 4. 修 bug 必须先复现和找根因

禁止直接猜原因并改代码。

必做：
- 复现：明确 endpoint、数据记录、期望结果、实际结果。
- 根因：commit message 里说明为什么会发生。
- 修复：只动跟根因相关的代码，不顺手重构。
- 验证：按复现步骤再跑一次，确认问题消失。

## 报完成前自检

每次说“改好了 / 验证通过 / 已推送”前，必须能回答：

1. 跑了什么：具体命令和输入数据。
2. 看到什么：具体数字、错误或截图。
3. 是否符合期望：不符合就不能算完成。
4. 下次是否还会再犯：会的话必须补规则、测试或监控。

## 场景排查清单

### 列表数据格式不一致

1. 查真实数据源是否已经混乱。
2. 检查 normalize 是否覆盖所有已知 enum / format。
3. 跑真实数据集并输出 unique values。
4. 写 fixture 或 smoke 断言锁住已知 outlier。

### Scheduler 跑了但产出少

1. 看 metric：是没跑，还是跑了失败。
2. 看 API response：429、36009002、empty result 要分开统计。
3. 看 `nextRunAt` 是否一直后推导致调度被挡。
4. 看 isolation key：同 `shop_cipher` 是否撞限流。

### 客户操作没生效

1. 看请求是否真的发到后端。
2. 看后端是否真的处理。
3. 看 DB / state 是否真的更新。
4. 看 response 是否被前端正确消费。

### 上次修过的问题又出现

1. 先判断上次是否只是 surface fix。
2. 查上次有没有 regression test。
3. 查上次 commit message 是否写清根因。
4. 从真实复现重新开始，不是直接再修一遍。
