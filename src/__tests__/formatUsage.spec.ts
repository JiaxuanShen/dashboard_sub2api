import { describe, expect, it } from 'vitest'
import { formatCurrency, formatTokens, formatDateOnly, formatDurationUntil, formatDaysUntil, formatCompactCount } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

describe('format helpers', () => {
  it('formats currency and tokens for compact tables', () => {
    expect(formatCurrency(12.345)).toBe('$12.35')
    expect(formatTokens(18800000)).toBe('18.8M')
  })

  it('formats date as yyyy/mm/dd', () => {
    expect(formatDateOnly('2026-07-01T22:48:00Z')).toBe('2026/07/01')
  })

  it('formats epoch seconds with UTC calendar dates', () => {
    expect(formatDateOnly(0)).toBe('1970/01/01')
  })

  it('returns dash for missing or invalid dates', () => {
    expect(formatDateOnly(null)).toBe('-')
    expect(formatDateOnly('not-a-date')).toBe('-')
  })

  it('formats reset countdowns for usage windows', () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime()

    expect(formatDurationUntil('2026-07-03T06:00:00Z', now)).toBe('2 天 6 小时后重置')
    expect(formatDurationUntil('2026-07-01T00:20:00Z', now)).toBe('20 分钟后重置')
    expect(formatDurationUntil('2026-06-30T23:59:00Z', now)).toBe('已重置')
  })

  it('formats expiry days and compact counts', () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime()

    expect(formatDaysUntil('2026-07-30T00:00:00Z', now)).toBe('29 天剩余')
    expect(formatDaysUntil(null, now)).toBe('-')
    expect(formatCompactCount(12450)).toBe('12.5K')
    expect(formatCompactCount(9876543)).toBe('9.9M')
  })

  it('falls back for non-finite number formatting inputs', () => {
    expect(formatCurrency(Number.NaN)).toBe('$0.00')
    expect(formatTokens(Number.POSITIVE_INFINITY)).toBe('0')
  })

  it('caps progress width at 100 but keeps numeric percent', () => {
    expect(progressPercent(120, 100)).toEqual({ value: 120, width: 100 })
  })

  it('returns zero progress for zero or negative limits', () => {
    expect(progressPercent(10, 0)).toEqual({ value: 0, width: 0 })
    expect(progressPercent(10, -1)).toEqual({ value: 0, width: 0 })
  })

  it('returns zero progress for non-finite usage', () => {
    expect(progressPercent(Number.NaN, 100)).toEqual({ value: 0, width: 0 })
  })
})
