export type Currency = 'credits' | 'cro'

export type PoolStatus = 'NORMAL' | 'INCONSISTENT'

export type BudgetPolicyStatus =
  | 'DISABLED'
  | 'CONFIGURING'
  | 'ENABLING'
  | 'ENABLED'
  | 'DISABLING'

export type MemberStatus = 'active' | 'disabled'

export type MemberBudgetStatus = 'UNCONFIGURED' | 'ENABLING' | 'ENABLED' | 'ENABLE_FAILED'

export interface MemberBudgetDraft {
  credits: number
  cro: number
  note: string
}

export type BudgetBlockReason =
  | 'PERSONAL_BUDGET_INSUFFICIENT'
  | 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT'
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
  pendingAllocated: number
  unallocated: number
  spendable: number
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
  budgetStatus: MemberBudgetStatus
  activationDraft: MemberBudgetDraft | null
  lastSpentAt: string | null
  credits: CurrencyBudget
  cro: CurrencyBudget
}

export interface ExecutableBudget {
  accountExecutable: number
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
