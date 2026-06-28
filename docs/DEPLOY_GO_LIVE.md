# KOL Compass 上线交接手册（Go-Live Runbook）

> 目的：把 Compass 从「本机 sandbox」搬到「公网 https」，过 TikTok 服务商审核，接入真实商家。
> 读者：**接手部署/开发的人（Dev/运维）** + **BD（在 TikTok Partner Center 操作的人）**。
> 维护：本文件随进度更新；每完成一项在 §10 勾掉。

---

## 1. 现状与目标

**现状**
- TikTok Partner Center 里是个**服务商「达人建联」服务，状态 = 草稿**；服务商注册审核已过 ✅，发品审核 / 应用审核未做、未发布。
- 系统当前连的是 **sandbox**（卖家/店铺名都是 `SANDBOX_*`，VN 市场），`.env.local` 是 sandbox 的 key/secret。
- 后端跑在 `127.0.0.1:8015`，前端 `127.0.0.1:5175`——**仅本机可达**。

**目标**：公网 `https://api.<域名>` 可达 → 过 TikTok 应用审核 → 真实 SG/MY 商家授权 → 真数据接通。

**阻断项（必须按序解决）**
1. 部署到公网 + 域名 + https（localhost 过不了审核，真实商家也回调不到）。
2. 拿到**生产** App 的 key/secret（现有是 sandbox 的，连不了真店）。
3. TikTok 完成发品审核 + 应用审核 + 发布送审 + 批准。
4. 补**入站收消息**（见 §7①），否则建联是单向的、自动回复触发不了。

---

## 2. 部署架构

```
互联网 ──https──> Caddy(80/443) ──┬── /            静态前端 (index.html/app.js/app.css)
                                  └── /api/*       反向代理 → 127.0.0.1:8015 (node server.js)
                                                   数据: .data/*.json   密钥: .env.local
```
- **反代 + 自动 HTTPS：Caddy**（自动申请/续期证书，最省事）。
- **常驻：pm2**（或 systemd）跑 `node server.js`。
- 备选 nginx + certbot（更繁琐，本手册以 Caddy 为准）。

---

## 3. 前置条件
- 一台 Linux 云主机（已具备），Node ≥ 18。
- 一个域名（已具备）。建议用子域名 `api.<域名>`。
- DNS：把 `api.<域名>` 的 **A 记录**指向服务器公网 IP。
- 安全组 / 防火墙**放行 80、443**（云厂商控制台里改；阿里/腾讯叫"安全组"）。

---

## 4. 部署步骤（命令级，cloud-agnostic）

> 下面用 `api.example.com` 占位，换成你的真实子域名。在服务器上以有 sudo 权限的用户执行。

**4.1 装运行环境**
```bash
# Node 18+（用 nodesource 或 nvm，二选一）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# pm2（进程常驻）
sudo npm i -g pm2

# Caddy（自动 https 反代）
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

**4.2 上传项目**
把整个 `Kol compass` 目录传到服务器，例如 `/opt/kol-compass`（用 scp / git clone 均可）。
> 仓库：`https://github.com/freyhuang-11/KOL-compass.git`（分支 `codex/kol-compass-mvp`）。`.data/` 和 `.env.local` 不在 git 里，需另传/新建。

**4.3 配 `.env.local`**（见 §5），放在 `/opt/kol-compass/.env.local`。

**4.4 起后端**
```bash
cd /opt/kol-compass
pm2 start server.js --name kol-compass-api
pm2 save && pm2 startup   # 开机自启
curl -s http://127.0.0.1:8015/api/health   # 应返回 configured:true
```

**4.5 配 Caddy**（`/etc/caddy/Caddyfile`）
```
api.example.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:8015
    }
    handle {
        root * /opt/kol-compass
        try_files {path} /index.html
        file_server
    }
}
```
```bash
sudo systemctl reload caddy
```
浏览器开 `https://api.example.com` 应能看到前端；`https://api.example.com/api/health` 应返回 JSON。Caddy 会自动签好证书。

---

## 5. 生产环境变量（`/opt/kol-compass/.env.local`）

```
TIKTOK_SHOP_APP_KEY=<生产App的key>
TIKTOK_SHOP_APP_SECRET=<生产App的secret>
TIKTOK_SHOP_REDIRECT_URI=https://api.example.com/api/tiktok/callback
KOL_COMPASS_FRONTEND_URL=https://api.example.com
KOL_COMPASS_API_PORT=8015
KOL_CREATOR_AUTO_IMPORT_ENABLED=false
```
- key/secret 用**生产** App 的，**不是现在 sandbox 那套**（先把 sandbox 的备份一份）。
- ⚠️ `KOL_CREATOR_AUTO_IMPORT_ENABLED=false`：送审/上线初期**务必关**。否则一连真 API，后台每 5 秒就狂拉达人搜索，瞬间烧配额、触发限流。验证期手动拉。
- **前端必改项**：`app.js` 顶部 `const API_BASE = "http://127.0.0.1:8015";` 改成 `"https://api.example.com"`（否则前端还指向本机）。改完同步 bump `index.html` 的 `?v=`。

