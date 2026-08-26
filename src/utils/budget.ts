import type { BudgetPool, Currency, ExecutableBudget, MemberBudget } from '../types/budget'

interface AllocationInput {
  memberIds: string[]
  currency: Currency
  amount: number
}

interface RecoveryInput {
  memberId: string
  currency: Currency
  amount: number
}

interface BudgetMutationResult {
  members: MemberBudget[]
  pool: BudgetPool
}

export function deriveExecutableBudget(
  member: MemberBudget,
  pool: BudgetPool,
  currency: Currency,
): ExecutableBudget {
  const personalAvailable = Math.max(0, member[currency].available)
  const poolBudget = pool[currency]
  const accountExecutable = Math.min(personalAvailable, Math.max(0, poolBudget.spendable))
  const taskExecutable = Math.min(
    personalAvailable,
    Math.max(0, poolBudget.eligibleSpendable),
  )

  if (personalAvailable === 0) {
    return {
      accountExecutable: 0,
      taskExecutable: 0,
      reason: 'PERSONAL_BUDGET_INSUFFICIENT',
    }
  }

  if (poolBudget.status === 'INCONSISTENT' || accountExecutable < personalAvailable) {
    return {
      accountExecutable,
      taskExecutable: 0,
      reason: 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT',
    }
  }

  if (taskExecutable < personalAvailable) {
    return {
      accountExecutable,
      taskExecutable,
      reason: 'TENANT_ELIGIBLE_FUNDS_INSUFFICIENT',
    }
  }

  return {
    accountExecutable,
    taskExecutable,
    reason: null,
  }
}

function requirePositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('金额必须大于 0')
  }
}

export function allocateBudget(
  members: MemberBudget[],
  pool: BudgetPool,
  input: AllocationInput,
): BudgetMutationResult {
  requirePositiveAmount(input.amount)
  const targetIds = new Set(input.memberIds)
  const targets = members.filter((item) => targetIds.has(item.id))
  if (targets.length !== targetIds.size || targets.some((item) => item.status !== 'active')) {
    throw new Error('只能给正常租户成员分配额度')
  }

  const total = input.amount * targets.length
  if (total > pool[input.currency].unallocated) {
    throw new Error('租户未分配额度不足')
  }

  const nextMembers = members.map((item) => {
    if (!targetIds.has(item.id)) return item
    return {
      ...item,
      [input.currency]: {
        ...item[input.currency],
        allocated: item[input.currency].allocated + input.amount,
        available: item[input.currency].available + input.amount,
        alertBaseline: item[input.currency].available + item[input.currency].reserved + input.amount,
      },
    }
  })

  return {
    members: nextMembers,
    pool: {
      ...pool,
      [input.currency]: {
        ...pool[input.currency],
        allocatedAvailable: pool[input.currency].allocatedAvailable + total,
        unallocated: pool[input.currency].unallocated - total,
      },
    },
  }
}

export function recoverBudget(
  members: MemberBudget[],
  pool: BudgetPool,
  input: RecoveryInput,
): BudgetMutationResult {
  requirePositiveAmount(input.amount)
  const target = members.find((item) => item.id === input.memberId)
  if (!target || target.status !== 'active') {
    throw new Error('只能回收正常租户成员的额度')
  }
  if (input.amount > target[input.currency].available) {
    throw new Error('回收金额不能超过个人可用额度')
  }

  return {
    members: members.map((item) =>
      item.id === input.memberId
        ? {
            ...item,
            [input.currency]: {
              ...item[input.currency],
              available: item[input.currency].available - input.amount,
              alertBaseline: item[input.currency].available + item[input.currency].reserved - input.amount,
            },
          }
        : item,
    ),
    pool: {
      ...pool,
      [input.currency]: {
        ...pool[input.currency],
        allocatedAvailable: pool[input.currency].allocatedAvailable - input.amount,
        unallocated: pool[input.currency].unallocated + input.amount,
      },
    },
  }
}
