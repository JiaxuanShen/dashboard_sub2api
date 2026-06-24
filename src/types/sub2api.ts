export type AccountPlatform = 'anthropic' | 'openai' | 'gemini' | 'antigravity'

export type AccountType = 'api_key' | 'oauth'

export interface WindowStats {
  start_time: string
  end_time: string
  requests: number
  input_tokens: number
  output_tokens: number
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
