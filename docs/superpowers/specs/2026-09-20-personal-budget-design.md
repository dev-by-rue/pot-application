# Personal Budget App — Design Spec

**Date:** 2026-09-20  
**Status:** Approved for implementation planning  
**Stack:** Nuxt 4, TypeScript, SPA (`ssr: false`), Nuxt UI + Tailwind, Pinia, VueUse, `@nuxt/fonts`, ESLint, Vitest via `@nuxt/test-utils`

## Goal

Solo personal budgeting SPA in GBP (£). Plan monthly outgoings in pots, fund one Long Term and one Short Term savings goal from leftover, and surface Discretionary clearly. Mobile-first; Capacitor/app-store may come later — stay client-side. Auth is out of scope this pass; persistence is behind a small interface with a localStorage implementation.

## Terminology

| Term | Meaning |
|------|---------|
| **Pot** | Category bucket. Built-ins: Essentials, Debts, Subscriptions, Long Term Savings Goals, Short Term Savings Goals, Travel; plus user-added **standard** pots. |
| **Outgoing** | Named monthly line item inside a standard pot (`name` + `amount`). |
| **Discretionary** | Computed leftover after outgoings and allocated savings. Never an editable field. |

## Architecture

### Layers

1. **`utils/budget.ts`** — Pure calculation functions only. No Nuxt, Pinia, or DOM. Fully unit-tested.
2. **`services/persistence/`** — `BudgetRepository` port + `localStorageBudgetRepository`.
3. **`stores/budget.ts`** — Pinia source of truth: viewed month id, current month record, goals, persistence banner status, mutations that persist.
4. **Composables** — Thin helpers over the store where useful (`useBudgetSummary`, `usePersistenceBanner`, `useMonthNavigation`). Not a second store.
5. **`components/{budget,goals,history,layout}/`** — UI by feature. Three tabs (routes or shell + tab state; same UX).

### Persistence port

```ts
interface BudgetRepository {
  listMonths(): Promise<string[]>           // YYYY-MM ids, sorted
  loadMonth(id: string): Promise<MonthRecord | null>
  saveMonth(month: MonthRecord): Promise<void>
  loadGoals(): Promise<GoalsRecord>
  saveGoals(goals: GoalsRecord): Promise<void>
}
```

localStorage key namespace examples: `pot:months:{YYYY-MM}`, `pot:goals`, `pot:month-index`.

### Data model

**Goals (global — not per month):**

- Long Term + Short Term, each: `name`, `target`, `currentSaved`, `deadline` (`YYYY-MM`).

**Month record:**

- `id` (`YYYY-MM`)
- `salary`: `null` | number (empty salary is first-run / unset, not £0)
- `priorityRatio`: `{ long: number, short: number }` summing to 100 (per month)
- `pots`: Pot[]

**Pot:**

- `id`, `name`
- `kind`: `standard` | `long_term_savings` | `short_term_savings`
- `builtIn`: boolean
- `outgoings`: Outgoing[] (savings pots have no user outgoings; UI shows calculated allocation)

**Outgoing:** `id`, `name`, `amount`

**Derived (never persisted):** leftover, required/allocated per goal, Discretionary, underfunded flags, deadline-passed flags, exceed-salary message, salary percentages — always from `utils/budget.ts(month, goals)`.

**Percent of salary:** `roundpenny((amount / salary) * 100)` with one decimal place for display (e.g. `32.5%`). Only defined when `salary` is a number `> 0`; otherwise UI omits % (no division by zero).

### Install commands (not yet in scaffold)

```bash
npx nuxi module add pinia
npx nuxi module add vueuse
npx nuxi module add fonts
npx nuxi module add eslint
npx nuxi module add test-utils
npm i -D vitest @vue/test-utils happy-dom
```

Also set `ssr: false` in `nuxt.config.ts`.

## Calculations

Pure API in `utils/budget.ts`. Inputs: salary, standard pot outgoings, two goals, priority ratio, viewed month id. Outputs: leftover, required/allocated long & short, Discretionary, underfunded flags, deadline-passed flags, optional exceed-salary amount.

### Rules

