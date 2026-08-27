import type { BudgetPolicyStatus } from './budget'

export interface OptTenant {
  id: string
  name: string
  account: string
  status: 'ACTIVE' | 'DISABLED'
  productLines: string[]
  personalBudgetAllowed: boolean
  budgetPolicyStatus: BudgetPolicyStatus
  budgetCommitment: number
  budgetReserved: number
  budgetDraftCount: number
  authorizationUpdatedBy: string
  authorizationUpdatedAt: string
  authorizationReason: string
}
