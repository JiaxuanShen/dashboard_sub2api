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
