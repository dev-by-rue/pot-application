# Personal Budget App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Nuxt 4 SPA personal budget app with pots/outgoings, dual savings goals, Discretionary + salary breakdown, History, and localStorage persistence behind a swappable repository.

**Architecture:** Pure calc in `app/utils/budget.ts` (Vitest-first); `BudgetRepository` + localStorage; thin Pinia store; feature components under `app/components/{budget,goals,history,layout}`; three tab pages + Breakdown slide-over from Budget.

**Tech Stack:** Nuxt 4, TypeScript, `ssr: false`, Nuxt UI + Tailwind, Pinia, VueUse, `@nuxt/fonts`, ESLint, Vitest + `@nuxt/test-utils` / happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-20-personal-budget-design.md`

## Global Constraints

- Currency GBP (£); format with `en-GB`; tabular numerals for all money.
- SPA only (`ssr: false`); no auth, bank sync, charts, or Capacitor this pass.
- Terminology: Pot / Outgoing / Discretionary exactly as in the spec.
- Past months (before today’s `YYYY-MM`): read-only; hide Open next month.
- Goals: exactly one Long Term + one Short Term (global); ratio is per month.
- Underfunded: amber badge only; not an error state.
- Copy strings from the spec verbatim where quoted.
- Visual: muted slate-green accent; cool stone-grey banding; no purple/indigo gradients, cream+terracotta, dark-first, glow, emoji, pill-stat strips.
- TDD for all calculation logic in `app/utils/budget.ts`.
- Persist via repository only — UI and calc never touch `localStorage` directly.

---

## File structure

| Path | Responsibility |
|------|----------------|
| `nuxt.config.ts` | Modules, `ssr: false`, fonts, CSS |
| `app/assets/css/main.css` | Theme tokens, banding background, tabular nums |
| `app/types/budget.ts` | Domain types (`Goal`, `Pot`, `MonthRecord`, etc.) |
| `app/utils/budget.ts` | Pure calc + month helpers + % + breakdown rows |
| `app/utils/budget.spec.ts` | Vitest unit tests for calc |
| `app/utils/money.ts` | `formatGbp`, parse helpers |
| `app/utils/seed.ts` | Built-in pots, empty goals, first-run month |
| `app/services/persistence/types.ts` | `BudgetRepository` interface |
| `app/services/persistence/localStorageBudgetRepository.ts` | localStorage impl |
| `app/services/persistence/localStorageBudgetRepository.spec.ts` | Repo tests (happy-dom) |
| `app/services/persistence/index.ts` | Factory / default export |
| `app/stores/budget.ts` | Pinia store |
| `app/composables/useBudgetSummary.ts` | Derived allocation from store |
| `app/composables/useMonthNavigation.ts` | Prev/next / open-next rules |
| `app/composables/usePersistenceBanner.ts` | Banner state helpers |
| `app/app.vue` | Root: UApp, banner, NuxtLayout/page |
| `app/layouts/default.vue` | Centred shell + bottom tab bar |
| `app/pages/index.vue` | Redirect → `/budget` |
| `app/pages/budget/index.vue` | Budget tab |
| `app/pages/goals.vue` | Goals tab |
| `app/pages/history/index.vue` | History list |
| `app/pages/history/[month].vue` | Month vs previous compare |
| `app/components/layout/AppTabBar.vue` | Safe-area bottom tabs |
| `app/components/layout/PersistenceBanner.vue` | OK / read-only / error |
| `app/components/budget/BudgetSummary.vue` | Discretionary hero + lines |
| `app/components/budget/MonthHeader.vue` | Chevrons + salary |
| `app/components/budget/PotEditor.vue` | Standard pot outgoings |
| `app/components/budget/SavingsPotCard.vue` | Read-only savings pot |
| `app/components/budget/BreakdownPanel.vue` | Slide-over breakdown |
| `app/components/goals/GoalEditor.vue` | One goal form |
| `app/components/goals/PriorityRatio.vue` | Slider + copy |
| `app/components/history/HistoryMonthList.vue` | All months list |
| `app/components/history/HistoryCompare.vue` | Per-pot + Discretionary delta |
| `vitest.config.ts` | Vitest + Nuxt environment |
| `package.json` | Scripts: `test`, `lint` |

---

### Task 1: Scaffold modules, SPA mode, Vitest, theme tokens

**Files:**
- Modify: `package.json`, `nuxt.config.ts`
- Create: `app/assets/css/main.css`, `vitest.config.ts`
- Modify: `app/app.vue` (minimal shell for now)

**Interfaces:**
- Consumes: none
- Produces: runnable `npm run test` / `npm run lint` / `npm run dev` with modules loaded

- [ ] **Step 1: Install modules**

```bash
npx nuxi module add pinia
npx nuxi module add vueuse
npx nuxi module add fonts
npx nuxi module add eslint
npx nuxi module add test-utils
npm i -D vitest @vue/test-utils happy-dom
```

- [ ] **Step 2: Configure Nuxt**

Replace `nuxt.config.ts` with:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/a11y', '@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  fonts: {
    families: [
      { name: 'Source Sans 3', provider: 'google', weights: [400, 600, 700] },
    ],
  },
  ui: {
    colorMode: false,
  },
})
```

