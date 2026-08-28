import type {
  BudgetPool,
  Currency,
  DraftBudgetEntry,
  ExecutableBudget,
  MemberBudgetDraft,
  MemberBudget,
} from '../types/budget'

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

interface MemberBudgetConfirmation {
  memberId: string
  credits: number
  cro: number
  note: string
}

function requireNonNegativeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('额度必须为 0 或更大')
  }
}

function activeMembersAreEnabled(members: MemberBudget[]) {
  return members.filter((item) => item.status === 'active').every((item) => item.budgetStatus === 'ENABLED')
}

export function confirmMemberBudgets(
  members: MemberBudget[],
  pool: BudgetPool,
  confirmations: MemberBudgetConfirmation[],
): BudgetMutationResult {
  if (pool.policyStatus !== 'CONFIGURING') {
    throw new Error('只有配置中的租户策略可以确认成员预算')
  }
  const uniqueIds = new Set(confirmations.map((item) => item.memberId))
  if (uniqueIds.size !== confirmations.length) {
    throw new Error('同一成员不能重复提交预算')
  }
  const targets = confirmations.map((input) => members.find((item) => item.id === input.memberId))
  if (targets.some((item) => !item || item.status !== 'active')) {
    throw new Error('只能给正常租户成员配置预算')
  }
  if (targets.some((item) => item && (item.budgetStatus === 'ENABLING' || item.budgetStatus === 'ENABLED'))) {
    throw new Error('该成员预算正在生效或已经生效')
  }
  for (const input of confirmations) {
    requireNonNegativeAmount(input.credits)
    requireNonNegativeAmount(input.cro)
  }
  const totals = confirmations.reduce((result, input) => ({
    credits: result.credits + input.credits,
    cro: result.cro + input.cro,
  }), { credits: 0, cro: 0 })
  for (const currency of ['credits', 'cro'] as const) {
    if (totals[currency] > pool[currency].unallocated) {
      throw new Error(`${currency === 'credits' ? 'Credits' : 'CRO币'}待生效额度超过租户未分配额度`)
    }
    if (totals[currency] > 0 && pool[currency].status === 'INCONSISTENT') {
      throw new Error(`${currency === 'credits' ? 'Credits' : 'CRO币'}预算池异常，修复前不能确认成员预算`)
    }
  }

  const byId = new Map(confirmations.map((item) => [item.memberId, item]))
  const nextMembers = members.map((member) => {
    const input = byId.get(member.id)
    if (!input) return member
    const activationDraft: MemberBudgetDraft = {
      credits: input.credits,
      cro: input.cro,
      note: input.note,
    }
    return { ...member, budgetStatus: 'ENABLING' as const, activationDraft }
  })

  return {
    members: nextMembers,
    pool: {
      ...pool,
      credits: {
        ...pool.credits,
        pendingAllocated: pool.credits.pendingAllocated + totals.credits,
        unallocated: pool.credits.unallocated - totals.credits,
      },
      cro: {
        ...pool.cro,
        pendingAllocated: pool.cro.pendingAllocated + totals.cro,
        unallocated: pool.cro.unallocated - totals.cro,
      },
    },
  }
}

export function completeMemberBudgetActivation(
  members: MemberBudget[],
  pool: BudgetPool,
  memberId: string,
  succeeded: boolean,
): BudgetMutationResult {
  const target = members.find((item) => item.id === memberId)
  if (!target || !target.activationDraft || target.budgetStatus !== 'ENABLING') {
    throw new Error('该成员没有待生效预算')
  }
  const draft = target.activationDraft
  const nextMembers = members.map((member) => {
    if (member.id !== memberId) return member
    if (!succeeded) return { ...member, budgetStatus: 'ENABLE_FAILED' as const }
    return {
      ...member,
      budgetStatus: 'ENABLED' as const,
      activationDraft: null,
      credits: {
        ...member.credits,
        allocated: member.credits.allocated + draft.credits,
        available: member.credits.available + draft.credits,
        alertBaseline: member.credits.available + member.credits.reserved + draft.credits,
      },
      cro: {
        ...member.cro,
        allocated: member.cro.allocated + draft.cro,
        available: member.cro.available + draft.cro,
        alertBaseline: member.cro.available + member.cro.reserved + draft.cro,
      },
    }
  })
  const nextPool = {
    ...pool,
    credits: {
      ...pool.credits,
      pendingAllocated: pool.credits.pendingAllocated - draft.credits,
      allocatedAvailable: pool.credits.allocatedAvailable + (succeeded ? draft.credits : 0),
      unallocated: pool.credits.unallocated + (succeeded ? 0 : draft.credits),
    },
    cro: {
      ...pool.cro,
      pendingAllocated: pool.cro.pendingAllocated - draft.cro,
      allocatedAvailable: pool.cro.allocatedAvailable + (succeeded ? draft.cro : 0),
      unallocated: pool.cro.unallocated + (succeeded ? 0 : draft.cro),
    },
  }
  return {
    members: nextMembers,
    pool: {
      ...nextPool,
      policyStatus: succeeded && activeMembersAreEnabled(nextMembers) ? 'ENABLED' : nextPool.policyStatus,
    },
  }
}

