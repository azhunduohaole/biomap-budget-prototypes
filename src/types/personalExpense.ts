import type { Currency } from './budget'

export type PersonalBudgetStatus = '正常' | '即将耗尽' | '已全部预占' | '已耗尽' | '未分配'

export type PersonalBudgetBlockReason =
  | 'PERSONAL_BUDGET_INSUFFICIENT'
  | 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT'
  | 'TENANT_ELIGIBLE_FUNDS_INSUFFICIENT'
  | null

export interface PersonalBudgetOverview {
  currency: Currency
  serviceAvailable: boolean
  personalAvailable: number | null
  taskExecutable: number | null
  reserved: number | null
  consumed: number | null
  status: PersonalBudgetStatus | null
  blockingReason: PersonalBudgetBlockReason
}

export type ExpenseType = 'reservation' | 'deduction' | 'release' | 'refund'

export type ExpenseRecordStatus = '预占中' | '已扣减' | '已释放' | '已退款' | '失败'

export interface PersonalExpenseRecord {
  id: string
  ledgerId: string
  taskId: string
  taskType: string
  taskName: string
  productLine: string
  currency: Currency
  expenseType: ExpenseType
  amount: number
  status: ExpenseRecordStatus
  estimatedCost: number
  actualCost: number | null
  reservedAmount: number
  releasedAmount: number
  createdAt: string
  updatedAt: string
  operatedAt: string
  failureReason: string | null
}

export interface PersonalExpenseFilters {
  productLine: string
  taskName: string
  currency: '' | Currency
  status: '' | ExpenseRecordStatus
  expenseType: '' | ExpenseType
  dateFrom: string
  dateTo: string
}
