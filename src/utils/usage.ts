export function progressPercent(used: number | null | undefined, limit: number | null | undefined) {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) return { value: 0, width: 0 }
  const safeUsed = typeof used === 'number' && Number.isFinite(used) ? used : 0
  const value = Math.round((safeUsed / limit) * 100)
  return { value, width: Math.max(0, Math.min(100, value)) }
}
