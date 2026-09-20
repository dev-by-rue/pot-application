import { expect, it, describe } from "vitest"
import { roundPenny, formatCurrency } from "./money.utils"

describe('roundPenny()', () => {
  it('should round up to the nearest penny', () => {
    expect(roundPenny(1.005)).toBe(1.01)
    expect(roundPenny(388.888)).toBe(388.89)
  })
})

describe('formatCurrency()', () => {
  it('should format to en-GB currency', () => {
    expect(formatCurrency(354.78)).toBe('£354.78')
    expect(formatCurrency(1000000.00)).toBe('£1,000,000.00')
  })
})