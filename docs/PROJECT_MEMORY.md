# KOL Compass 项目记忆

更新时间：2026-06-21 19:14 CST

## 当前工作目录

只允许在以下目录继续：

`D:\SamsoData\Documents\Kol compass`

禁止触碰：

`D:\tiktok-creator-tool`

原因：那是用户的另一个项目，并且占用 `5173` / `5174`。

## 当前可运行版本

本项目当前是本地静态后台版本，默认端口：

`http://127.0.0.1:5175`

当前 Git 分支：

`codex/kol-compass-mvp`

启动：

```bat
start-5175.bat
```

验收：

```bat
node smoke-test.js
```

## 本轮已确认

- `node --check app.js` 通过。
- `node smoke-test.js` 全部通过。
- 产品管理截图 `smoke-products.png` 已生成并目视检查通过。
- 合作管理截图 `smoke-cooperations.png` 已重新生成并目视检查通过。
- 建联记录截图 `smoke-outreach.png` 已生成并目视检查通过。
- KOL 池截图 `smoke-kol-pool.png` 已重新生成并目视检查通过。
- KOL 详情截图 `smoke-kol-detail.png` 已重新生成并目视检查通过。
- 寄样管理截图 `smoke-samples.png` 已生成并目视检查通过。
- `5175` 是本项目端口。
- `5173` / `5174` 不属于本项目，不能占用或关闭。
- KOL 详情页不展示内容产出、视频、直播、GMV、订单、佣金、ROI。
- 内容追踪只放在合作管理。
- 产品管理已支持按产品关键词、类目、状态、合作模式筛选，并明确提示真实数据来自 TikTok Shop Partner API。
- KOL 池已支持按关键词、达人类型、类目、地区、粉丝量级、回复率区间筛选。
- KOL 池和合作管理已支持 CSV 导入。
- KOL 池已支持勾选达人、一键建联、选择产品/模板/渠道、定时发送记录和附加邀请链接。
- 达人联系方式已支持在编辑弹窗录入 Email / WhatsApp。
- 建联记录和 KOL 详情沟通记录已支持直接回复，回复后状态回到待达人回复。
- 本地数据支持 JSON 导入/导出。
- 建联记录已支持：标记已回复、安排寄样、进入合作、关闭、删除。
- 寄样管理已支持：新增/更新寄样、删除、已签收后进入合作。

## 当前硬阻塞

GitHub 推送暂时不可执行：

- 当前仓库没有配置 `origin` 远端。
- 当前机器没有可用的 `gh` 命令。
- 用户提示“git已连接”后已多次复查，`git remote -v` 仍为空，需要在本目录重新确认远端地址。

要完成“提交 GitHub”，需要用户先处理其中一种路径：

1. 安装并登录 GitHub CLI：

```bat
winget install --id GitHub.cli
gh auth login
```

2. 或者直接提供 GitHub 仓库地址，然后执行：

```bat
git remote add origin <repo-url>
git push -u origin <branch>
```

## 下次继续优先级

1. 继续保持 `docs/PROJECT_MEMORY.md` 和 `docs/CLAUDE_CONTINUE.md` 最新。
2. 每次阶段完成后先跑 `node smoke-test.js`。
3. 有远端和 GitHub 授权后，小步提交并推送。
4. TikTok Partner API 接入前先读 `docs/TIKTOK_API_HANDOFF.md`，遇到 OAuth、验证码、scope、redirect URL 问题时给用户操作流程。
