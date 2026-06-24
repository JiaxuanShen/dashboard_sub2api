export function progressPercent(used: number | null | undefined, limit: number | null | undefined) {
  if (!limit || limit <= 0) return { value: 0, width: 0 }
  const value = Math.round(((used ?? 0) / limit) * 100)
  return { value, width: Math.max(0, Math.min(100, value)) }
}