---

## 6. TikTok Partner Center 上线步骤（**BD 操作**）

1. 进 [Partner Center](https://partner.tiktokshop.com/) → 你的「达人建联」服务/App。
2. 把 **OAuth 回调**设为 `https://api.example.com/api/tiktok/callback`（和 §5 一致）。
3. 完成「发布检查清单」：
   - **发品审核**：填你这个服务在 TikTok 应用市场展示的信息。
   - **应用审核**：TikTok 会测你的应用功能（这就是为什么必须先公网可达）。
4. 点右上 **发布** → 送审 → 等 TikTok 批准（这步是 TikTok 审，要等）。
5. 批准后：真实 SG/MY 商家在系统点「绑定店铺」→ TikTok 同意页授权 → 拿到生产 token → 真数据接通。

---

## 7. 还需开发补全（交 Dev，按优先级）

1. **入站收消息（闭环必需）** —— 现在只有出站（`createCreatorConversation` 建会话 / `sendCreatorImMessage` 发消息），**入站没实现**。TikTok 侧支持：affiliate「会话列表」+「Get Conversation Messages」+「消息事件 webhook」。要做：拉取/接收达人来信 → 落到对应达人会话（前端 `creatorMergedThread` 已能按达人合并）→ 状态推进「待我方处理」→ 触发自动回复（前端 `autoReplyMatches`：来信先翻译成中文再匹配中文关键词，已就绪）。
   文档参考：[Affiliate Seller API overview](https://partner.tiktokshop.com/docv2/page/6697960798b0a502f89e3d00) · [Get Conversation Messages](https://partner.tiktokshop.com/docv2/page/get-conversation-messages-202309) · [Customer Engagement API overview](https://partner.tiktokshop.com/docv2/page/customer-engagement-api-overview)。版本号（202508/202412 等）以 Partner Center 实测为准。
2. **寄样走 API** —— 达人申请样品 → 商家审核 → 发货运单，替换当前本地台账（前端寄样手动新增已去掉，等 API 回填）。
3. **订单 / ROI 归因** —— 接 affiliate 订单 API，做 GMV/出单归因（合作管理现为手填）。
4. **多租户**（仅当要做真·服务商多商家）—— 账号体系 + 数据隔离 + 切 DB（现 localStorage + JSON 文件 → SQLite/Postgres）。单商家自用可暂缓。
5. **翻译服务换正式** —— 现 MyMemory 免费额度全站共享，用尽客户也会看到「额度已用完」。换自建 LibreTranslate 或商用 API。详见 `docs/BACKLOG.md`。

---

## 8. 分工表

| 谁 | 做什么 |
|---|---|
| **BD（你）** | Partner Center：注册回调 / 发品审核 / 应用审核 / 点发布 / 真商家授权时点「同意」 |
| **Dev（接手人）** | 服务器部署（§4）+ Caddy/https + `.env.local`（§5）+ 改前端 `API_BASE` + §7 待开发项 |
| **我（Claude）** | 本手册维护、产品侧前端/逻辑改动、改完跑 smoke、验证 |

---

## 9. 上线后冒烟清单
- `https://api.example.com/api/health` → `configured:true`、`missing:[]`。
- 真商家绑店后：`/api/tiktok/shops` 返回真实店（**不再是 `SANDBOX_*`**）、商品/达人返回真数据。
- 出站建联：**只做 1~2 条受控测试**（你逐条确认），验证私信真出站——**绝不批量**（新店首周配额 ≤1000，且发的是真实达人、不可撤）。
- 入站补好后：模拟达人回复，验证能进会话 + 命中自动回复。

---

## 10. 进度勾选
- [ ] DNS：`api.<域名>` 指向服务器
- [ ] 安全组放行 80/443
- [ ] 部署后端 + pm2 常驻
- [ ] Caddy 反代 + https 生效
- [ ] 前端 `API_BASE` 改公网 + bump 版本
- [ ] `.env.local` 填生产 key/secret + 关 auto-import
- [ ] Partner Center 注册生产回调
- [ ] 发品审核 / 应用审核 / 发布送审
- [ ] TikTok 批准
- [ ] 真商家授权、冒烟通过
- [ ] 入站收消息开发完成（§7①）
