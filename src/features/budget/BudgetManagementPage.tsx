import { AlertTriangle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { initialLedger, initialMembers, initialPool } from '../../data/mockData'
import type {
  BudgetLedgerEntry,
  BudgetPolicyStatus,
  BudgetPool,
  Currency,
  DraftBudgetEntry,
  MemberBudget,
} from '../../types/budget'
import {
  activateDraftBudgets,
  allocateBudget,
  recoverBudget,
  resetActiveCommitments,
  upsertDraftBudget,
} from '../../utils/budget'
import { BudgetActionDialog, type BudgetActionMode } from './BudgetActionDialog'
import { BudgetFilters, type BudgetFilterValues } from './BudgetFilters'
import { BudgetLedgerDrawer } from './BudgetLedgerDrawer'
import { BudgetPolicyControl } from './BudgetPolicyControl'
import { getBudgetStatus } from './BudgetStatus'
import { BudgetSummary } from './BudgetSummary'
import { MemberBudgetTable } from './MemberBudgetTable'
import { UnifiedLedger } from './UnifiedLedger'

const emptyFilters: BudgetFilterValues = {
  email: '',
  status: '',
  role: '',
  budgetStatus: '',
}

interface ActionState {
  mode: BudgetActionMode
  memberIds: string[]
}

interface BudgetManagementPageProps {
  initialEntitlementAllowed?: boolean
  initialPolicyStatus?: BudgetPolicyStatus
}

function createInitialState(entitlementAllowed: boolean, policyStatus: BudgetPolicyStatus) {
  const basePool: BudgetPool = {
    ...initialPool,
    entitlementAllowed,
    policyStatus: entitlementAllowed ? policyStatus : 'DISABLED',
    credits: { ...initialPool.credits },
    cro: { ...initialPool.cro },
  }
  const baseMembers = initialMembers.map((member) => ({
    ...member,
    credits: { ...member.credits },
    cro: { ...member.cro },
  }))

  if (!entitlementAllowed || ['DISABLED', 'CONFIGURING', 'ENABLING'].includes(policyStatus)) {
    const reset = resetActiveCommitments(baseMembers, basePool)
    return {
      members: reset.members,
      pool: { ...reset.pool, entitlementAllowed, policyStatus: entitlementAllowed ? policyStatus : 'DISABLED' } as BudgetPool,
    }
  }

  return { members: baseMembers, pool: basePool }
}

function createLedgerEntries(
  mode: BudgetActionMode,
  targets: MemberBudget[],
  membersAfter: MemberBudget[],
  currency: Currency,
  amount: number,
  note: string,
  poolBefore: BudgetPool,
  poolAfter: BudgetPool,
): BudgetLedgerEntry[] {
  return targets.map((target, index) => {
    const updated = membersAfter.find((member) => member.id === target.id)!
    return {
      id: `ledger-demo-${Date.now()}-${index}`,
      memberId: target.id,
      memberName: target.name,
      memberEmail: target.email,
      currency,
      recordCategory: 'BUDGET_MANAGEMENT',
      billingScope: 'PERSONAL_BUDGET',
      operation: mode === 'allocate' ? 'ALLOCATION' : 'RECOVERY',
      amount: mode === 'allocate' ? amount : -amount,
      status: 'SUCCESS',
      availableBefore: target[currency].available,
      availableAfter: updated[currency].available,
      reservedBefore: target[currency].reserved,
      reservedAfter: updated[currency].reserved,
      tenantLedgerBefore: poolBefore[currency].ledgerBalance,
      tenantLedgerAfter: poolAfter[currency].ledgerBalance,
      tenantReservedBefore: poolBefore[currency].reserved,
      tenantReservedAfter: poolAfter[currency].reserved,
      tenantUnallocatedBefore: poolBefore[currency].unallocated,
      tenantUnallocatedAfter: poolAfter[currency].unallocated,
      actor: 'yuejiao@biomap.com',
      timestamp: '2026-08-27 19:12:08',
      note,
      idempotencyKey: `${mode}-${target.id}-${currency}-${Date.now()}`,
    }
  })
}

export function BudgetManagementPage({
  initialEntitlementAllowed = true,
  initialPolicyStatus = 'ENABLED',
}: BudgetManagementPageProps) {
  const initialState = useMemo(
    () => createInitialState(initialEntitlementAllowed, initialPolicyStatus),
    [initialEntitlementAllowed, initialPolicyStatus],
  )
  const [pool, setPool] = useState<BudgetPool>(initialState.pool)
  const [members, setMembers] = useState<MemberBudget[]>(initialState.members)
  const [ledger, setLedger] = useState<BudgetLedgerEntry[]>(initialLedger)
  const [drafts, setDrafts] = useState<DraftBudgetEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [draftFilters, setDraftFilters] = useState<BudgetFilterValues>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<BudgetFilterValues>(emptyFilters)
  const [action, setAction] = useState<ActionState | null>(null)
  const [ledgerMemberId, setLedgerMemberId] = useState<string | null>(null)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'members' | 'ledger'>('members')

  const filteredMembers = useMemo(() => members.filter((member) => {
    if (appliedFilters.email && !member.email.toLowerCase().includes(appliedFilters.email.toLowerCase())) return false
    if (appliedFilters.status && member.status !== appliedFilters.status) return false
    if (appliedFilters.role === 'admin' && !member.role.includes('超级管理员')) return false
    if (appliedFilters.role === 'member' && member.role.includes('超级管理员')) return false
    if (
      appliedFilters.budgetStatus
      && getBudgetStatus(member.credits) !== appliedFilters.budgetStatus
      && getBudgetStatus(member.cro) !== appliedFilters.budgetStatus
    ) return false
    return true
  }), [appliedFilters, members])

  const activeFilterCount = Object.values(draftFilters).filter(Boolean).length
  const actionTargets = action
    ? action.memberIds.map((id) => members.find((member) => member.id === id)).filter((member): member is MemberBudget => Boolean(member))
    : []
  const ledgerMember = members.find((member) => member.id === ledgerMemberId) ?? null
  const draftTotals = drafts.reduce((totals, draft) => ({ ...totals, [draft.currency]: totals[draft.currency] + draft.amount }), { credits: 0, cro: 0 })
  const actionPool = {
    ...pool,
    credits: { ...pool.credits, unallocated: Math.max(0, pool.credits.unallocated - draftTotals.credits) },
    cro: { ...pool.cro, unallocated: Math.max(0, pool.cro.unallocated - draftTotals.cro) },
  }

  const setPolicyStatus = (status: BudgetPolicyStatus) => setPool((current) => ({ ...current, policyStatus: status }))

  const confirmAction = (amount: number, note: string, currency: Currency) => {
    if (!action) return '额度操作已失效，请重新打开'

    if (pool.policyStatus === 'CONFIGURING' && action.mode === 'allocate') {
      const total = amount * actionTargets.length
      if (total > actionPool[currency].unallocated) return '首轮分配总额不能超过当前可分配额度'
      setDrafts((current) => actionTargets.reduce((next, target) => upsertDraftBudget(next, {
        memberId: target.id,
        currency,
        amount,
        note,
      }), current))
      setToast('配置草稿已保存，确认启用前不会影响正式账务')
      setAction(null)
      return null
    }

    if (pool.policyStatus !== 'ENABLED') return '当前状态不允许修改正式个人预算'
    if (action.mode === 'allocate' && pool[currency].status === 'INCONSISTENT') {
      return '该币种预算池异常，修复前不能新增分配'
    }

    try {
      const result = action.mode === 'allocate'
        ? allocateBudget(members, pool, { memberIds: action.memberIds, currency, amount })
        : recoverBudget(members, pool, { memberId: action.memberIds[0], currency, amount })

      const entries = createLedgerEntries(action.mode, actionTargets, result.members, currency, amount, note, pool, result.pool)
      setMembers(result.members)
      setPool(result.pool)
      setLedger((current) => [...entries, ...current])
      setToast(action.mode === 'allocate' ? '额度分配成功' : '额度回收成功')
      setAction(null)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : '额度操作失败'
    }
  }

  const confirmEnable = () => {
    try {
      const result = activateDraftBudgets(members, pool, drafts)
      const entries = drafts.flatMap((draft) => {
        const target = members.find((member) => member.id === draft.memberId)
        return target ? createLedgerEntries('allocate', [target], result.members, draft.currency, draft.amount, draft.note, pool, result.pool) : []
      })
      setPolicyStatus('ENABLING')
      window.setTimeout(() => {
        setMembers(result.members)
        setPool({ ...result.pool, policyStatus: 'ENABLED' })
        setLedger((current) => [...entries, ...current])
        setDrafts([])
        setToast('个人预算已启用')
      }, 320)
    } catch (error) {
      setToast(error instanceof Error ? error.message : '确认启用失败')
    }
  }

  const cancelConfiguration = () => {
    setDrafts([])
    setSelectedIds([])
    setPolicyStatus('DISABLED')
    setToast('配置草稿已取消，正式账务未发生变化')
  }

  const confirmDisable = () => {
    setPolicyDialogOpen(false)
    setPolicyStatus('DISABLING')
    window.setTimeout(() => {
      const reset = resetActiveCommitments(members, pool)
      setMembers(reset.members)
      setPool({ ...reset.pool, policyStatus: 'DISABLED' })
      setToast('个人预算已关闭，成员未使用额度已回收')
    }, 320)
  }

  const selectView = (view: 'members' | 'ledger') => {
    setActiveView(view)
    setToast(null)
  }

  const hasLiveReservations = pool.credits.reserved > 0 || pool.cro.reserved > 0

  return (
    <section className="page page-budget">
      <h2 className="page-title">额度管理</h2>

      {!pool.entitlementAllowed ? (
        <>
          <BudgetSummary pool={pool} />
          <UnifiedLedger entries={ledger} pool={pool} />
        </>
      ) : (
        <>
          <div className="page-tabs" role="tablist" aria-label="额度管理视图">
            <button type="button" role="tab" aria-selected={activeView === 'members'} className={activeView === 'members' ? 'page-tab is-active' : 'page-tab'} onClick={() => selectView('members')}>成员额度</button>
            <button type="button" role="tab" aria-selected={activeView === 'ledger'} className={activeView === 'ledger' ? 'page-tab is-active' : 'page-tab'} onClick={() => selectView('ledger')}>额度流水</button>
          </div>

          {activeView === 'members' ? (
            <>
              <BudgetPolicyControl status={pool.policyStatus} drafts={drafts} onStart={() => setPolicyStatus('CONFIGURING')} onCancel={cancelConfiguration} onEnable={confirmEnable} onDisable={() => setPolicyDialogOpen(true)} />
              <BudgetSummary pool={pool} />
              <BudgetFilters
                values={draftFilters}
                activeCount={activeFilterCount}
                onChange={setDraftFilters}
                onSearch={() => {
                  setAppliedFilters(draftFilters)
                  setSelectedIds([])
                }}
                onReset={() => {
                  setDraftFilters(emptyFilters)
                  setAppliedFilters(emptyFilters)
                  setSelectedIds([])
                }}
              />
              <MemberBudgetTable
                members={filteredMembers}
                pool={pool}
                policyStatus={pool.policyStatus}
                drafts={drafts}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onAllocate={(memberId) => setAction({ mode: 'allocate', memberIds: [memberId] })}
                onRecover={(memberId) => setAction({ mode: 'recover', memberIds: [memberId] })}
                onLedger={setLedgerMemberId}
                onBatchAllocate={() => setAction({ mode: 'allocate', memberIds: selectedIds })}
              />
            </>
          ) : <UnifiedLedger entries={ledger} pool={pool} />}
        </>
      )}

      {action && actionTargets.length > 0 && <BudgetActionDialog mode={action.mode} targets={actionTargets} pool={actionPool} draftMode={pool.policyStatus === 'CONFIGURING'} onClose={() => setAction(null)} onConfirm={confirmAction} />}
      {ledgerMember && <BudgetLedgerDrawer member={ledgerMember} entries={ledger.filter((entry) => entry.memberId === ledgerMember.id)} onClose={() => setLedgerMemberId(null)} />}

      {policyDialogOpen && (
        <div className="modal-backdrop">
          <section className="policy-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-dialog-title">
            <header className="dialog-header"><div><h3 id="policy-dialog-title">关闭个人预算控制</h3><span>关闭成功后将原子回收全部成员未使用额度</span></div><button type="button" className="icon-button" aria-label="关闭个人预算控制弹窗" title="关闭" onClick={() => setPolicyDialogOpen(false)}><X size={18} /></button></header>
            <div className="policy-dialog-body">
              {hasLiveReservations ? (
                <div className="policy-block-message"><AlertTriangle size={18} /><div><p>当前存在运行中预占，必须等待对应任务结算或释放后才能关闭。</p><ul>{pool.credits.reserved > 0 && <li>Credits：{pool.credits.reserved.toLocaleString('zh-CN')}</li>}{pool.cro.reserved > 0 && <li>CRO币：{pool.cro.reserved.toLocaleString('zh-CN')}</li>}</ul></div></div>
              ) : <p>确认后所有成员未消费、未预占的额度将回到租户未分配池，历史消费和流水继续保留。</p>}
            </div>
            <footer className="dialog-footer"><Button onClick={() => setPolicyDialogOpen(false)}>取消</Button><Button variant="primary" disabled={hasLiveReservations} onClick={confirmDisable}>确认关闭</Button></footer>
          </section>
        </div>
      )}

      {toast && <div className="success-toast" role="status" aria-live="polite"><span>{toast}</span><button type="button" aria-label="关闭成功提示" title="关闭" onClick={() => setToast(null)}><X size={16} /></button></div>}
    </section>
  )
}
