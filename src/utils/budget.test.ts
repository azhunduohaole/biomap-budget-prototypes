import { describe, expect, it } from 'vitest'

import type { BudgetPool, CurrencyBudget, MemberBudget, PoolStatus } from '../types/budget'
import { initialMembers, initialPool } from '../data/mockData'
import {
  allocateBudget,
  completeMemberBudgetActivation,
  confirmMemberBudgets,
  deriveExecutableBudget,
  recoverBudget,
  resetActiveCommitments,
} from './budget'

const currencyBudget = (available: number): CurrencyBudget => ({
  allocated: available,
  available,
  reserved: 0,
  consumed: 0,
  alertBaseline: available,
})

const member = (available: number): MemberBudget => ({
  id: 'member-1',
  email: 'researcher@biomap.com',
  name: 'Researcher',
  role: '抗体研究员',
  status: 'active',
  budgetStatus: 'UNCONFIGURED',
  activationDraft: null,
  lastSpentAt: '2026-08-25 16:22:08',
  credits: currencyBudget(available),
  cro: currencyBudget(available),
})

const pool = (
  spendable: number,
  eligibleSpendable: number,
  status: PoolStatus = 'NORMAL',
  ): BudgetPool => ({
    entitlementAllowed: true,
    policyStatus: 'ENABLED',
  credits: {
    status,
    ledgerBalance: spendable,
    reserved: 0,
    allocatedAvailable: 0,
    pendingAllocated: 0,
    unallocated: 0,
    spendable,
    eligibleSpendable,
  },
  cro: {
    status,
    ledgerBalance: spendable,
    reserved: 0,
    allocatedAvailable: 0,
    pendingAllocated: 0,
    unallocated: 0,
    spendable,
    eligibleSpendable,
  },
})

describe('deriveExecutableBudget', () => {
  it('caps task executable amount by task-eligible tenant funds', () => {
    expect(deriveExecutableBudget(member(800), pool(1_000, 300), 'credits')).toEqual({
      accountExecutable: 800,
      taskExecutable: 300,
      reason: 'TENANT_ELIGIBLE_FUNDS_INSUFFICIENT',
    })
  })

  it('keeps personal budget visible when the tenant pool is inconsistent', () => {
    expect(deriveExecutableBudget(member(800), pool(0, 0, 'INCONSISTENT'), 'credits')).toEqual({
      accountExecutable: 0,
      taskExecutable: 0,
      reason: 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT',
    })
  })

  it('reports personal budget exhaustion before tenant capacity', () => {
    expect(deriveExecutableBudget(member(0), pool(5_000, 5_000), 'credits')).toEqual({
      accountExecutable: 0,
      taskExecutable: 0,
      reason: 'PERSONAL_BUDGET_INSUFFICIENT',
    })
  })

  it('isolates an inconsistent CRO pool from healthy Credits', () => {
    const sourcePool = pool(5_000, 5_000)
    sourcePool.cro.status = 'INCONSISTENT'

    expect(deriveExecutableBudget(member(800), sourcePool, 'credits').reason).toBeNull()
    expect(deriveExecutableBudget(member(800), sourcePool, 'cro')).toEqual({
      accountExecutable: 800,
      taskExecutable: 0,
      reason: 'TENANT_PAYMENT_CAPACITY_INSUFFICIENT',
    })
  })
})

