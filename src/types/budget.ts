export type Currency = 'credits' | 'cro'

export type PoolStatus = 'NORMAL' | 'INCONSISTENT'

export type BudgetPolicyStatus =
  | 'DISABLED'
  | 'CONFIGURING'
  | 'ENABLING'
  | 'ENABLED'
  | 'DISABLING'

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
  entitlementAllowed: boolean
  policyStatus: BudgetPolicyStatus
  credits: PoolCurrencyBudget
  cro: PoolCurrencyBudget
}

export interface DraftBudgetEntry {
  memberId: string
  currency: Currency
  amount: number
  note: string
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
  | 'ADDITIONAL_RESERVATION'
  | 'SETTLEMENT'
  | 'RELEASE'
  | 'SYSTEM_RECOVERY'

export type LedgerRecordCategory = 'BUDGET_MANAGEMENT' | 'TASK_BILLING'

export type BillingScope = 'PERSONAL_BUDGET' | 'TENANT_ONLY' | null

export type LedgerStatus = 'SUCCESS' | 'PROCESSING' | 'FAILED'

export interface BudgetLedgerEntry {
  id: string
  memberId?: string
  memberName: string
  memberEmail: string
  currency: Currency
  recordCategory: LedgerRecordCategory
  billingScope: BillingScope
  operation: LedgerOperation
  amount: number
  status: LedgerStatus
  availableBefore?: number
  availableAfter?: number
  reservedBefore?: number
  reservedAfter?: number
  tenantLedgerBefore?: number
  tenantLedgerAfter?: number
  tenantReservedBefore?: number
  tenantReservedAfter?: number
  tenantUnallocatedBefore?: number
  tenantUnallocatedAfter?: number
  actor: string
  timestamp: string
  taskId?: string
  taskType?: string
  taskName?: string
  productLine?: string
  billingMethod?: string
  estimatedUsage?: string
  actualUsage?: string
  estimatedCost?: number
  actualCost?: number
  regularAmount?: number
  giftAmount?: number
  reservedAt?: string
  settledAt?: string
  note: string
  failureReason?: string
  idempotencyKey?: string
  migrated?: boolean
}
