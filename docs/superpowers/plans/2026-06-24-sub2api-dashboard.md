# sub2api 只读 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个部署在 `sub2api` 同服务器上的只读 Dashboard，用于浏览订阅管理和账户管理用量。

**Architecture:** 使用独立 Vue 3 + Vite 前端，所有浏览器请求走相对路径 `/dashboard-api/*`，由服务器反向代理注入 admin token。前端只做只读数据获取、状态映射、筛选搜索和详情展示，不包含任何写接口调用。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest、@vue/test-utils、CSS Modules/普通 CSS、原生 fetch API。

---

## 文件结构

- Create: `package.json`  
  定义 Vue/Vite 项目的脚本、依赖和测试命令。
- Create: `index.html`  
  Vite 入口 HTML。
- Create: `tsconfig.json`、`tsconfig.node.json`、`vite.config.ts`、`vitest.config.ts`  
  TypeScript、Vite、Vitest 配置。
- Create: `src/main.ts`、`src/App.vue`、`src/style.css`  
  应用入口、主布局、全局样式。
- Create: `src/api/client.ts`、`src/api/dashboard.ts`  
  只读 API 客户端和 dashboard 数据接口。
- Create: `src/types/sub2api.ts`、`src/types/viewModels.ts`  
  上游响应类型和本应用视图模型。
- Create: `src/utils/accountStatus.ts`、`src/utils/format.ts`、`src/utils/usage.ts`  
  状态优先级、格式化和用量计算。
- Create: `src/composables/useDashboardData.ts`  
  页面数据加载、刷新和错误状态。
- Create: `src/components/*.vue`  
  表格、状态徽标、用量条、只读详情等 UI 组件。
- Create: `src/__tests__/*.spec.ts`  
  状态映射、API 客户端和关键组件测试。
- Create: `deploy/nginx.example.conf`、`deploy/caddy.example.conf`、`README.md`  
  同服务器部署说明和反代 token 注入示例。
- Delete after replacement: `preview.html`、`preview-server.cjs`、`preview-server.log`、`preview-server.err`  
  正式项目跑起来并确认视觉方向后删除临时预览文件。

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/style.css`
- Test: `npm run typecheck`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "dashboard-sub2api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vue/test-utils": "^2.4.6",
    "@types/node": "^20.10.5",
    "jsdom": "^24.1.3",
    "typescript": "~5.6.0",
    "vite": "^5.0.10",
    "vitest": "^2.1.9",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: 创建 Vite 入口文件**

`index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>sub2api Dashboard</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

- [ ] **Step 3: 创建 TypeScript 和 Vite 配置**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/dashboard/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

`vitest.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

- [ ] **Step 4: 创建最小 `App.vue` 和全局样式**

`src/App.vue`:

```vue
<template>
  <main class="app-shell">
    <h1>sub2api Dashboard</h1>
  </main>
</template>
```

`src/style.css`:

```css
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f8fb;
  color: #111827;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f6f8fb;
}

.app-shell {
  min-height: 100vh;
}
```

- [ ] **Step 5: 安装依赖并验证脚手架**

Run:

```powershell
npm install
npm run typecheck
```

Expected:

```text
0 errors
```

- [ ] **Step 6: 提交脚手架**

```powershell
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts src/main.ts src/App.vue src/style.css
git commit -m "chore: scaffold vue dashboard"
```

---

### Task 2: 上游类型和状态映射

**Files:**
- Create: `src/types/sub2api.ts`
- Create: `src/types/viewModels.ts`
- Create: `src/utils/accountStatus.ts`
- Test: `src/__tests__/accountStatus.spec.ts`

- [ ] **Step 1: 写账户状态优先级测试**

`src/__tests__/accountStatus.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveAccountStatus } from '@/utils/accountStatus'
import type { Account } from '@/types/sub2api'

const baseAccount: Account = {
  id: 1,
  name: 'openai-main',
  platform: 'openai',
  type: 'oauth',
  status: 'active',
  schedulable: true,
  error_message: null,
  rate_limit_reset_at: null,
  overload_until: null,
  temp_unschedulable_until: null,
  expires_at: null,
  auto_pause_on_expired: false,
  concurrency: 20,
  priority: 0,
  proxy_id: null,
  created_at: '2026-06-24T00:00:00Z',
  updated_at: '2026-06-24T00:00:00Z',
  last_used_at: null,
  rate_limited_at: null,
  temp_unschedulable_reason: null,
  session_window_start: null,
  session_window_end: null,
  session_window_status: null
}

