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
  outgoings: Outgoing[]
  builtIn: boolean
}

export interface Goal {
  id: string
  target: number
  currentSaved: number
  deadline: string
}

export interface GoalsRecord {
  longTerm: Goal
  shortTerm: Goal
}

export interface PriorityRatio {
  longTerm: number
  shortTerm: number
}

export interface MonthRecord {
  id: string // YYYY-MM
  pots: Pot[]
  salary: number | null
  priorityRatio: PriorityRatio
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