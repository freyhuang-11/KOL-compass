---
name: TikTok KOL SaaS Admin
colors:
  background: "#f8f9fa"
  surface: "#ffffff"
  surface-muted: "#f3f4f6"
  border: "#e5e7eb"
  text-primary: "#111827"
  text-secondary: "#4b5563"
  text-muted: "#6b7280"
  primary: "#3f51b5"
  primary-strong: "#24389c"
  sidebar: "#1e293b"
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

干净、科技、克制、专业。参考 Stripe Dashboard 的数据清晰度和 Attio 的 CRM 对象管理方式。采用浅色后台，深色侧边栏，白色内容面板，低对比描边，不使用装饰性大渐变或厚重投影。

## Layout

后台采用固定左侧导航 + 顶部工具栏 + 主内容区。主内容区优先使用表格、筛选栏、状态标签、指标卡和右侧详情抽屉。页面宽度按 1280px 桌面后台设计，信息密度适中偏高。

## Components

- Sidebar: 深色背景，当前模块用主色强调。
- Buttons: 主按钮使用靛蓝色；次按钮使用白底描边；危险操作使用红色。
- Tables: 表头浅灰背景，行高约 48px，支持复选框、头像、状态徽标、标签、行操作。
- Filters: 紧凑型输入框、下拉、多选标签筛选，统一放在表格上方。
- Badges: 胶囊型状态徽标，状态包括待回复、待KOL回复、合作中、待产出、已发视频、已直播、视频+直播、逾期未产出、有订单未匹配内容、合作结束。
- Empty states: 使用清晰中文说明和一个主行动按钮，不使用大插画。

## Product Boundaries

KOL 详情页只展示达人基础信息、联系方式、标签备注、沟通记录和合作记录入口。视频/直播产出统计、已产出/未产出、内容 GMV、订单数、佣金支出和 ROI 只在合作管理中呈现。
