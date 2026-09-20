import type { Goal } from "~/types/budget.types"
import { roundPenny } from "./money.utils"

interface ParsedMonth {
  year: number
  month: number
}

interface RequiredMonthlyResult {
  required: number
  passed: boolean
}

/**
 * Parses a month id in `YYYY-MM` form into year and month numbers.
 *
 * @param id - Month id, e.g. `"2026-09"`
 * @returns The year and 1-based month
 */
export const parseMonthId = (id: string): ParsedMonth => {
  const [year, month] = id.split('-').map(Number)
  return { year: year!, month: month! }
}

/**
 * Formats a year and month as a `YYYY-MM` id.
 *
 * @param year - Full year (e.g. `2026`)
 * @param month - 1-based month (`1`–`12`)
 * @returns Zero-padded month id, e.g. `"2026-09"`
 */
export const formatMonthId = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`

/**
 * Adds `months` to a month id (`YYYY-MM`).
 *
 * @param id - Month id
 * @param months - Number of months to add
 * @returns New month id
 */
export const addMonths = (id: string, delta: number): string => {
  const { year, month } = parseMonthId(id)
  const index = year * 12 + (month - 1) + delta
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return formatMonthId(y, m)
}

/**
 * Counts whole months from `from` to `to` (`YYYY-MM`).
 * Positive when `to` is after `from`; negative when before.
 *
 * @param from - Start month id
 * @param to - End month id
 * @returns Month delta (e.g. `"2026-09"` → `"2027-03"` is `6`)
 */
export const monthsBetween = (from: string, to: string): number => {
  const a = parseMonthId(from);
  const b = parseMonthId(to);
  return (b.year - a.year) * 12 + (b.month - a.month)
}

/**
 * Returns the current calendar month as a `YYYY-MM` id.
 *
 * @returns Today's month id in local time
 */
export const todayMonthId = (): string => {
  const now = new Date()
  return formatMonthId(now.getFullYear(), now.getMonth() + 1)
}

/**
 * Whether `viewedMonth` is before the current month.
 *
 * @param viewedMonth - Month id being viewed
 * @returns `true` if the viewed month is in the past
 */
export const isMonthPast = (viewedMonth: string): boolean => {
  const today = todayMonthId()
  return monthsBetween(today, viewedMonth) < 0
}

/**
 * Monthly savings needed to hit a goal by its deadline from the viewed month.
 * When the deadline has passed and savings remain, `passed` is `true` and
 * `required` is the full remaining shortfall.
 *
 * @param goal - Goal with target, saved amount, and deadline
 * @param viewedMonth - Month id the budget is calculated for
 * @returns Penny-rounded monthly requirement and whether the deadline has passed unmet
 */
export const requiredMonthly = (goal: Goal, viewedMonth: string): RequiredMonthlyResult => {
  const remaining = Math.max(0, goal.target - goal.currentSaved)
  const delta = monthsBetween(viewedMonth, goal.deadline)
  const passed = delta < 0 && remaining > 0
  const required = roundPenny(remaining / Math.max(1, delta))
  // delta < 0 → Math.max(1, delta) === 1 → full shortfall (deadline passed)
  return { required, passed }
}