1. **leftover** = salary − sum of standard pot outgoings. If salary is `null`, UI shows empty Discretionary state (do not treat as £0).
2. **required_monthly(goal)** = `max(0, target − currentSaved) ÷ max(1, monthsRemaining)` where `monthsRemaining` = deadline month − viewed month (in months). When `monthsRemaining ≤ 0` and the goal is unmet, this equals the full shortfall (divisor is at least 1).
3. If deadline is **before** the viewed month and the goal is unmet: show **“Deadline passed”** and treat the **full remaining shortfall** as required (still participates in allocation). Same numeric result as rule 2 when `monthsRemaining < 0`.
4. If **leftover ≤ 0**: allocated savings £0, Discretionary £0, show “Outgoings exceed salary by £X”. Goals with required > 0 are Underfunded.
5. If **required_long + required_short ≤ leftover**: both fully funded; Discretionary = leftover − both; ratio unused (show “Only used when funds fall short”).
6. Otherwise: Discretionary = £0. Split leftover by priority ratio; cap each at its required; give excess to the other goal. A goal with allocated < required is **Underfunded** (neutral/amber, not an error).
7. Round to the penny; **Discretionary absorbs rounding**.

### Test fixture (month `2026-09`, ratio 60/40)

Outgoings: Essentials (Rent 950, Council tax 160, Groceries 280, Energy 65), Debts (Car finance 210, Credit card 90), Subscriptions (Netflix 11, Phone 25, Gym 30), Travel (Train pass 60).  
Long Term: House deposit, target 20000, saved 6000, deadline 2029-09.  
Short Term: Holiday, target 1500, saved 400, deadline 2027-03.

| Salary | leftover | required L/S | allocated L/S | Discretionary | Notes |
|--------|----------|--------------|---------------|---------------|-------|
| £2,800 | £919 | £388.89 / £183.33 | full required | £346.78 | both funded |
| £2,300 | £419 | same required | £251.40 / £167.60 | £0 | both underfunded |

## Month lifecycle

### First run

Create today’s `YYYY-MM` with six built-in pots (empty outgoings), `salary: null`, goal shells (user fills fields), default ratio **60/40**.

### Navigation

- Budget month label with **prev/next** chevrons.
- Next only if that month already exists in storage.
- **Open next month** creates the following month (when allowed).

### Past vs active

- **Past** = viewed month is before today’s calendar `YYYY-MM`.
- Past months: **read-only** UI; **Open next month** hidden. (Editable past months = future phase.)
- Current and future months: editable.

### Open next month

- Visible only when viewed month ≥ today.
- If next month **missing**: duplicate current month’s pots, outgoings, salary, and ratio; **do not** copy or mutate goals; navigate to the new month.
- If next month **exists**: navigate only (no overwrite).
- **currentSaved** is never auto-incremented by allocated amounts; user updates goals manually.

### Goals tab month context

Goals fields are global. Required / allocated / underfunded / ratio use the **shared viewed month** (same as Budget).

## UI

### Shell

- Mobile-first (~390px primary).
- Bottom tab bar: Budget / Goals / History — `viewport-fit=cover`, `env(safe-area-inset-bottom)`, tap targets ≥ 44px; bottom sheets respect the inset.
- At `768px+`: centre app in a max-width column; on Budget, summary sticky beside pots list.

### Visual direction

Muted slate-green accent; amber for Underfunded only; soft cool stone-grey background with subtle tonal banding; humanist sans via `@nuxt/fonts`; tabular numerals for money. Functional clarity over decoration. Avoid purple/indigo gradients, cream + terracotta, dark-mode-first, glow, emoji, pill-stat strips.

Prototype (React/Lovable) is **layout/UX reference only** — same hierarchy and calm density; implement with Nuxt UI, not a code port. No requirement to use the prototype brand name “still.” unless chosen later.

### Budget tab

- Month chevrons + `YYYY-MM` label; salary input.
- Summary: Discretionary as hero; allocated long/short with Underfunded badges; standard outgoings total **and % of salary** (when salary > 0); exceed-salary message when needed.
- Empty salary: “Enter your salary to see your Discretionary” (not £0).
- Entry point: **“View breakdown”** opens the Breakdown sub-view (not a fourth tab).
- **Pot order:** Essentials → Debts → Subscriptions → Long Term Savings Goals → Short Term Savings Goals → Travel → user-added standard pots.
- Standard pots: add/rename/remove outgoings; rename pot (including built-in standard names); delete **user-added** pots only (built-ins remain).
- Savings pots: read-only allocated amount + “Edit in Goals”.
- Add pot (standard only).
- Open next month when allowed; helper: carries month forward as editable draft.