describe('resolveAccountStatus', () => {
  it('prioritizes overloaded over all other account states', () => {
    const result = resolveAccountStatus({
      ...baseAccount,
      status: 'error',
      schedulable: false,
      overload_until: '2099-01-01T00:00:00Z',
      rate_limit_reset_at: '2099-01-01T00:00:00Z'
    })
    expect(result.key).toBe('overloaded')
    expect(result.label).toBe('过载中')
  })

  it('shows rate limited before temporary unschedulable', () => {
    const result = resolveAccountStatus({
      ...baseAccount,
      rate_limit_reset_at: '2099-01-01T00:00:00Z',
      temp_unschedulable_until: '2099-01-01T00:00:00Z'
    })
    expect(result.key).toBe('rate_limited')
  })

  it('shows unschedulable when active account is not schedulable', () => {
    const result = resolveAccountStatus({ ...baseAccount, schedulable: false })
    expect(result.key).toBe('unschedulable')
    expect(result.label).toBe('不可调度')
  })

  it('shows active for healthy schedulable account', () => {
    const result = resolveAccountStatus(baseAccount)
    expect(result.key).toBe('active')
    expect(result.tone).toBe('success')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm run test:run -- src/__tests__/accountStatus.spec.ts
```

Expected: FAIL because `@/utils/accountStatus` does not exist.

- [ ] **Step 3: 定义上游类型**

`src/types/sub2api.ts`:

```ts
export type AccountPlatform = 'anthropic' | 'openai' | 'gemini' | 'antigravity'
export type AccountType = 'oauth' | 'setup-token' | 'apikey' | 'upstream' | 'bedrock' | 'service_account'

export interface WindowStats {
  requests: number
  tokens: number
  cost: number
  standard_cost?: number
  user_cost?: number
}

export interface UsageProgress {
  utilization: number
  resets_at: string | null
  remaining_seconds: number
  window_stats?: WindowStats | null
}

export interface AccountUsageInfo {
  source?: 'passive' | 'active'
  updated_at: string | null
  five_hour: UsageProgress | null
  seven_day: UsageProgress | null
  seven_day_sonnet: UsageProgress | null
  error?: string
}

export interface Account {
  id: number
  name: string
  notes?: string | null
  platform: AccountPlatform
  type: AccountType
  credentials?: Record<string, unknown>
  credentials_status?: Record<string, boolean>
  extra?: Record<string, unknown>
  proxy_id: number | null
  concurrency: number
  current_concurrency?: number
  priority: number
  status: 'active' | 'inactive' | 'error'
  error_message: string | null
  last_used_at: string | null
  expires_at: number | null
  auto_pause_on_expired: boolean
  created_at: string
  updated_at: string
  schedulable: boolean
  rate_limited_at: string | null
  rate_limit_reset_at: string | null
  overload_until: string | null
  temp_unschedulable_until: string | null
  temp_unschedulable_reason: string | null
  session_window_start: string | null
  session_window_end: string | null
  session_window_status: 'allowed' | 'allowed_warning' | 'rejected' | null
  window_cost_limit?: number | null
  current_window_cost?: number | null
  max_sessions?: number | null
  active_sessions?: number | null
  base_rpm?: number | null
  current_rpm?: number | null
  quota_limit?: number | null
  quota_used?: number | null
  quota_daily_limit?: number | null
  quota_daily_used?: number | null
  quota_weekly_limit?: number | null
  quota_weekly_used?: number | null
}

export interface SubscriptionGroup {
  id: number
  name: string
  subscription_type?: string
  daily_limit_usd?: number | null
  weekly_limit_usd?: number | null
  monthly_limit_usd?: number | null
  status?: string
}

export interface SubscriptionUser {
  id: number
  email?: string
  username?: string
}

export interface UserSubscription {
  id: number
  user_id: number
  group_id: number
  status: 'active' | 'expired' | 'revoked'
  expires_at: string | null
  daily_usage_usd?: number | null
  weekly_usage_usd?: number | null
  monthly_usage_usd?: number | null
  daily_window_start?: string | null
  weekly_window_start?: string | null
  monthly_window_start?: string | null
  user?: SubscriptionUser | null
  group?: SubscriptionGroup | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
```

- [ ] **Step 4: 实现账户状态映射**

`src/utils/accountStatus.ts`:

```ts
import type { Account } from '@/types/sub2api'

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted'

export interface AccountStatusView {
  key: 'overloaded' | 'rate_limited' | 'temp_unschedulable' | 'error' | 'unschedulable' | 'inactive' | 'active'
  label: string
  tone: StatusTone
  detail?: string
}

const isFuture = (value: string | null | undefined): boolean => {
  if (!value) return false
  return new Date(value).getTime() > Date.now()
}

export function resolveAccountStatus(account: Account): AccountStatusView {
  if (isFuture(account.overload_until)) {
    return { key: 'overloaded', label: '过载中', tone: 'danger', detail: account.overload_until ?? undefined }
  }
  if (isFuture(account.rate_limit_reset_at)) {
    return { key: 'rate_limited', label: '限流中', tone: 'warning', detail: account.rate_limit_reset_at ?? undefined }
  }
  if (isFuture(account.temp_unschedulable_until)) {
    return { key: 'temp_unschedulable', label: '临时不可调度', tone: 'warning', detail: account.temp_unschedulable_until ?? undefined }
  }
  if (account.status === 'error') {
    return { key: 'error', label: '错误', tone: 'danger', detail: account.error_message ?? undefined }
  }
  if (!account.schedulable) {
    return { key: 'unschedulable', label: '不可调度', tone: 'muted' }
  }
  if (account.status === 'inactive') {
    return { key: 'inactive', label: '停用', tone: 'muted' }
  }
  return { key: 'active', label: '正常', tone: 'success' }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
npm run test:run -- src/__tests__/accountStatus.spec.ts
```

Expected: PASS.

- [ ] **Step 6: 提交类型和状态映射**

```powershell
git add src/types/sub2api.ts src/utils/accountStatus.ts src/__tests__/accountStatus.spec.ts
git commit -m "feat: model sub2api read-only account states"
```

---

### Task 3: 只读 API 客户端

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/dashboard.ts`
- Test: `src/__tests__/apiClient.spec.ts`

- [ ] **Step 1: 写 API 客户端测试**

`src/__tests__/apiClient.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDashboardApi } from '@/api/dashboard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard api', () => {
  it('loads subscriptions from the dashboard proxy path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 })
    })
    const api = createDashboardApi(fetchMock)

    await api.listSubscriptions({ page: 1, pageSize: 20, status: 'active' })

    expect(fetchMock).toHaveBeenCalledWith('/dashboard-api/subscriptions?page=1&page_size=20&status=active', {
      headers: { Accept: 'application/json' }
    })
  })

  it('throws a readable error when proxy returns non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'invalid token'
    })
    const api = createDashboardApi(fetchMock)

    await expect(api.listAccounts({ page: 1, pageSize: 20 })).rejects.toThrow('API 请求失败: 401 Unauthorized')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npm run test:run -- src/__tests__/apiClient.spec.ts
```

Expected: FAIL because `@/api/dashboard` does not exist.

- [ ] **Step 3: 实现通用请求客户端**

`src/api/client.ts`:

```ts
export type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json' | 'text'>>

export interface RequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>
}

const buildUrl = (path: string, params?: RequestOptions['params']) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function createApiClient(fetcher: FetchLike = fetch) {
  async function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetcher(buildUrl(path, options.params), {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  return { get }
}
```

- [ ] **Step 4: 实现 dashboard API**

`src/api/dashboard.ts`:

```ts
import { createApiClient, type FetchLike } from './client'
import type { Account, AccountUsageInfo, PaginatedResponse, UserSubscription } from '@/types/sub2api'

interface PageParams {
  page: number
  pageSize: number
  search?: string
}

interface SubscriptionParams extends PageParams {
  status?: 'active' | 'expired' | 'revoked' | ''
}

interface AccountParams extends PageParams {
  platform?: string
  type?: string
  status?: string
}

export function createDashboardApi(fetcher?: FetchLike) {
  const client = createApiClient(fetcher)

  return {
    listSubscriptions(params: SubscriptionParams) {
      return client.get<PaginatedResponse<UserSubscription>>('/dashboard-api/subscriptions', {
        params: {
          page: params.page,
          page_size: params.pageSize,
          status: params.status || undefined
        }
      })
    },
    listAccounts(params: AccountParams) {
      return client.get<PaginatedResponse<Account>>('/dashboard-api/accounts', {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search,
          platform: params.platform,
          type: params.type,
          status: params.status
        }
      })
    },
    getAccountUsage(accountId: number) {
      return client.get<AccountUsageInfo>(`/dashboard-api/accounts/${accountId}/usage`)
    }
  }
}

export const dashboardApi = createDashboardApi()
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
npm run test:run -- src/__tests__/apiClient.spec.ts
```

Expected: PASS.

- [ ] **Step 6: 提交 API 客户端**

```powershell
git add src/api/client.ts src/api/dashboard.ts src/__tests__/apiClient.spec.ts
git commit -m "feat: add read-only dashboard api client"
```

---

### Task 4: 格式化和用量工具

**Files:**
- Create: `src/utils/format.ts`
- Create: `src/utils/usage.ts`
- Test: `src/__tests__/formatUsage.spec.ts`

- [ ] **Step 1: 写格式化测试**

`src/__tests__/formatUsage.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatCurrency, formatTokens, formatDateOnly } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

describe('format helpers', () => {
  it('formats currency and tokens for compact tables', () => {
    expect(formatCurrency(12.345)).toBe('$12.35')
    expect(formatTokens(18800000)).toBe('18.8M')
  })

  it('formats date as yyyy/mm/dd', () => {
    expect(formatDateOnly('2026-07-01T22:48:00Z')).toBe('2026/07/01')
  })

  it('caps progress width at 100 but keeps numeric percent', () => {
    expect(progressPercent(120, 100)).toEqual({ value: 120, width: 100 })
  })
})
```

- [ ] **Step 2: 实现工具函数并跑测试**

`src/utils/format.ts`:

```ts
export const formatCurrency = (value: number | null | undefined): string => {
  return `$${(value ?? 0).toFixed(2)}`
}

export const formatTokens = (value: number | null | undefined): string => {
  const tokens = value ?? 0
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

export const formatDateOnly = (value: string | number | null | undefined): string => {
  if (!value) return '-'
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}
```

`src/utils/usage.ts`:

```ts
export function progressPercent(used: number | null | undefined, limit: number | null | undefined) {
  if (!limit || limit <= 0) return { value: 0, width: 0 }
  const value = Math.round(((used ?? 0) / limit) * 100)
  return { value, width: Math.max(0, Math.min(100, value)) }
}
```

Run:

```powershell
npm run test:run -- src/__tests__/formatUsage.spec.ts
```

Expected: PASS.

- [ ] **Step 3: 提交工具函数**

```powershell
git add src/utils/format.ts src/utils/usage.ts src/__tests__/formatUsage.spec.ts
git commit -m "feat: add dashboard formatting utilities"
```

---

### Task 5: 基础 UI 组件

**Files:**
- Create: `src/components/StatusBadge.vue`
- Create: `src/components/UsageBar.vue`
- Create: `src/components/ReadonlySwitch.vue`
- Create: `src/components/SummaryStrip.vue`
- Test: `src/__tests__/baseComponents.spec.ts`

- [ ] **Step 1: 写组件测试**

`src/__tests__/baseComponents.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusBadge from '@/components/StatusBadge.vue'
import UsageBar from '@/components/UsageBar.vue'

describe('base dashboard components', () => {
  it('renders status tone class', () => {
    const wrapper = mount(StatusBadge, { props: { label: '正常', tone: 'success' } })
    expect(wrapper.text()).toContain('正常')
    expect(wrapper.classes()).toContain('status-badge--success')
  })

  it('renders usage width from percent', () => {
    const wrapper = mount(UsageBar, { props: { label: '5h', percent: 42, amount: '42%' } })
    const fill = wrapper.get('.usage-bar__fill')
    expect(fill.attributes('style')).toContain('width: 42%')
  })
})
```

- [ ] **Step 2: 实现基础组件**

`src/components/StatusBadge.vue`:

```vue
<template>
  <span :class="['status-badge', `status-badge--${tone}`]">{{ label }}</span>
</template>

<script setup lang="ts">
defineProps<{ label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }>()
</script>
```

`src/components/UsageBar.vue`:

```vue
<template>
  <div class="usage-bar">
    <span class="usage-bar__label">{{ label }}</span>
    <span class="usage-bar__track"><span class="usage-bar__fill" :style="{ width: `${safePercent}%` }" /></span>
    <span class="usage-bar__amount">{{ amount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ label: string; percent: number; amount: string }>()
const safePercent = computed(() => Math.max(0, Math.min(100, props.percent)))
</script>
```

`src/components/ReadonlySwitch.vue`:

```vue
<template>
  <span :class="['readonly-switch', { 'readonly-switch--on': modelValue }]" :aria-label="modelValue ? '调度已开启' : '调度已关闭'" />
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
</script>
```

- [ ] **Step 3: 给组件补样式**

Append to `src/style.css`:

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 650;
}

.status-badge--success { background: #c9f7df; color: #07833f; }
.status-badge--warning { background: #ffedd5; color: #c2410c; }
.status-badge--danger { background: #fee2e2; color: #b91c1c; }
.status-badge--muted { background: #f3f4f6; color: #4b5563; }

.usage-bar {
  display: grid;
  grid-template-columns: 34px minmax(120px, 1fr) 86px;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.usage-bar__label {
  color: #374151;
  text-align: right;
}

.usage-bar__track {
  height: 4px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.usage-bar__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: #22c55e;
}
```

- [ ] **Step 4: 运行组件测试**

Run:

```powershell
npm run test:run -- src/__tests__/baseComponents.spec.ts
```

Expected: PASS.

- [ ] **Step 5: 提交基础组件**

```powershell
git add src/components/StatusBadge.vue src/components/UsageBar.vue src/components/ReadonlySwitch.vue src/style.css src/__tests__/baseComponents.spec.ts
git commit -m "feat: add reusable read-only dashboard components"
```

---

### Task 6: 数据加载 composable

**Files:**
- Create: `src/composables/useDashboardData.ts`
- Test: `src/__tests__/useDashboardData.spec.ts`

- [ ] **Step 1: 写数据加载测试**

`src/__tests__/useDashboardData.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { useDashboardData } from '@/composables/useDashboardData'

describe('useDashboardData', () => {
  it('loads subscriptions and accounts without write calls', async () => {
    const api = {
      listSubscriptions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      listAccounts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      getAccountUsage: vi.fn()
    }
    const state = useDashboardData(api)

    await state.refreshAll()

    expect(api.listSubscriptions).toHaveBeenCalled()
    expect(api.listAccounts).toHaveBeenCalled()
    expect(state.error.value).toBeNull()
  })
})
```

- [ ] **Step 2: 实现 composable**

`src/composables/useDashboardData.ts`:

```ts
import { computed, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { Account, PaginatedResponse, UserSubscription } from '@/types/sub2api'

type DashboardApi = Pick<typeof dashboardApi, 'listSubscriptions' | 'listAccounts' | 'getAccountUsage'>

export function useDashboardData(api: DashboardApi = dashboardApi) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const subscriptions = ref<UserSubscription[]>([])
  const accounts = ref<Account[]>([])
  const subscriptionTotal = ref(0)
  const accountTotal = ref(0)

  const summary = computed(() => ({
    subscriptions: subscriptionTotal.value,
    accounts: accountTotal.value
  }))

  async function refreshAll() {
    loading.value = true
    error.value = null
    try {
      const [subscriptionPage, accountPage]: [PaginatedResponse<UserSubscription>, PaginatedResponse<Account>] = await Promise.all([
        api.listSubscriptions({ page: 1, pageSize: 50, status: 'active' }),
        api.listAccounts({ page: 1, pageSize: 50 })
      ])
      subscriptions.value = subscriptionPage.items
      accounts.value = accountPage.items
      subscriptionTotal.value = subscriptionPage.total
      accountTotal.value = accountPage.total
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, subscriptions, accounts, summary, refreshAll }
}
```

- [ ] **Step 3: 运行测试**

Run:

```powershell
npm run test:run -- src/__tests__/useDashboardData.spec.ts
```

Expected: PASS.

- [ ] **Step 4: 提交数据加载层**

```powershell
git add src/composables/useDashboardData.ts src/__tests__/useDashboardData.spec.ts
git commit -m "feat: load read-only dashboard data"
```

---

### Task 7: 订阅表和账户表

**Files:**
- Create: `src/components/SubscriptionTable.vue`
- Create: `src/components/AccountTable.vue`
- Test: `src/__tests__/tables.spec.ts`

- [ ] **Step 1: 写表格渲染测试**

`src/__tests__/tables.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import AccountTable from '@/components/AccountTable.vue'
import type { Account, UserSubscription } from '@/types/sub2api'

describe('dashboard tables', () => {
  it('renders subscription user and active status', () => {
    const rows: UserSubscription[] = [{
      id: 1,
      user_id: 1,
      group_id: 1,
      status: 'active',
      expires_at: '2026-07-04T00:00:00Z',
      weekly_usage_usd: 378.68,
      monthly_usage_usd: 829.76,
      user: { id: 1, email: 'shevbing@hotmail.com' },
      group: { id: 1, name: '企业月卡', weekly_limit_usd: 500, monthly_limit_usd: 2000 }
    }]
    const wrapper = mount(SubscriptionTable, { props: { rows } })
    expect(wrapper.text()).toContain('shevbing@hotmail.com')
    expect(wrapper.text()).toContain('企业月卡')
    expect(wrapper.text()).toContain('生效中')
  })

  it('renders account runtime status and readonly schedulable switch', () => {
    const rows: Account[] = [{
      id: 1,
      name: 'openai-main',
      platform: 'openai',
      type: 'oauth',
      status: 'active',
      schedulable: true,
      error_message: null,
      rate_limit_reset_at: null,
      overload_until: null,
      temp_unschedulable_until: null,
      expires_at: null,
      auto_pause_on_expired: false,
      concurrency: 20,
      priority: 0,
      proxy_id: null,
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
      last_used_at: null,
      rate_limited_at: null,
      temp_unschedulable_reason: null,
      session_window_start: null,
      session_window_end: null,
      session_window_status: null
    }]
    const wrapper = mount(AccountTable, { props: { rows } })
    expect(wrapper.text()).toContain('openai-main')
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('正常')
  })
})
```

- [ ] **Step 2: 实现订阅表**

`src/components/SubscriptionTable.vue`:

```vue
<template>
  <section class="data-card">
    <div class="data-head subscription-grid">
      <span>用户</span><span>套餐</span><span>用量</span><span>到期时间</span><span>状态</span><span>操作</span>
    </div>
    <article v-for="row in rows" :key="row.id" class="data-row subscription-grid">
      <div class="identity-cell"><span class="avatar">{{ initial(row.user?.email) }}</span><span>{{ row.user?.email || `#${row.user_id}` }}</span></div>
      <span class="chip chip--green">{{ row.group?.name || '-' }}</span>
      <div class="usage-stack">
        <UsageBar v-if="row.group?.weekly_limit_usd" label="每周" :percent="percent(row.weekly_usage_usd, row.group.weekly_limit_usd)" :amount="`${formatCurrency(row.weekly_usage_usd)} / ${formatCurrency(row.group.weekly_limit_usd)}`" />
        <UsageBar v-if="row.group?.monthly_limit_usd" label="每月" :percent="percent(row.monthly_usage_usd, row.group.monthly_limit_usd)" :amount="`${formatCurrency(row.monthly_usage_usd)} / ${formatCurrency(row.group.monthly_limit_usd)}`" />
      </div>
      <span>{{ formatDateOnly(row.expires_at) }}</span>
      <StatusBadge :label="statusLabel(row.status)" :tone="row.status === 'active' ? 'success' : 'muted'" />
      <button class="link-button" type="button">详情</button>
    </article>
  </section>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import UsageBar from './UsageBar.vue'
import type { UserSubscription } from '@/types/sub2api'
import { formatCurrency, formatDateOnly } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

defineProps<{ rows: UserSubscription[] }>()

const initial = (value?: string) => value?.charAt(0).toUpperCase() || '?'
const percent = (used?: number | null, limit?: number | null) => progressPercent(used, limit).width
const statusLabel = (status: UserSubscription['status']) => ({ active: '生效中', expired: '已过期', revoked: '已撤销' })[status]
</script>
```

- [ ] **Step 3: 实现账户表**

`src/components/AccountTable.vue`:

```vue
<template>
  <section class="data-card">
    <div class="data-head account-grid">
      <span>名称</span><span>平台/类型</span><span>容量</span><span>状态</span><span>调度</span><span>到期</span><span>操作</span>
    </div>
    <article v-for="row in rows" :key="row.id" class="data-row account-grid">
      <div class="identity-cell"><span class="avatar">{{ row.name.charAt(0).toUpperCase() }}</span><span>{{ row.name }}</span></div>
      <div class="chip-wrap"><span class="chip">{{ platformLabel(row.platform) }}</span><span class="chip chip--green">{{ row.type }}</span></div>
      <div class="capacity-cell"><span>{{ row.current_concurrency ?? 0 }} / {{ row.concurrency }}</span></div>
      <StatusBadge :label="resolveAccountStatus(row).label" :tone="resolveAccountStatus(row).tone" />
      <ReadonlySwitch :model-value="row.schedulable" />
      <span>{{ formatDateOnly(row.expires_at) }}</span>
      <button class="link-button" type="button">详情</button>
    </article>
  </section>
</template>

<script setup lang="ts">
import ReadonlySwitch from './ReadonlySwitch.vue'
import StatusBadge from './StatusBadge.vue'
import type { Account, AccountPlatform } from '@/types/sub2api'
import { resolveAccountStatus } from '@/utils/accountStatus'
import { formatDateOnly } from '@/utils/format'

defineProps<{ rows: Account[] }>()

const platformLabel = (platform: AccountPlatform) => ({ openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', antigravity: 'Antigravity' })[platform]
</script>
```

- [ ] **Step 4: 补表格样式并运行测试**

Append to `src/style.css`:

```css
.data-card { background: #fff; border: 1px solid #edf0f3; border-radius: 10px; overflow: hidden; }
.data-head, .data-row { display: grid; align-items: center; column-gap: 14px; padding: 0 18px; }
.data-head { height: 42px; color: #6b7280; font-size: 12px; font-weight: 650; border-bottom: 1px solid #edf0f3; }
.data-row { min-height: 96px; border-bottom: 1px solid #f3f5f7; font-size: 13px; }
.subscription-grid { grid-template-columns: 2fr 1fr 2.6fr 1fr .8fr .7fr; }
.account-grid { grid-template-columns: 1.7fr 1.25fr .8fr 1fr .65fr 1fr .7fr; }
.identity-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar { width: 30px; height: 30px; border-radius: 999px; background: #bdf8ed; color: #058a71; display: grid; place-items: center; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-flex; min-height: 22px; align-items: center; border-radius: 6px; padding: 0 8px; background: #f3f4f6; color: #4b5563; font-size: 12px; font-weight: 650; }
.chip--green { background: #c9f7df; color: #07833f; }
.usage-stack { display: grid; gap: 8px; }
.link-button { border: 0; background: transparent; color: #2563eb; cursor: pointer; font-size: 12px; }
```

Run:

```powershell
npm run test:run -- src/__tests__/tables.spec.ts
```

Expected: PASS.

- [ ] **Step 5: 提交表格组件**

```powershell
git add src/components/SubscriptionTable.vue src/components/AccountTable.vue src/style.css src/__tests__/tables.spec.ts
git commit -m "feat: render read-only subscription and account tables"
```

---

### Task 8: Dashboard 主界面

**Files:**
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Test: `npm run build`

- [ ] **Step 1: 接入主界面布局**

Replace `src/App.vue`:

```vue
<template>
  <div class="dashboard-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">S</span>sub2api</div>
      <nav class="nav">
        <span class="nav-item nav-item--active">订阅管理</span>
        <span class="nav-item nav-item--active">账户管理</span>
        <span class="nav-item">用量记录</span>
      </nav>
    </aside>
    <main class="workspace">
      <header class="toolbar">
        <div>
          <h1>sub2api 只读 Dashboard</h1>
          <p>订阅和账户用量浏览窗口</p>
        </div>
        <button class="refresh-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
      </header>

      <p v-if="error" class="error-banner">{{ error }}</p>

      <section class="summary-strip">
        <div><span>生效订阅</span><strong>{{ summary.subscriptions }}</strong></div>
        <div><span>总账户</span><strong>{{ summary.accounts }}</strong></div>
      </section>

      <section class="section-stack">
        <h2>订阅管理</h2>
        <SubscriptionTable :rows="subscriptions" />
      </section>

      <section class="section-stack">
        <h2>账户管理</h2>
        <AccountTable :rows="accounts" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AccountTable from '@/components/AccountTable.vue'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import { useDashboardData } from '@/composables/useDashboardData'

const { loading, error, subscriptions, accounts, summary, refreshAll } = useDashboardData()

onMounted(() => {
  void refreshAll()
})
</script>
```

- [ ] **Step 2: 补主界面样式**

Append to `src/style.css`:

```css
.dashboard-shell { min-height: 100vh; display: grid; grid-template-columns: 232px 1fr; }
.sidebar { background: #fff; border-right: 1px solid #edf0f3; padding: 18px 14px; }
.brand { height: 38px; display: flex; align-items: center; gap: 10px; font-weight: 700; }
.brand-mark { width: 28px; height: 28px; border-radius: 8px; background: #111827; color: #fff; display: grid; place-items: center; }
.nav { display: grid; gap: 4px; margin-top: 18px; }
.nav-item { min-height: 36px; border-radius: 8px; padding: 9px 11px; color: #4b5563; font-size: 13px; }
.nav-item--active { background: #f4fcfa; color: #059669; font-weight: 650; }
.workspace { padding: 18px; display: grid; gap: 14px; align-content: start; overflow-x: auto; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toolbar h1 { margin: 0; font-size: 20px; }
.toolbar p { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
.refresh-button { height: 34px; border: 1px solid #10b981; border-radius: 8px; background: #10b981; color: #fff; padding: 0 14px; font-weight: 650; }
.summary-strip { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.summary-strip > div { background: #fff; border: 1px solid #edf0f3; border-radius: 10px; padding: 13px 14px; }
.summary-strip span { display: block; color: #6b7280; font-size: 12px; margin-bottom: 7px; }
.summary-strip strong { font-size: 22px; }
.section-stack { display: grid; gap: 8px; }
.section-stack h2 { margin: 0; font-size: 16px; }
.error-banner { margin: 0; border: 1px solid #fecaca; background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 10px 12px; }
@media (max-width: 1080px) { .dashboard-shell { grid-template-columns: 1fr; } .sidebar { display: none; } .data-card { min-width: 980px; } }
```

- [ ] **Step 3: 构建验证**

Run:

```powershell
npm run build
```

Expected: build exits 0.

- [ ] **Step 4: 提交主界面**

```powershell
git add src/App.vue src/style.css
git commit -m "feat: compose read-only dashboard view"
```

---

### Task 9: 部署文档和反代示例

**Files:**
- Create: `deploy/nginx.example.conf`
- Create: `deploy/caddy.example.conf`
- Create: `README.md`

- [ ] **Step 1: 创建 Nginx 示例**

`deploy/nginx.example.conf`:

```nginx
server {
  listen 80;
  server_name example.com;

  root /opt/dashboard_sub2api/dist;

  location /dashboard/ {
    try_files $uri $uri/ /dashboard/index.html;
  }

  location /dashboard-api/ {
    proxy_pass http://127.0.0.1:8080/api/admin/;
    proxy_set_header Authorization "Bearer ${SUB2API_ADMIN_TOKEN}";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

- [ ] **Step 2: 创建 README**

`deploy/caddy.example.conf`:

```caddyfile
example.com {
  handle_path /dashboard-api/* {
    reverse_proxy 127.0.0.1:8080 {
      header_up Authorization "Bearer {$SUB2API_ADMIN_TOKEN}"
      header_up Host {host}
      header_up X-Forwarded-For {remote_host}
    }
  }

  handle_path /dashboard/* {
    root * /opt/dashboard_sub2api/dist
    try_files {path} /index.html
    file_server
  }
}
```

`README.md`:

```md
# dashboard_sub2api

`sub2api` 只读 Dashboard，用于浏览订阅管理和账户管理用量。

## 安全模型

前端不保存 admin token。Dashboard 部署在 `sub2api` 同一台服务器，通过 `/dashboard-api/*` 反向代理访问 `sub2api` admin API，由 Nginx 或 Caddy 在服务器侧注入 admin token。

不要把 admin token 写入 `.env.production`、GitHub Actions secret 构建变量或前端代码。静态前端构建产物可以被浏览器下载，构建期环境变量也会被打包。

## 本地开发

```powershell
npm install
npm run dev
```

## 构建

```powershell
npm run build
```

构建产物在 `dist/`。

## 部署

1. 在服务器构建或上传 `dist/`。
2. 将 `dist/` 挂载到 `/dashboard/`。
3. 配置 `/dashboard-api/` 反向代理到 `sub2api` 的 `/api/admin/`。
4. 在服务器侧注入 admin token。

参考 `deploy/nginx.example.conf` 和 `deploy/caddy.example.conf`。
```

- [ ] **Step 3: 提交部署文档**

```powershell
git add README.md deploy/nginx.example.conf deploy/caddy.example.conf
git commit -m "docs: add same-server deployment guide"
```

---

### Task 10: 清理预览文件并最终验证

**Files:**
- Delete: `preview.html`
- Delete: `preview-server.cjs`
- Delete: `preview-server.log`
- Delete: `preview-server.err`
- Modify: `.gitignore`

- [ ] **Step 1: 删除临时预览文件**

Use `apply_patch` to delete:

```text
preview.html
preview-server.cjs
preview-server.log
preview-server.err
```

- [ ] **Step 2: 更新 `.gitignore`**

Ensure `.gitignore` contains:

```gitignore
.upstream/
.superpowers/
node_modules/
dist/
*.log
*.err
```

- [ ] **Step 3: 运行完整验证**

Run:

```powershell
npm run test:run
npm run typecheck
npm run build
```

Expected:

```text
All tests pass
0 type errors
Build exits 0
```

- [ ] **Step 4: 提交清理和验证完成**

```powershell
git add -A
git commit -m "chore: replace preview with production dashboard"
```

- [ ] **Step 5: 推送到个人 GitHub 仓库**

Run:

```powershell
git branch -M main
git push -u origin main
```

Expected: branch `main` pushed to `https://github.com/JiaxuanShen/dashboard_sub2api.git`.

---

## Self-Review

- Spec coverage: 计划覆盖同服务器部署、反代 token 注入、只读边界、订阅视图、账户视图、账户状态优先级、错误展示、README 部署说明和验证。
- Placeholder scan: 本计划没有 `TBD`、`TODO` 或未定义占位步骤。
- Type consistency: `Account`、`UserSubscription`、`PaginatedResponse`、`resolveAccountStatus`、`createDashboardApi` 在前置任务中定义，后续任务复用同名类型和函数。
