import { describe, expect, it } from 'vitest'

import type { BudgetPool, CurrencyBudget, MemberBudget, PoolStatus } from '../types/budget'
import { initialMembers, initialPool } from '../data/mockData'
import { allocateBudget, deriveExecutableBudget, recoverBudget } from './budget'

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
  lastSpentAt: '2026-08-25 16:22:08',
  credits: currencyBudget(available),
  cro: currencyBudget(available),
})

const pool = (
  spendable: number,
  eligibleSpendable: number,
  status: PoolStatus = 'NORMAL',
): BudgetPool => ({
  policyEnabled: true,
  credits: {
    status,
    ledgerBalance: spendable,
    reserved: 0,
    allocatedAvailable: 0,
    unallocated: 0,
    spendable,
    eligibleSpendable,
  },
  cro: {
    status,
    ledgerBalance: spendable,
    reserved: 0,
    allocatedAvailable: 0,
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
      + initialPool.credits.reserved
      + initialPool.credits.unallocated,
    ).toBe(initialPool.credits.ledgerBalance)
  })
})