- [ ] **Step 3: Theme CSS**

Create `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";

:root {
  --pot-accent: #4d6b5c;
  --pot-accent-muted: #6b8578;
  --pot-amber: #b45309;
  --pot-amber-soft: #fef3c7;
  --pot-stone-0: #f3f4f3;
  --pot-stone-1: #e8ebe9;
  --pot-ink: #1c2420;
  --pot-muted: #5c6b64;
  --font-sans: "Source Sans 3", ui-sans-serif, system-ui, sans-serif;
}

html {
  font-family: var(--font-sans);
  color: var(--pot-ink);
  background:
    linear-gradient(180deg, var(--pot-stone-0) 0%, var(--pot-stone-1) 48%, var(--pot-stone-0) 100%);
  min-height: 100%;
}

.money {
  font-variant-numeric: tabular-nums;
}

.underfunded {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--pot-amber);
  background: var(--pot-amber-soft);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
}
```

Map Nuxt UI primary to slate-green via app config if needed (`app.config.ts` primary: custom green). Prefer CSS variables above over purple defaults.

- [ ] **Step 4: Vitest + scripts**

Create `vitest.config.ts`:

```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['app/**/*.spec.ts'],
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"lint": "eslint ."
```

- [ ] **Step 5: Viewport meta for safe areas**

In `nuxt.config.ts` add:

```ts
app: {
  head: {
    viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
    title: 'Pot — Personal Budget',
  },
},
```

- [ ] **Step 6: Sanity-check**

Run: `npm run test`  
Expected: pass with 0 tests (or no-test success) / no config crash.

Run: `npm run lint`  
Expected: pass or only pre-existing noise; fix config errors before continuing.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json nuxt.config.ts vitest.config.ts app/assets/css/main.css app.config.ts 2>/dev/null
git add -u
git commit -m "chore: add pinia, fonts, eslint, vitest, spa mode and theme tokens"
```

---

### Task 2: Domain types + money helpers

**Files:**
- Create: `app/types/budget.ts`, `app/utils/money.ts`, `app/utils/money.spec.ts`

**Interfaces:**
- Consumes: none
- Produces: types below; `formatGbp(n: number): string`; `roundPenny(n: number): number`

- [ ] **Step 1: Write failing money tests**

Create `app/utils/money.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatGbp, roundPenny } from './money'

describe('roundPenny', () => {
  it('rounds to two decimal places', () => {
    expect(roundPenny(1.005)).toBe(1.01)
    expect(roundPenny(388.888)).toBe(388.89)
  })
})

