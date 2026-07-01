export const formatCurrency = (value: number | null | undefined): string => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return `$${amount.toFixed(2)}`
}

export const formatTokens = (value: number | null | undefined): string => {
  const tokens = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

export const formatCompactCount = (value: number | null | undefined): string => {
  const count = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const oneDecimal = (amount: number) => (Math.round(amount * 10) / 10).toFixed(1)
  if (count >= 1_000_000) return `${oneDecimal(count / 1_000_000)}M`
  if (count >= 1_000) return `${oneDecimal(count / 1_000)}K`
  return String(count)
}

export const formatDateOnly = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-'
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  // Render with UTC calendar fields so epoch-second inputs are timezone stable.
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

const parseTime = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const time = typeof value === 'number' ? value * 1000 : new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

export const formatDurationUntil = (
  value: string | number | null | undefined,
  now = Date.now()
): string => {
  const target = parseTime(value)
  if (target === null) return '-'
  const remainingMs = target - now
  if (remainingMs <= 0) return '已重置'

  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days} 天 ${hours} 小时后重置`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟后重置`
  return `${minutes} 分钟后重置`
}

export const formatDaysUntil = (
  value: string | number | null | undefined,
  now = Date.now()
): string => {
  const target = parseTime(value)
  if (target === null) return '-'
  const remainingMs = target - now
  if (remainingMs <= 0) return '已到期'
  return `${Math.ceil(remainingMs / 86_400_000)} 天剩余`
}
