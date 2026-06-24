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