### Breakdown sub-view (from Budget)

- Full-screen or sheet pushed from Budget; back returns to Budget. Same viewed month; respects read-only past months.
- Safe-area insets as for other sheets.
- When salary is unset or ≤ 0: prompt to enter salary (no bogus percentages).
- When salary > 0, show in Budget pot order:
  - Each **standard** pot: £ total of outgoings + % of salary
  - **Long / Short Term Savings Goals:** £ allocated + % of salary
  - **Discretionary:** £ + % of salary
  - Optional header line: overall standard outgoings £ + % (same figure as summary)
- Percentages are informational only (not editable). Rows should sum to ~100% of salary when leftover ≥ 0 and savings are allocated from leftover; if outgoings exceed salary, standard-pot % may exceed 100% in aggregate — show figures honestly, no forced normalisation.

### Goals tab

- Exactly one Long Term and one Short Term editor: name, target, current saved, deadline.
- Show required monthly, allocated, underfunded, deadline-passed note.
- Priority ratio control for **viewed** month (long + short = 100%).
- Underfunded copy: “Leftover after outgoings isn't enough for both required rates, so it's split by your ratio.”
- When fully funded: “Only used when funds fall short”.

### History tab

- List **all** saved months.
- Tap a month → compare that month vs the **previous calendar month** if that id exists in storage (per-pot totals + Discretionary delta). Include savings pot allocated amounts and Discretionary in the comparison.
- No charts.
- Empty compare (no previous calendar month in storage): “Open next month to compare” (or equivalent).

### Persistence banner

| State | Behaviour / copy |
|-------|------------------|
| OK | Quiet success (subtle) |
| Read-only | “Persistence unavailable — changes won't survive refresh.” |
| Save error | “Couldn't save — retrying…” with retry/backoff |

Done criterion: each state can be triggered (real localStorage for OK; blocked/missing storage for read-only; failed save path for error; optional small dev-only force control for QA if needed).

## User capabilities (acceptance checklist)

| Capability | Supported |
|------------|-----------|
| Enter salary | Yes — Budget salary field |
| Set Long / Short Term goals with deadlines | Yes — exactly one of each (edit shells; no arbitrary extra goals) |
| Enter monthly outgoings by category (pots) | Yes |
| See % of salary taken by outgoings | Yes — summary overall %; Breakdown sub-view per pot / savings / Discretionary |
| See Discretionary (amount left after outgoings + allocated savings) | Yes — hero on Budget |
| Work month by month | Yes — navigate, open next, past read-only |
| View budgeting history | Yes — all months; compare to previous calendar month |

## Testing & done means

- TDD: write Vitest cases for `utils/budget.ts` before/with implementation — both fixture salaries, deadline-passed full shortfall, leftover ≤ 0, rounding absorption, ratio excess top-up, salary % helpers (including salary unset / ≤ 0).
- Light store tests optional; full E2E not required this pass.
- `npm run dev` — all three tabs + Breakdown sub-view work at mobile and desktop widths; edits persist across refresh; banner states triggerable; lint and tests pass.

## Out of scope (this pass)

Auth, Capacitor packaging, bank sync, transactions, charts, multi-user, editing past months, auto-incrementing `currentSaved` from allocations, remote persistence implementation (interface only).

## Decisions log (OPEN resolved)

| Topic | Decision |
|-------|----------|
| Deadline-passed required | Full remaining shortfall still counts as required |
| Open next month if exists | Navigate only; no overwrite |
| Open next month visibility | Hidden on past calendar months |
| Past definition | Before today’s `YYYY-MM` |
| Carry-forward / goals | Goals are global; opening next month duplicates only the month record (not goals / currentSaved) |
| Priority ratio | Per month; carried on duplicate |
| Project structure | Feature folders + thin Pinia + pure calc + persistence port; composables as thin helpers |
| Month navigation | Prev/next; Open next month creates |
| History | List all months; tap → vs previous calendar month |
| Goals tab month | Shared viewed month with Budget |
| Persistence API | Months + `loadGoals`/`saveGoals` |
| Past months | Read-only this pass |
| First run | Seed today, empty pots/salary, goal shells, ratio 60/40 |
| Pot mutability | Rename any non-savings pot; delete user-added only |
| Salary % / breakdown | Summary shows outgoings % of salary; Breakdown sub-view from Budget lists each pot (incl. allocated savings) + Discretionary as £ and % |