describe('budget mutations', () => {
  it('reserves one member commitment without enabling or blocking another member', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 1_000
    sourcePool.cro.unallocated = 1_000
    sourcePool.policyStatus = 'CONFIGURING'
    const secondMember = { ...member(0), id: 'member-2', email: 'second@biomap.com' }

    const confirmed = confirmMemberBudgets([member(0), secondMember], sourcePool, [{
      memberId: 'member-1',
      credits: 300,
      cro: 120,
      note: '首轮成员预算',
    }])

    expect(confirmed.members[0]).toMatchObject({
      budgetStatus: 'ENABLING',
      activationDraft: { credits: 300, cro: 120, note: '首轮成员预算' },
    })
    expect(confirmed.members[0].credits.available).toBe(0)
    expect(confirmed.members[1].budgetStatus).toBe('UNCONFIGURED')
    expect(confirmed.pool.policyStatus).toBe('CONFIGURING')
    expect(confirmed.pool.credits.pendingAllocated).toBe(300)
    expect(confirmed.pool.credits.unallocated).toBe(700)
    expect(confirmed.pool.cro.pendingAllocated).toBe(120)
    expect(confirmed.pool.cro.unallocated).toBe(880)
  })

  it('enables an explicitly configured zero-budget member', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 1_000
    sourcePool.cro.unallocated = 1_000
    sourcePool.policyStatus = 'CONFIGURING'

    const confirmed = confirmMemberBudgets([member(0)], sourcePool, [{
      memberId: 'member-1',
      credits: 0,
      cro: 0,
      note: '零额度启用',
    }])
    const completed = completeMemberBudgetActivation(confirmed.members, confirmed.pool, 'member-1', true)

    expect(completed.members[0].budgetStatus).toBe('ENABLED')
    expect(completed.members[0].credits.available).toBe(0)
    expect(completed.members[0].cro.available).toBe(0)
    expect(completed.members[0].activationDraft).toBeNull()
    expect(completed.pool.credits.unallocated).toBe(1_000)
    expect(completed.pool.cro.unallocated).toBe(1_000)
  })

  it('moves pending commitments into formal member budgets on activation success', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 1_000
    sourcePool.cro.unallocated = 1_000
    sourcePool.policyStatus = 'CONFIGURING'
    const confirmed = confirmMemberBudgets([member(0)], sourcePool, [{
      memberId: 'member-1',
      credits: 300,
      cro: 120,
      note: '首轮成员预算',
    }])

    const completed = completeMemberBudgetActivation(confirmed.members, confirmed.pool, 'member-1', true)

    expect(completed.members[0].budgetStatus).toBe('ENABLED')
    expect(completed.members[0].credits.available).toBe(300)
    expect(completed.members[0].cro.available).toBe(120)
    expect(completed.pool.credits.pendingAllocated).toBe(0)
    expect(completed.pool.credits.allocatedAvailable).toBe(300)
    expect(completed.pool.credits.unallocated).toBe(700)
  })

  it('releases pending commitments and preserves the draft on activation failure', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 1_000
    sourcePool.cro.unallocated = 1_000
    sourcePool.policyStatus = 'CONFIGURING'
    const confirmed = confirmMemberBudgets([member(0)], sourcePool, [{
      memberId: 'member-1',
      credits: 300,
      cro: 120,
      note: '失败后重试',
    }])

    const failed = completeMemberBudgetActivation(confirmed.members, confirmed.pool, 'member-1', false)

    expect(failed.members[0]).toMatchObject({
      budgetStatus: 'ENABLE_FAILED',
      activationDraft: { credits: 300, cro: 120, note: '失败后重试' },
    })
    expect(failed.pool.credits.pendingAllocated).toBe(0)
    expect(failed.pool.credits.unallocated).toBe(1_000)
    expect(failed.pool.cro.unallocated).toBe(1_000)
  })

  it('rejects a member batch atomically when either currency exceeds the latest hard pool', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 500
    sourcePool.cro.unallocated = 100
    sourcePool.policyStatus = 'CONFIGURING'
    const secondMember = { ...member(0), id: 'member-2', email: 'second@biomap.com' }

    expect(() => confirmMemberBudgets([member(0), secondMember], sourcePool, [
      { memberId: 'member-1', credits: 200, cro: 60, note: 'A' },
      { memberId: 'member-2', credits: 200, cro: 60, note: 'B' },
    ])).toThrow('CRO币待生效额度超过租户未分配额度')

    expect(sourcePool.credits.unallocated).toBe(500)
    expect(sourcePool.cro.unallocated).toBe(100)
    expect(sourcePool.credits.pendingAllocated).toBe(0)
  })

  it('clears active commitments when the personal budget policy is disabled', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.allocatedAvailable = 100
    sourcePool.credits.unallocated = 900
    const result = resetActiveCommitments([member(100)], sourcePool)

    expect(result.members[0].credits.available).toBe(0)
    expect(result.members[0].budgetStatus).toBe('UNCONFIGURED')
    expect(result.pool.credits.allocatedAvailable).toBe(0)
    expect(result.pool.credits.pendingAllocated).toBe(0)
    expect(result.pool.credits.unallocated).toBe(1_000)
  })

  it('allocates the same amount to every selected member atomically', () => {
    const secondMember = { ...member(100), id: 'member-2', email: 'second@biomap.com' }
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 500
    sourcePool.credits.allocatedAvailable = 200

    const result = allocateBudget([member(100), secondMember], sourcePool, {
      memberIds: ['member-1', 'member-2'],
      currency: 'credits',
      amount: 100,
    })

    expect(result.members.map((item) => item.credits.available)).toEqual([200, 200])
    expect(result.pool.credits.unallocated).toBe(300)
    expect(result.pool.credits.allocatedAvailable).toBe(400)
    expect(sourcePool.credits.unallocated).toBe(500)
  })

  it('rejects a batch allocation when the total exceeds unallocated funds', () => {
    const secondMember = { ...member(100), id: 'member-2', email: 'second@biomap.com' }
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 150

    expect(() =>
      allocateBudget([member(100), secondMember], sourcePool, {
        memberIds: ['member-1', 'member-2'],
        currency: 'credits',
        amount: 100,
      }),
    ).toThrow('租户未分配额度不足')
    expect(sourcePool.credits.unallocated).toBe(150)
  })

  it('recovers only available personal budget into the unallocated pool', () => {
    const sourcePool = pool(1_000, 1_000)
    sourcePool.credits.unallocated = 400
    sourcePool.credits.allocatedAvailable = 100

    const result = recoverBudget([member(100)], sourcePool, {
      memberId: 'member-1',
      currency: 'credits',
      amount: 40,
    })

    expect(result.members[0].credits.available).toBe(60)
    expect(result.pool.credits.unallocated).toBe(440)
    expect(result.pool.credits.allocatedAvailable).toBe(60)
  })
})

describe('budget fixtures', () => {
  it('reconciles the healthy Credits pool with member subaccounts', () => {
    const memberAvailable = initialMembers.reduce((total, item) => total + item.credits.available, 0)
    const memberReserved = initialMembers.reduce((total, item) => total + item.credits.reserved, 0)

    expect(initialPool.credits.allocatedAvailable).toBe(memberAvailable)
    expect(initialPool.credits.reserved).toBe(memberReserved)
    expect(
      initialPool.credits.allocatedAvailable
      + initialPool.credits.pendingAllocated
      + initialPool.credits.reserved
      + initialPool.credits.unallocated,
    ).toBe(initialPool.credits.ledgerBalance)
  })
})
