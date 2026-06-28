---
name: TikTok KOL SaaS Admin
colors:
  background: "#f4f7fb"
  surface: "#ffffff"
  surface-muted: "#f3f4f6"
  border: "#dfe5ef"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#64748b"
  primary: "#1f3faa"
  primary-strong: "#17308a"
  sidebar: "#ffffff"
  success: "#16a34a"
  warning: "#d97706"
  danger: "#dc2626"
  info: "#2563eb"
typography:
  fontFamily: "Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
  pageTitle: "24px / 32px, 600"
  sectionTitle: "18px / 26px, 600"
  body: "14px / 20px, 400"
  label: "12px / 16px, 500"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  base: "4px"
  pagePadding: "24px"
  gutter: "16px"
  tableRow: "48px"
---

## Visual Direction

干净、科技、克制、专业。参考 Proboost 店铺管理、Stripe Dashboard 的数据清晰度和 Attio 的 CRM 对象管理方式。采用浅色企业 SaaS 壳层、白色侧边栏、浅灰内容区、低对比描边和紧凑业务对象列表，不使用营销式大渐变、厚重投影或复古深色后台。

## Layout

后台采用固定左侧导航 + 顶部工具栏 + 主内容区。主内容区优先使用流程面板、筛选栏、对象列表、状态标签、指标卡和详情工作台。店铺授权成功后自动同步店铺和商品；建联、寄样和邀约环节只能从已同步商品中选择，避免手动录入造成数据源不一致。KOL 详情采用左侧资料卡 + 右侧沟通工作区；合作管理采用生命周期侧栏 + 内容追踪/直播追踪/ROI 分析模块。页面宽度按桌面后台设计，信息密度适中偏高。

## Components

- Sidebar: 浅色背景，当前模块用主色浅底强调。
- Buttons: 主按钮使用靛蓝色；次按钮使用白底描边；危险操作使用红色。
- Object lists: 店铺、商品、达人等业务对象优先用对象列表呈现，包含缩略图/头像、主信息、来源 ID、状态和行操作。
- Tables: 明细台账仍使用表格，表头浅灰背景，行高约 48px，支持复选框、头像、状态徽标、标签、行操作。
- Filters: 紧凑型输入框、下拉、多选标签筛选，统一放在表格上方。
- Badges: 胶囊型状态徽标，状态包括待回复、待KOL回复、合作中、待产出、已发视频、已直播、视频+直播、逾期未产出、有订单未匹配内容、合作结束。
- Empty states: 使用清晰中文说明和一个主行动按钮，不使用大插画。

## Product Boundaries

KOL 详情页只展示达人基础信息、联系方式、标签备注、沟通记录和合作记录入口。视频/直播产出统计、已产出/未产出、内容 GMV、订单数、佣金支出和 ROI 只在合作管理中呈现。

### 业务边界（与核心逻辑对齐，必须遵守）

- **当前版本形态**：单商家多店铺。一个商家账号下可绑定多个 TikTok Shop 店铺，团队分运营 / BD / 客服 / 管理员多角色，成员按可访问店铺隔离。服务商（一家公司服务多个商家）形态推迟到正式上线后的版本，本版不引入。
- **建联渠道只有三类**：TikTok 定向邀约（正式佣金邀约，主）、TikTok 私信（主跟进通道）、Email（BD 手动备用，不从私信自动升级）。不做 WhatsApp / Telegram 等渠道。
- **达人类型仅三种**：短视频达人、直播达人、短视频+直播达人。MCN 只能作为标签，不作为达人类型。
- **客户可见标签禁止出现**：`TikTok API`、`联盟达人`、`均播 ...`、`直播UV ...`，以及 `API / 接口 / payload / schema / 后端` 等技术实现词。
- **客户侧达人库为只读平台库**：不导入 CSV、不新增达人、不直接触发抓取；达人库按当前绑定店铺市场自动过滤，不让客户手选国家。
- **商品以 TikTok Shop 同步为准**：产品管理不允许本地手动新增或改写真实商品源；建联/寄样/邀约只能从已同步商品中选择。
