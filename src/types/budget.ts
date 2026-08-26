export type Currency = 'credits' | 'cro'

export type PoolStatus = 'NORMAL' | 'INCONSISTENT'

export type MemberStatus = 'active' | 'disabled'

export type BudgetBlockReason =
  | 'PERSONAL_BUDGET_INSUFFICIENT'
  | 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT'
  | 'TENANT_ELIGIBLE_FUNDS_INSUFFICIENT'
  | null

export interface CurrencyBudget {
  allocated: number
  available: number
  reserved: number
  consumed: number
  alertBaseline: number
}

export interface PoolCurrencyBudget {
  status: PoolStatus
  ledgerBalance: number
  reserved: number
  allocatedAvailable: number
  unallocated: number
  spendable: number
  eligibleSpendable: number
}

export interface BudgetPool {
  policyEnabled: boolean
  credits: PoolCurrencyBudget
  cro: PoolCurrencyBudget
}

export interface MemberBudget {
  id: string
  email: string
  name: string
  role: string
  status: MemberStatus
  lastSpentAt: string | null
  credits: CurrencyBudget
  cro: CurrencyBudget
}

export interface ExecutableBudget {
  accountExecutable: number
  taskExecutable: number
  reason: BudgetBlockReason
}

export type LedgerOperation =
  | 'ALLOCATION'
  | 'RECOVERY'
  | 'RESERVATION'
  | 'SETTLEMENT'
  | 'RELEASE'
  | 'REFUND'

export interface BudgetLedgerEntry {
  id: string
  memberId: string
  currency: Currency
  operation: LedgerOperation
  amount: number
  availableAfter: number
  reservedAfter: number
  actor: string
  timestamp: string
  taskId?: string
  note: string
}
