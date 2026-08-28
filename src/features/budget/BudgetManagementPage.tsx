import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  allocateBudget,
  completeMemberBudgetActivation,
  confirmMemberBudgets,
  recoverBudget,
  resetActiveCommitments,
} from '../../utils/budget'
import { BudgetActionDialog, type BudgetActionMode } from './BudgetActionDialog'
import { MemberBudgetConfigurationDialog } from './MemberBudgetConfigurationDialog'
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
  reportingMonth?: string
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
  reportingMonth,
}: BudgetManagementPageProps) {
  const initialState = useMemo(
    () => createInitialState(initialEntitlementAllowed, initialPolicyStatus),
    [initialEntitlementAllowed, initialPolicyStatus],
  )
  const [pool, setPool] = useState<BudgetPool>(initialState.pool)
  const [members, setMembers] = useState<MemberBudget[]>(initialState.members)
  const [ledger, setLedger] = useState<BudgetLedgerEntry[]>(initialLedger)
  const [drafts] = useState<DraftBudgetEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [draftFilters, setDraftFilters] = useState<BudgetFilterValues>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<BudgetFilterValues>(emptyFilters)
  const [action, setAction] = useState<ActionState | null>(null)
  const [ledgerMemberId, setLedgerMemberId] = useState<string | null>(null)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'members' | 'ledger'>('members')
  const [configMemberId, setConfigMemberId] = useState<string | null>(null)
  const membersRef = useRef(members)
  const poolRef = useRef(pool)
  const activationTimersRef = useRef<number[]>([])

  useEffect(() => {
    membersRef.current = members
  }, [members])

  useEffect(() => {
    poolRef.current = pool
  }, [pool])

  useEffect(() => () => {
    activationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
  }, [])

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
  const setPolicyStatus = (status: BudgetPolicyStatus) => setPool((current) => ({ ...current, policyStatus: status }))

  const confirmAction = (amount: number, note: string, currency: Currency) => {
    if (!action) return '额度操作已失效，请重新打开'

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

  const confirmMemberConfiguration = (credits: number, cro: number, note: string) => {
    if (!configMemberId) return '成员配置已失效，请重新打开'
    try {
      const currentMembers = membersRef.current
      const currentPool = poolRef.current
      const result = confirmMemberBudgets(currentMembers, currentPool, [{ memberId: configMemberId, credits, cro, note }])
      const target = currentMembers.find((member) => member.id === configMemberId)
      if (!target) return '成员配置已失效，请重新打开'
      membersRef.current = result.members
      poolRef.current = result.pool
      setMembers(result.members)
      setPool(result.pool)
      setConfigMemberId(null)
      setToast(`${target.name} 已进入启用中，其他成员不受影响`)
      const timerId = window.setTimeout(() => {
        const latestMembers = membersRef.current
        const latestPool = poolRef.current
        const latestTarget = latestMembers.find((member) => member.id === configMemberId) ?? target
        const completed = completeMemberBudgetActivation(latestMembers, latestPool, configMemberId, true)
        const updated = completed.members.find((member) => member.id === configMemberId)
        const entries = [
          ...(credits > 0 ? createLedgerEntries('allocate', [latestTarget], completed.members, 'credits', credits, note, latestPool, completed.pool) : []),
          ...(cro > 0 ? createLedgerEntries('allocate', [latestTarget], completed.members, 'cro', cro, note, latestPool, completed.pool) : []),
        ]
        membersRef.current = completed.members
        poolRef.current = completed.pool
        setMembers(completed.members)
        setPool(completed.pool)
        setLedger((current) => [...entries, ...current])
        setToast(updated?.budgetStatus === 'ENABLED' ? `${latestTarget.name} 的个人预算已生效` : `${latestTarget.name} 的个人预算启用失败`)
      }, 320)
      activationTimersRef.current.push(timerId)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : '成员预算确认失败'
    }
  }

  const cancelConfiguration = () => {
    setSelectedIds([])
    setPolicyStatus('DISABLED')
    setToast('配置草稿已取消，正式账务未发生变化')
  }

  const confirmDisable = () => {
    setPolicyDialogOpen(false)
    setPolicyStatus('DISABLING')
    window.setTimeout(() => {
      const reset = resetActiveCommitments(membersRef.current, poolRef.current)
      membersRef.current = reset.members
      poolRef.current = { ...reset.pool, policyStatus: 'DISABLED' }
      setMembers(reset.members)
      setPool(poolRef.current)
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
          <UnifiedLedger entries={ledger} pool={pool} reportingMonth={reportingMonth} />
        </>
      ) : (
        <>
          <div className="page-tabs" role="tablist" aria-label="额度管理视图">
            <button type="button" role="tab" aria-selected={activeView === 'members'} className={activeView === 'members' ? 'page-tab is-active' : 'page-tab'} onClick={() => selectView('members')}>成员额度</button>
            <button type="button" role="tab" aria-selected={activeView === 'ledger'} className={activeView === 'ledger' ? 'page-tab is-active' : 'page-tab'} onClick={() => selectView('ledger')}>额度流水</button>
          </div>

          {activeView === 'members' ? (
            <>
              <BudgetPolicyControl status={pool.policyStatus} drafts={drafts} members={members} onStart={() => setPolicyStatus('CONFIGURING')} onCancel={cancelConfiguration} onDisable={() => setPolicyDialogOpen(true)} />
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
                onAllocate={(memberId) => pool.policyStatus === 'CONFIGURING' ? setConfigMemberId(memberId) : setAction({ mode: 'allocate', memberIds: [memberId] })}
                onRecover={(memberId) => setAction({ mode: 'recover', memberIds: [memberId] })}
                onLedger={setLedgerMemberId}
                onBatchAllocate={() => setAction({ mode: 'allocate', memberIds: selectedIds })}
              />
            </>
          ) : <UnifiedLedger entries={ledger} pool={pool} reportingMonth={reportingMonth} />}
        </>
      )}

      {action && actionTargets.length > 0 && <BudgetActionDialog mode={action.mode} targets={actionTargets} pool={pool} onClose={() => setAction(null)} onConfirm={confirmAction} />}
      {configMemberId && members.find((member) => member.id === configMemberId) && <MemberBudgetConfigurationDialog member={members.find((member) => member.id === configMemberId)!} pool={pool} onClose={() => setConfigMemberId(null)} onConfirm={confirmMemberConfiguration} />}
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