export function upsertDraftBudget(
  drafts: DraftBudgetEntry[],
  nextDraft: DraftBudgetEntry,
): DraftBudgetEntry[] {
  const existing = drafts.find(
    (item) => item.memberId === nextDraft.memberId && item.currency === nextDraft.currency,
  )
  if (!existing) return [...drafts, nextDraft]

  return drafts.map((item) =>
    item === existing
      ? { ...nextDraft, amount: item.amount + nextDraft.amount }
      : item,
  )
}

export function activateDraftBudgets(
  members: MemberBudget[],
  pool: BudgetPool,
  drafts: DraftBudgetEntry[],
): BudgetMutationResult {
  for (const currency of ['credits', 'cro'] as const) {
    const total = drafts
      .filter((item) => item.currency === currency)
      .reduce((sum, item) => sum + item.amount, 0)
    if (total > pool[currency].unallocated) {
      throw new Error('首轮分配总额不能超过租户未分配额度')
    }
    if (total > 0 && pool[currency].status === 'INCONSISTENT') {
      throw new Error('预算池异常，修复前不能确认启用')
    }
  }

  return drafts.reduce<BudgetMutationResult>((current, draft) =>
    allocateBudget(current.members, current.pool, {
      memberIds: [draft.memberId],
      currency: draft.currency,
      amount: draft.amount,
    }), { members, pool })
}

export function resetActiveCommitments(
  members: MemberBudget[],
  pool: BudgetPool,
): BudgetMutationResult {
  const nextMembers = members.map((item) => ({
    ...item,
    budgetStatus: item.status === 'active' ? 'UNCONFIGURED' as const : item.budgetStatus,
    activationDraft: null,
    credits: { ...item.credits, available: 0, reserved: 0, alertBaseline: 0 },
    cro: { ...item.cro, available: 0, reserved: 0, alertBaseline: 0 },
  }))

  return {
    members: nextMembers,
    pool: {
      ...pool,
      credits: {
        ...pool.credits,
        status: 'NORMAL',
        allocatedAvailable: 0,
        pendingAllocated: 0,
        reserved: 0,
        unallocated: Math.max(0, pool.credits.ledgerBalance),
        spendable: Math.max(0, pool.credits.ledgerBalance),
      },
      cro: {
        ...pool.cro,
        status: 'NORMAL',
        allocatedAvailable: 0,
        pendingAllocated: 0,
        reserved: 0,
        unallocated: Math.max(0, pool.cro.ledgerBalance),
        spendable: Math.max(0, pool.cro.ledgerBalance),
      },
    },
  }
}

export function deriveExecutableBudget(
  member: MemberBudget,
  pool: BudgetPool,
  currency: Currency,
): ExecutableBudget {
  const personalAvailable = Math.max(0, member[currency].available)
  const poolBudget = pool[currency]
  const accountExecutable = Math.min(personalAvailable, Math.max(0, poolBudget.spendable))

  if (personalAvailable === 0) {
    return {
      accountExecutable: 0,
      reason: 'PERSONAL_BUDGET_INSUFFICIENT',
    }
  }

  if (poolBudget.status === 'INCONSISTENT') {
    return {
      accountExecutable: 0,
      reason: 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT',
    }
  }

  if (accountExecutable < personalAvailable) {
    return {
      accountExecutable,
      reason: 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT',
    }
  }

  return {
    accountExecutable,
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
