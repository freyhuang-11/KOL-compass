# Acceptance Report

更新时间：2026-06-22 21:05 CST

## 最近验收结论

当前版本可用于本地继续验收，但还不是完整生产版。主要差距在真实外部账号授权、TikTok 达人库全量回填节流、后端持久化和正式消息发送通道。

## 最近通过的验证

```bat
node --check app.js
node --check server.js
node --check smoke-test.js
node smoke-test.js
```

## 最近已验收范围

- 商品同步：TikTok sandbox 商品可同步，图片、价格、库存、状态可显示。
- 达人库：读取平台达人库，客户侧不导入、不抓取，按当前店铺市场过滤。
- 达人字段：隐藏 API 技术标签；达人类型收敛为三种；MCN 仅为标签。
- 达人 GMV：展示 TikTok 返回的币种和格式，不自行换算，不加 `/月`。
- KOL 详情：头像与列表同步；不展示合作产出和经营指标。
- 建联：支持 TikTok 私信和 Email 多渠道；Email 未绑定时引导配置；邀请链接和翻译稿持久化。
- 分页批量选择：达人库支持本页全选、筛选结果全选、清空选择、分页和每页数量切换。

## 未完成/需继续验收

- TikTok 达人搜索后台任务需要更稳的节流和退避。
- SG / MY / TH / PH 需要真实授权店铺后才能回填对应市场达人。
- Email SMTP/IMAP、WhatsApp Business、TikTok 私信真实发送尚未完成生产接入。
- `app.js` 需要模块化拆分，降低维护风险。

## 历史验收归档

完整历史验收记录见：

- `docs/archive/ACCEPTANCE_REPORT_2026-06-22.full.md`
