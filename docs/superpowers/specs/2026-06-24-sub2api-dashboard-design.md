# sub2api 只读 Dashboard 设计

## 背景

这个仓库用于维护一个独立的 `sub2api` 管理数据浏览面板。GitHub 只用于源码管理，不用于页面托管。Dashboard 最终会部署在 `sub2api` 同一台服务器上，而不是 GitHub Pages。

上游 `sub2api` 代码只作为本地参考，放在 `.upstream/sub2api`，并通过 `.gitignore` 排除，不会提交到本仓库。

## 目标

构建一个只读 Web Dashboard，聚焦两个 admin 场景：

- 订阅管理浏览
- 账户管理浏览，重点展示总账户/API 账户的用量

界面风格尽量贴近 `sub2api` 现有 Admin：紧凑表格行、浅色背景、绿色状态徽标、小型平台/类型标签、用量进度条、右侧操作区。

## 非目标

第一版不提供写操作：

- 不编辑
- 不删除
- 不撤销订阅
- 不重置配额
- 不切换调度状态
- 不分配订阅
- 不刷新账户凭据

这个 Dashboard 是浏览和监控窗口。可以保留低风险操作，例如刷新、搜索、筛选、排序、分页，以及打开只读详情面板。

## 部署模型

构建后的前端部署在 `sub2api` 同一台服务器，例如：

```text
https://example.com/dashboard/
```

服务器提供一个 Dashboard 专用反向代理路径：

```text
/dashboard-api/* -> http://127.0.0.1:<sub2api-port>/api/admin/*
```

Admin token 必须只保存在服务器侧。浏览器不接收、不保存 admin token。Nginx、Caddy 或其他本地代理负责注入 admin 认证请求头。

## 数据来源

通过代理路径复用上游现有 admin API。

订阅相关：

- `GET /dashboard-api/subscriptions`
- 可选增强：`GET /dashboard-api/subscriptions/{id}/progress`

账户相关：

- `GET /dashboard-api/accounts`
- `GET /dashboard-api/accounts/{id}/usage`
- `GET /dashboard-api/accounts/batch-today-stats`，或当前部署版本中等价的上游接口

实现时应把 API 访问集中在一个小型客户端模块中，方便后续适配上游接口变更。

## 订阅视图

订阅表参考上游 `SubscriptionsView.vue` 的概念：

- 用户身份：邮箱或用户名，带首字母头像
- 分组或套餐标签
- 用量窗口：在存在限额时展示每日、每周、每月用量
- 到期时间：日期和剩余天数
- 状态：`active`、`expired`、`revoked`
- 只读操作：查看详情、复制相关标识、必要时刷新单行

订阅状态不能复用到账户状态上。

## 账户视图

账户表参考上游 `AccountsView.vue` 的概念：

- 名称和次级身份，例如邮箱或账户元数据
- 平台/类型标签：`openai`、`anthropic`、`gemini`、`antigravity`；`oauth`、`apikey`、`setup-token` 等
- 容量指标：并发、窗口费用上限、会话数、RPM、每日/每周/总配额等，按字段存在情况展示
- 账户状态使用上游语义：
  - `status`：`active`、`inactive`、`error`
  - 运行时受限状态：限流中、过载中、临时不可调度
  - `schedulable`：以只读开关状态展示是否参与调度
  - 到期时间和 `auto_pause_on_expired`
- 今日统计：请求数、Token 数、账户成本、用户/API Key 计费成本
- 用量窗口：5h、7d、Sonnet 或其他平台特定窗口，按上游数据展示
- 只读操作：查看详情、复制标识、刷新用量

账户状态和订阅状态只共享表格布局模式，不共享状态文案和状态判断逻辑。

## UI 结构

首屏直接展示可用 Dashboard，不做落地页。

布局：

- 左侧导航，贴近 `sub2api` Admin 区域结构
- 顶部工具栏，包含标题、搜索、筛选和刷新
- 顶部汇总条，展示关键只读计数
- Tab 或分段控件：
  - 订阅管理
  - 账户管理
  - 用量记录，后续迭代可选
- 高密度、便于横向扫读的表格
- 只读详情抽屉或弹窗，用于查看行详情

避免大面积装饰卡片或营销式 Hero。整体应是运维/管理后台风格。

## 错误处理

需要清晰展示以下状态：

- 代理或 API 不可用
- 服务器侧 token 被拒绝或未授权
- 空结果
- 部分失败，例如账户列表加载成功，但账户用量窗口加载失败
- 加载中或刷新中

错误信息不能暴露 admin token。

## 安全要求

前端在构建时和运行时都不能包含 admin token。

部署 README 需要说明：

- 如何配置反向代理
- admin token 放在服务器哪里
- 为什么 GitHub Pages 和前端环境变量不适合保存这个 token

## 测试与验证

实现阶段应包含：

- 类型检查或构建验证
- API 客户端测试，确保上游响应能正确映射为视图模型
- 组件测试，重点覆盖账户状态优先级
- 浏览器手动预览，检查桌面宽度和较窄屏幕下的展示

账户状态优先级需要测试：

1. 过载中
2. 限流中
3. 临时不可调度
4. 错误
5. 不可调度
6. 停用
7. 正常

这个顺序用于在监控视图中优先暴露运行时阻塞状态，再展示基础状态。
