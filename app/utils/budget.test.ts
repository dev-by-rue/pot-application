import { describe, expect, it } from 'vitest'
import { monthsBetween, requiredMonthly, isMonthPast, addMonths } from './budget.utils'
import type { Goal } from '~/types/budget.types'

describe('monthsBetween', () => {
  it('counts month deltas', () => {
    expect(monthsBetween('2026-09', '2029-09')).toBe(36)
    expect(monthsBetween('2026-09', '2027-03')).toBe(6)
    expect(monthsBetween('2026-09', '2026-06')).toBe(-3)
  })
})

describe('addMonths', () => {
  it('rolls year', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-09', 1)).toBe('2026-10')
  })
})

describe('isMonthPast', () => {
  it('is past when before today', () => {
    expect(isMonthPast('2026-08')).toBe(true)
    expect(isMonthPast('2026-09')).toBe(false)
    expect(isMonthPast('2026-10')).toBe(false)
  })
})

describe('requiredMonthly', () => {
  const longGoal: Goal = {
    id: 'long-term-savings',
    target: 20000,
    currentSaved: 6000,
    deadline: '2029-09',
  }
  const shortGoal: Goal = {
    id: 'short-term-savings',
    target: 1500,
    currentSaved: 400,
    deadline: '2027-03',
  }

  it('divides remaining by months for fixture goals', () => {
    expect(requiredMonthly(longGoal, '2026-09')).toEqual({
      required: 388.89,
      passed: false,
    })
    expect(requiredMonthly(shortGoal, '2026-09')).toEqual({
      required: 183.33,
      passed: false,
    })
  })

  it('uses full shortfall when deadline passed', () => {
    const late: Goal = { ...shortGoal, deadline: '2026-06' }
    expect(requiredMonthly(late, '2026-09')).toEqual({
      required: 1100,
      passed: true,
    })
  })

  it('returns zero required when goal met', () => {
    const met: Goal = { ...shortGoal, currentSaved: 1500 }
    expect(requiredMonthly(met, '2026-09')).toEqual({
      required: 0,
      passed: false,
    })
  })
})