describe('formatGbp', () => {
  it('formats en-GB currency', () => {
    expect(formatGbp(346.78)).toBe('£346.78')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test -- app/utils/money.spec.ts`  
Expected: FAIL cannot find module `./money`

- [ ] **Step 3: Implement types + money**

Create `app/types/budget.ts`:

```ts
export type PotKind = 'standard' | 'long_term_savings' | 'short_term_savings'

export interface Outgoing {
  id: string
  name: string
  amount: number
}

export interface Pot {
  id: string
  name: string
  kind: PotKind
  builtIn: boolean
  outgoings: Outgoing[]
}

export interface Goal {
  name: string
  target: number
  currentSaved: number
  deadline: string // YYYY-MM
}

export interface GoalsRecord {
  longTerm: Goal
  shortTerm: Goal
}

export interface PriorityRatio {
  long: number
  short: number
}

export interface MonthRecord {
  id: string // YYYY-MM
  salary: number | null
  priorityRatio: PriorityRatio
  pots: Pot[]
}

export interface BudgetAllocation {
  outgoingTotal: number
  leftover: number
  requiredLong: number
  requiredShort: number
  allocatedLong: number
  allocatedShort: number
  discretionary: number
  underLong: boolean
  underShort: boolean
  passedLong: boolean
  passedShort: boolean
  exceedsSalaryBy: number | null
  outgoingPercentOfSalary: number | null
}

export interface BreakdownRow {
  id: string
  label: string
  amount: number
  percentOfSalary: number | null
  kind: 'standard' | 'savings' | 'discretionary' | 'outgoings_total'
}
```

Create `app/utils/money.ts`:

```ts
export function roundPenny(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function formatGbp(value: number): string {
  return gbp.format(value)
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test -- app/utils/money.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/types/budget.ts app/utils/money.ts app/utils/money.spec.ts
git commit -m "feat: add budget domain types and money helpers"
```

---

### Task 3: Month helpers + required monthly (TDD)

**Files:**
- Create: `app/utils/budget.ts`, `app/utils/budget.spec.ts`

**Interfaces:**
- Consumes: `Goal` from types; `roundPenny` from money
- Produces:
  - `parseMonthId(id: string): { year: number; month: number }`
  - `formatMonthId(year: number, month: number): string`
  - `addMonths(id: string, delta: number): string`
  - `monthsBetween(fromId: string, toId: string): number`
  - `todayMonthId(now?: Date): string`
  - `isPastMonth(viewedId: string, todayId?: string): boolean`
  - `requiredMonthly(goal: Goal, viewedMonthId: string): { required: number; passed: boolean }`

- [ ] **Step 1: Write failing tests**

Create `app/utils/budget.spec.ts` (start with helpers + required):

```ts
import { describe, expect, it } from 'vitest'
import {
  addMonths,
  isPastMonth,
  monthsBetween,
  requiredMonthly,
  todayMonthId,
} from './budget'
import type { Goal } from '~/types/budget'

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

describe('isPastMonth', () => {
  it('is past when before today', () => {
    expect(isPastMonth('2026-08', '2026-09')).toBe(true)
    expect(isPastMonth('2026-09', '2026-09')).toBe(false)
    expect(isPastMonth('2026-10', '2026-09')).toBe(false)
  })
})

describe('requiredMonthly', () => {
  const longGoal: Goal = {
    name: 'House deposit',
    target: 20000,
    currentSaved: 6000,
    deadline: '2029-09',
  }
  const shortGoal: Goal = {
    name: 'Holiday',
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- app/utils/budget.spec.ts`  
Expected: FAIL module not found

- [ ] **Step 3: Implement helpers + requiredMonthly in `app/utils/budget.ts`**

```ts
import type { Goal } from '~/types/budget'
import { roundPenny } from './money'

export function parseMonthId(id: string): { year: number; month: number } {
  const [y, m] = id.split('-').map(Number)
  return { year: y!, month: m! }
}

export function formatMonthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function addMonths(id: string, delta: number): string {
  const { year, month } = parseMonthId(id)
  const index = year * 12 + (month - 1) + delta
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return formatMonthId(y, m)
}

export function monthsBetween(fromId: string, toId: string): number {
  const a = parseMonthId(fromId)
  const b = parseMonthId(toId)
  return (b.year - a.year) * 12 + (b.month - a.month)
}

export function todayMonthId(now: Date = new Date()): string {
  return formatMonthId(now.getFullYear(), now.getMonth() + 1)
}

export function isPastMonth(viewedId: string, todayId: string = todayMonthId()): boolean {
  return monthsBetween(todayId, viewedId) < 0
}

export function requiredMonthly(
  goal: Goal,
  viewedMonthId: string,
): { required: number; passed: boolean } {
  const remaining = Math.max(0, goal.target - goal.currentSaved)
  const delta = monthsBetween(viewedMonthId, goal.deadline)
  const passed = delta < 0 && remaining > 0
  const required = roundPenny(remaining / Math.max(1, delta))
  // delta < 0 → Math.max(1, delta) === 1 → full shortfall (deadline passed)
  return { required, passed }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- app/utils/budget.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/budget.ts app/utils/budget.spec.ts
git commit -m "feat: add month helpers and requiredMonthly with tests"
```

---

### Task 4: Core `calculateBudget` — fixture cases (TDD)

**Files:**
- Modify: `app/utils/budget.ts`, `app/utils/budget.spec.ts`

**Interfaces:**
- Consumes: types, `requiredMonthly`, `roundPenny`
- Produces: `calculateBudget(month: MonthRecord, goals: GoalsRecord): BudgetAllocation`  
  Also: `standardOutgoingTotal(month: MonthRecord): number`

- [ ] **Step 1: Add fixture + failing allocation tests**

Append to `app/utils/budget.spec.ts`:

```ts
import { calculateBudget, standardOutgoingTotal } from './budget'
import type { GoalsRecord, MonthRecord, Pot } from '~/types/budget'

function fixturePots(): Pot[] {
  return [
    {
      id: 'essentials', name: 'Essentials', kind: 'standard', builtIn: true,
      outgoings: [
        { id: '1', name: 'Rent', amount: 950 },
        { id: '2', name: 'Council tax', amount: 160 },
        { id: '3', name: 'Groceries', amount: 280 },
        { id: '4', name: 'Energy', amount: 65 },
      ],
    },
    {
      id: 'debts', name: 'Debts', kind: 'standard', builtIn: true,
      outgoings: [
        { id: '5', name: 'Car finance', amount: 210 },
        { id: '6', name: 'Credit card', amount: 90 },
      ],
    },
    {
      id: 'subscriptions', name: 'Subscriptions', kind: 'standard', builtIn: true,
      outgoings: [
        { id: '7', name: 'Netflix', amount: 11 },
        { id: '8', name: 'Phone', amount: 25 },
        { id: '9', name: 'Gym', amount: 30 },
      ],
    },
    {
      id: 'long_term_savings', name: 'Long Term Savings Goals',
      kind: 'long_term_savings', builtIn: true, outgoings: [],
    },
    {
      id: 'short_term_savings', name: 'Short Term Savings Goals',
      kind: 'short_term_savings', builtIn: true, outgoings: [],
    },
    {
      id: 'travel', name: 'Travel', kind: 'standard', builtIn: true,
      outgoings: [{ id: '10', name: 'Train pass', amount: 60 }],
    },
  ]
}

const fixtureGoals: GoalsRecord = {
  longTerm: {
    name: 'House deposit', target: 20000, currentSaved: 6000, deadline: '2029-09',
  },
  shortTerm: {
    name: 'Holiday', target: 1500, currentSaved: 400, deadline: '2027-03',
  },
}

function fixtureMonth(salary: number | null): MonthRecord {
  return {
    id: '2026-09',
    salary,
    priorityRatio: { long: 60, short: 40 },
    pots: fixturePots(),
  }
}

describe('standardOutgoingTotal', () => {
  it('sums standard pots only', () => {
    expect(standardOutgoingTotal(fixtureMonth(2800))).toBe(1881)
  })
})

describe('calculateBudget fixture', () => {
  it('funds both goals at £2800', () => {
    const result = calculateBudget(fixtureMonth(2800), fixtureGoals)
    expect(result.leftover).toBe(919)
    expect(result.requiredLong).toBe(388.89)
    expect(result.requiredShort).toBe(183.33)
    expect(result.allocatedLong).toBe(388.89)
    expect(result.allocatedShort).toBe(183.33)
    expect(result.discretionary).toBe(346.78)
    expect(result.underLong).toBe(false)
    expect(result.underShort).toBe(false)
    expect(result.exceedsSalaryBy).toBeNull()
    expect(result.outgoingPercentOfSalary).toBe(67.2) // 1881/2800*100 → 1dp
  })

  it('splits by ratio when underfunded at £2300', () => {
    const result = calculateBudget(fixtureMonth(2300), fixtureGoals)
    expect(result.leftover).toBe(419)
    expect(result.allocatedLong).toBe(251.4)
    expect(result.allocatedShort).toBe(167.6)
    expect(result.discretionary).toBe(0)
    expect(result.underLong).toBe(true)
    expect(result.underShort).toBe(true)
  })

  it('zeros savings when outgoings exceed salary', () => {
    const result = calculateBudget(fixtureMonth(1000), fixtureGoals)
    expect(result.leftover).toBeLessThanOrEqual(0)
    expect(result.allocatedLong).toBe(0)
    expect(result.allocatedShort).toBe(0)
    expect(result.discretionary).toBe(0)
    expect(result.exceedsSalaryBy).toBe(881)
    expect(result.underLong).toBe(true)
    expect(result.underShort).toBe(true)
  })

  it('returns null percent and skips allocation math display path when salary null', () => {
    const result = calculateBudget(fixtureMonth(null), fixtureGoals)
    expect(result.outgoingPercentOfSalary).toBeNull()
    // salary null: treat leftover path as unset — discretionary 0 internally but UI uses null salary flag
    expect(result.salaryMissing).toBe(true)
  })
})
```

Add `salaryMissing: boolean` to `BudgetAllocation` in types (UI uses it for empty state).

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- app/utils/budget.spec.ts`  
Expected: FAIL `calculateBudget` not exported

- [ ] **Step 3: Implement `calculateBudget`**

Append to `app/utils/budget.ts` (and update `BudgetAllocation` type with `salaryMissing: boolean`):

```ts
import type {
  BudgetAllocation,
  GoalsRecord,
  MonthRecord,
} from '~/types/budget'

export function standardOutgoingTotal(month: MonthRecord): number {
  return roundPenny(
    month.pots
      .filter((p) => p.kind === 'standard')
      .flatMap((p) => p.outgoings)
      .reduce((sum, o) => sum + o.amount, 0),
  )
}

export function percentOfSalary(
  amount: number,
  salary: number | null,
): number | null {
  if (salary === null || salary <= 0) return null
  return roundPenny((amount / salary) * 1000) / 10 // one decimal place
}

export function calculateBudget(
  month: MonthRecord,
  goals: GoalsRecord,
): BudgetAllocation {
  const outgoingTotal = standardOutgoingTotal(month)
  const salaryMissing = month.salary === null
  const salary = month.salary ?? 0
  const leftover = salaryMissing ? 0 : roundPenny(salary - outgoingTotal)

  const long = requiredMonthly(goals.longTerm, month.id)
  const short = requiredMonthly(goals.shortTerm, month.id)

  let allocatedLong = 0
  let allocatedShort = 0
  let discretionary = 0
  let exceedsSalaryBy: number | null = null

  if (!salaryMissing && leftover <= 0) {
    exceedsSalaryBy = roundPenny(Math.abs(leftover))
  } else if (!salaryMissing && leftover > 0) {
    const combined = roundPenny(long.required + short.required)
    if (combined <= leftover) {
      allocatedLong = long.required
      allocatedShort = short.required
      discretionary = roundPenny(leftover - allocatedLong - allocatedShort)
    } else {
      const longShare = roundPenny(leftover * (month.priorityRatio.long / 100))
      allocatedLong = Math.min(long.required, longShare)
      allocatedShort = Math.min(short.required, roundPenny(leftover - allocatedLong))
      let excess = roundPenny(leftover - allocatedLong - allocatedShort)
      if (excess > 0 && allocatedLong < long.required) {
        const topUp = Math.min(excess, roundPenny(long.required - allocatedLong))
        allocatedLong = roundPenny(allocatedLong + topUp)
        excess = roundPenny(excess - topUp)
      }
      if (excess > 0 && allocatedShort < short.required) {
        allocatedShort = roundPenny(
          allocatedShort + Math.min(excess, short.required - allocatedShort),
        )
      }
      discretionary = 0
    }
  }

  return {
    outgoingTotal,
    leftover: salaryMissing ? 0 : leftover,
    requiredLong: long.required,
    requiredShort: short.required,
    allocatedLong,
    allocatedShort,
    discretionary,
    underLong: allocatedLong < long.required,
    underShort: allocatedShort < short.required,
    passedLong: long.passed,
    passedShort: short.passed,
    exceedsSalaryBy,
    outgoingPercentOfSalary: percentOfSalary(outgoingTotal, month.salary),
    salaryMissing,
  }
}
```

If `1881/2800*100` one-decimal assertion fails (67.178… → 67.2), adjust `percentOfSalary` to `Math.round(amount / salary * 1000) / 10`.

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test -- app/utils/budget.spec.ts`  
Expected: all PASS. If allocated 251.40 vs 251.4 equality issues, use `toBeCloseTo` only as last resort — prefer exact pennies.

- [ ] **Step 5: Commit**

```bash
git add app/types/budget.ts app/utils/budget.ts app/utils/budget.spec.ts
git commit -m "feat: implement calculateBudget with fixture unit tests"
```

---

### Task 5: Breakdown rows helper (TDD)

**Files:**
- Modify: `app/utils/budget.ts`, `app/utils/budget.spec.ts`

**Interfaces:**
- Produces: `buildBreakdownRows(month: MonthRecord, goals: GoalsRecord): BreakdownRow[]`

- [ ] **Step 1: Write failing test**

```ts
import { buildBreakdownRows } from './budget'

describe('buildBreakdownRows', () => {
  it('returns null percents when salary missing', () => {
    const rows = buildBreakdownRows(fixtureMonth(null), fixtureGoals)
    expect(rows.every((r) => r.percentOfSalary === null)).toBe(true)
  })

  it('includes pots, savings allocations, discretionary in order', () => {
    const rows = buildBreakdownRows(fixtureMonth(2800), fixtureGoals)
    const labels = rows.map((r) => r.label)
    expect(labels[0]).toBe('Standard outgoings')
    expect(labels).toContain('Essentials')
    expect(labels).toContain('Long Term Savings Goals')
    expect(labels).toContain('Discretionary')
    const disc = rows.find((r) => r.kind === 'discretionary')!
    expect(disc.amount).toBe(346.78)
    expect(disc.percentOfSalary).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `buildBreakdownRows`**

Order: header `Standard outgoings` total → each pot in month.pots order (standard = outgoing sum; savings kinds = allocated from `calculateBudget`) → Discretionary.

```ts
export function buildBreakdownRows(
  month: MonthRecord,
  goals: GoalsRecord,
): BreakdownRow[] {
  const allocation = calculateBudget(month, goals)
  const rows: BreakdownRow[] = [
    {
      id: 'outgoings_total',
      label: 'Standard outgoings',
      amount: allocation.outgoingTotal,
      percentOfSalary: allocation.outgoingPercentOfSalary,
      kind: 'outgoings_total',
    },
  ]
  for (const pot of month.pots) {
    if (pot.kind === 'standard') {
      const amount = roundPenny(pot.outgoings.reduce((s, o) => s + o.amount, 0))
      rows.push({
        id: pot.id,
        label: pot.name,
        amount,
        percentOfSalary: percentOfSalary(amount, month.salary),
        kind: 'standard',
      })
    } else if (pot.kind === 'long_term_savings') {
      rows.push({
        id: pot.id,
        label: pot.name,
        amount: allocation.allocatedLong,
        percentOfSalary: percentOfSalary(allocation.allocatedLong, month.salary),
        kind: 'savings',
      })
    } else if (pot.kind === 'short_term_savings') {
      rows.push({
        id: pot.id,
        label: pot.name,
        amount: allocation.allocatedShort,
        percentOfSalary: percentOfSalary(allocation.allocatedShort, month.salary),
        kind: 'savings',
      })
    }
  }
  rows.push({
    id: 'discretionary',
    label: 'Discretionary',
    amount: allocation.discretionary,
    percentOfSalary: percentOfSalary(allocation.discretionary, month.salary),
    kind: 'discretionary',
  })
  return rows
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add app/utils/budget.ts app/utils/budget.spec.ts
git commit -m "feat: add salary breakdown row builder with tests"
```

---

### Task 6: Seed helpers

**Files:**
- Create: `app/utils/seed.ts`, `app/utils/seed.spec.ts`

**Interfaces:**
- Produces:
  - `createBuiltInPots(): Pot[]` — six built-ins, empty outgoings, correct order
  - `createEmptyGoals(): GoalsRecord` — empty name strings, 0 targets, deadline = today+12m / today+36m or blank `''` — use empty name, target 0, currentSaved 0, deadline = `addMonths(todayMonthId(), 12)` short / `addMonths(..., 36)` long
  - `createEmptyMonth(id: string): MonthRecord` — salary null, ratio 60/40, built-in pots

- [ ] **Step 1: Write tests for pot order + ratio defaults**

```ts
import { describe, expect, it } from 'vitest'
import { createBuiltInPots, createEmptyMonth } from './seed'

describe('createBuiltInPots', () => {
  it('returns six pots in Budget order', () => {
    const ids = createBuiltInPots().map((p) => p.id)
    expect(ids).toEqual([
      'essentials',
      'debts',
      'subscriptions',
      'long_term_savings',
      'short_term_savings',
      'travel',
    ])
  })
})

describe('createEmptyMonth', () => {
  it('uses null salary and 60/40 ratio', () => {
    const m = createEmptyMonth('2026-09')
    expect(m.salary).toBeNull()
    expect(m.priorityRatio).toEqual({ long: 60, short: 40 })
  })
})
```

- [ ] **Step 2–4: Implement, pass, commit**

```bash
git commit -m "feat: add first-run seed helpers"
```

---

### Task 7: Persistence repository (TDD)

**Files:**
- Create: `app/services/persistence/types.ts`, `localStorageBudgetRepository.ts`, `localStorageBudgetRepository.spec.ts`, `index.ts`

**Interfaces:**
- Produces exact port:

```ts
export interface BudgetRepository {
  listMonths(): Promise<string[]>
  loadMonth(id: string): Promise<MonthRecord | null>
  saveMonth(month: MonthRecord): Promise<void>
  loadGoals(): Promise<GoalsRecord>
  saveGoals(goals: GoalsRecord): Promise<void>
}
```

Keys: `pot:month-index` (JSON string[]), `pot:months:{id}`, `pot:goals`.

`loadGoals` when missing → `createEmptyGoals()`.  
`saveMonth` upserts id into index (sorted).

- [ ] **Step 1: Write repo tests using happy-dom localStorage**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageBudgetRepository } from './localStorageBudgetRepository'
import { createEmptyMonth } from '~/utils/seed'
import { createEmptyGoals } from '~/utils/seed'

describe('LocalStorageBudgetRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads a month', async () => {
    const repo = new LocalStorageBudgetRepository()
    const month = createEmptyMonth('2026-09')
    month.salary = 2800
    await repo.saveMonth(month)
    expect(await repo.listMonths()).toEqual(['2026-09'])
    expect(await repo.loadMonth('2026-09')).toEqual(month)
  })

  it('saves and loads goals', async () => {
    const repo = new LocalStorageBudgetRepository()
    const goals = createEmptyGoals()
    goals.longTerm.name = 'House'
    await repo.saveGoals(goals)
    expect((await repo.loadGoals()).longTerm.name).toBe('House')
  })

  it('returns empty goals when unset', async () => {
    const repo = new LocalStorageBudgetRepository()
    const goals = await repo.loadGoals()
    expect(goals.longTerm.target).toBe(0)
  })
})
```

- [ ] **Step 2: FAIL → implement class → PASS**

Constructor may accept `Storage` for test injection: `constructor(private storage: Storage = localStorage)`.

On `getItem` throwing / storage undefined: methods throw a typed error `PersistenceUnavailableError` that the store maps to read-only banner.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add localStorage BudgetRepository"
```

---

### Task 8: Pinia budget store

**Files:**
- Create: `app/stores/budget.ts`
- Optional: `app/stores/budget.spec.ts` for open-next / past read-only

**Interfaces:**
- Produces store state + actions:

```ts
// state
viewedMonthId: string
month: MonthRecord | null
goals: GoalsRecord
monthIds: string[]
persistenceStatus: 'ok' | 'readonly' | 'error'
ready: boolean
forcePersistenceStatus: 'ok' | 'readonly' | 'error' | null // dev QA override

// getters
isViewedPast: boolean
isReadOnly: boolean // past || readonly persistence
allocation: BudgetAllocation // via calculateBudget

// actions
init(): Promise<void>
setViewedMonth(id: string): Promise<void>
goPrevMonth(): Promise<void>
goNextMonth(): Promise<void> // only if next exists
openNextMonth(): Promise<void>
updateSalary(value: number | null): void
updateRatio(long: number): void // short = 100 - long
updateGoals(partial): void
mutatePot(...): void // add/rename/delete outgoing, rename pot, add/delete user pot
scheduleSave(): void // debounce 300ms; skip if isReadOnly; on failure → error + retry
```

- [ ] **Step 1: Implement `init`**

1. Try `listMonths` / `loadGoals`. On failure → `persistenceStatus = 'readonly'`, still seed in-memory month for session.
2. If no months: `createEmptyMonth(todayMonthId())`, `saveMonth`, `saveGoals(createEmptyGoals())`.
3. Set `viewedMonthId` to today if present else latest ≤ today else latest.

- [ ] **Step 2: Implement `openNextMonth`**

```ts
const nextId = addMonths(viewedMonthId, 1)
if (monthIds.includes(nextId)) {
  await setViewedMonth(nextId)
  return
}
const clone: MonthRecord = {
  ...structuredClone(month),
  id: nextId,
}
await repo.saveMonth(clone)
await setViewedMonth(nextId)
```

Guard: no-op if `isPastMonth(viewedMonthId)`.

- [ ] **Step 3: Debounced save with retry**

Use VueUse `useDebounceFn`. On save error: set `error`, `setTimeout` retry up to 3 times, then stay on error until next edit.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add Pinia budget store with persistence and open-next-month"
```

---

### Task 9: Composables

**Files:**
- Create: `app/composables/useBudgetSummary.ts`, `useMonthNavigation.ts`, `usePersistenceBanner.ts`

**Interfaces:**
- `useBudgetSummary()` → `{ allocation, breakdownRows, salaryMissing }` from store
- `useMonthNavigation()` → `{ canGoPrev, canGoNext, canOpenNext, openLabel, goPrev, goNext, openNext }`
- `usePersistenceBanner()` → `{ status, message, effectiveStatus }` honouring `forcePersistenceStatus`

- [ ] **Step 1: Implement thin wrappers (no duplicate state)**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add budget composables"
```

---

### Task 10: App shell — layout, tab bar, persistence banner

**Files:**
- Modify: `app/app.vue`
- Create: `app/layouts/default.vue`, `app/components/layout/AppTabBar.vue`, `app/components/layout/PersistenceBanner.vue`
- Create: `app/pages/index.vue` → navigate to `/budget`
- Create: stub pages `budget/index.vue`, `goals.vue`, `history/index.vue` with placeholders

**UI requirements:**
- Max width ~28rem mobile; at `md:` centre, max-w-5xl
- Bottom tab bar: `padding-bottom: env(safe-area-inset-bottom)`; each tab `min-h-11` (44px)
- On mount call `useBudgetStore().init()`
- Dev-only `<select>` for force banner state when `import.meta.dev`

- [ ] **Step 1: Build layout + banner copy**

Exact strings:
- read-only: `Persistence unavailable — changes won't survive refresh.`
- error: `Couldn't save — retrying…`

- [ ] **Step 2: Verify in browser at 390px and 768px** — tabs switch routes

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add app shell with safe-area tab bar and persistence banner"
```

---

### Task 11: Budget tab UI

**Files:**
- Modify: `app/pages/budget/index.vue`
- Create: `BudgetSummary.vue`, `MonthHeader.vue`, `PotEditor.vue`, `SavingsPotCard.vue`

**Behaviour:**
- Wire store mutations; disable inputs when `isReadOnly`
- Summary: Discretionary hero OR empty copy `Enter your salary to see your Discretionary`
- Show exceed message when `exceedsSalaryBy`
- Outgoings line with `formatGbp` + percent when available
- Pot list in store order; standard → `PotEditor`; savings → `SavingsPotCard` with allocated + link to `/goals`
- Add pot button → new standard non-builtIn pot
- Open next month button when `canOpenNext`
- “View breakdown” opens panel (Task 12)

Desktop: `md:grid md:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.4fr)]`; summary `md:sticky md:top-20`

- [ ] **Step 1: Implement components against store**

- [ ] **Step 2: Manual check — edit salary/outgoing, refresh, data persists**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: implement Budget tab with pots and summary"
```

---

### Task 12: Breakdown sub-view

**Files:**
- Create: `app/components/budget/BreakdownPanel.vue`
- Modify: `app/pages/budget/index.vue`

Use Nuxt UI `USlideover` (or `UModal`) with `v-model:open`, back/close control, `pb-[env(safe-area-inset-bottom)]`.

- Salary missing: prompt to enter salary
- Else: render `buildBreakdownRows` — label, `formatGbp(amount)`, percent `xx.x%` when not null

- [ ] **Step 1: Implement + wire “View breakdown”**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add Budget salary breakdown slide-over"
```

---

### Task 13: Goals tab

**Files:**
- Modify: `app/pages/goals.vue`
- Create: `GoalEditor.vue`, `PriorityRatio.vue`

- Two editors bound to `goals.longTerm` / `shortTerm` via store `updateGoals`
- Show required, allocated, underfunded badge, “Deadline passed”
- Ratio slider steps of 5; updates `month.priorityRatio` for **viewed** month
- Underfunded copy exact: `Leftover after outgoings isn't enough for both required rates, so it's split by your ratio.`
- Fully funded helper: `Only used when funds fall short`
- Read-only when past month (ratio + fields: goals global still editable? **Spec:** past months read-only UI — lock ratio with month; allow editing global goal fields always OR lock entire Goals tab when viewed month past. **Decide in impl:** lock ratio when past; keep goal field edits enabled so user can update currentSaved anytime.)

Clarify for implementer: **Goal fields always editable; ratio locked when `isViewedPast`.**

- [ ] **Step 1: Implement**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: implement Goals tab with priority ratio"
```

---

### Task 14: History tab

**Files:**
- Modify: `app/pages/history/index.vue`
- Create: `app/pages/history/[month].vue`, `HistoryMonthList.vue`, `HistoryCompare.vue`

- List `monthIds` descending
- Tap → `/history/{id}`
- Compare `id` vs `addMonths(id, -1)` if that id exists in `monthIds`; else empty state `Open next month to compare`
- Load both months + goals; run `calculateBudget` each; per-pot totals by pot name; savings allocated rows; Discretionary delta with signed display

- [ ] **Step 1: Implement list + compare**

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: implement History list and month comparison"
```

---

### Task 15: End-to-end verification + polish

**Files:** touch as needed for lint/test/a11y

- [ ] **Step 1: Run full suite**

```bash
npm run test
npm run lint
```

Expected: all tests pass; lint clean.

- [ ] **Step 2: Manual acceptance**

1. First run empty salary message  
2. Enter salary + outgoings → Discretionary updates  
3. Goals + ratio → underfunded/funded states  
4. View breakdown percentages  
5. Open next month → duplicate; refresh persists  
6. Navigate to past month → read-only; no Open next  
7. History list + compare  
8. Force banner states via dev control  

- [ ] **Step 3: Final commit if polish needed**

```bash
git commit -m "fix: polish budget app to match acceptance checklist"
```

---

## Spec coverage self-review

| Spec area | Task(s) |
|-----------|---------|
| Stack / SPA / modules / theme | 1 |
| Types / money | 2 |
| Calc rules + fixtures + deadline-passed | 3–4 |
| Salary % + breakdown rows | 4–5, 12 |
| Seed / first run | 6, 8 |
| Persistence port + localStorage + banners | 7, 8, 10 |
| Store / open next / past read-only | 8–9 |
| Budget UI + sticky summary | 11 |
| Breakdown sub-view | 12 |
| Goals + ratio copy | 13 |
| History all months + compare | 14 |
| Safe-area tabs | 10 |
| Done means / lint / tests | 15 |

**Gaps fixed in plan:** `salaryMissing` on allocation; goal fields editable when viewing past but ratio locked; percent one-decimal helper; PersistenceUnavailableError → readonly.

**No placeholders** remaining after the goal-fields clarification in Task 13.
