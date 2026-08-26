import { AlertTriangle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import { initialLedger, initialMembers, initialPool } from '../../data/mockData'
import type { BudgetLedgerEntry, BudgetPool, Currency, MemberBudget } from '../../types/budget'
import { allocateBudget, recoverBudget } from '../../utils/budget'
import { BudgetActionDialog, type BudgetActionMode } from './BudgetActionDialog'
import { BudgetFilters, type BudgetFilterValues } from './BudgetFilters'
import { BudgetLedgerDrawer, LedgerTable } from './BudgetLedgerDrawer'
import { getBudgetStatus } from './BudgetStatus'
import { BudgetSummary } from './BudgetSummary'
import { MemberBudgetTable } from './MemberBudgetTable'

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

function createLedgerEntries(
  mode: BudgetActionMode,
  targets: MemberBudget[],
  membersAfter: MemberBudget[],
  currency: Currency,
  amount: number,
  note: string,
): BudgetLedgerEntry[] {
  return targets.map((target, index) => {
    const updated = membersAfter.find((member) => member.id === target.id)!
    return {
      id: `ledger-demo-${Date.now()}-${index}`,
      memberId: target.id,
      currency,
      operation: mode === 'allocate' ? 'ALLOCATION' : 'RECOVERY',
      amount: mode === 'allocate' ? amount : -amount,
      availableAfter: updated[currency].available,
      reservedAfter: updated[currency].reserved,
      actor: 'yuejiao@biomap.com',
      timestamp: '2026-08-26 12:12:08',
      note,
    }
  })
}

export function BudgetManagementPage() {
  const [pool, setPool] = useState<BudgetPool>(initialPool)
  const [members, setMembers] = useState<MemberBudget[]>(initialMembers)
  const [ledger, setLedger] = useState<BudgetLedgerEntry[]>(initialLedger)
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
  const liveReservations = pool.credits.reserved + pool.cro.reserved

  const confirmAction = (amount: number, note: string, currency: Currency) => {
    if (!action) return '额度操作已失效，请重新打开'
    if (action.mode === 'allocate' && pool[currency].status === 'INCONSISTENT') {
      return '该币种预算池异常，修复前不能新增分配'
    }

    try {
      const result = action.mode === 'allocate'
        ? allocateBudget(members, pool, { memberIds: action.memberIds, currency, amount })
        : recoverBudget(members, pool, { memberId: action.memberIds[0], currency, amount })

      const entries = createLedgerEntries(action.mode, actionTargets, result.members, currency, amount, note)
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

  const selectView = (view: 'members' | 'ledger') => {
    setActiveView(view)
    setToast(null)
  }

  return (
    <section className="page page-budget">
      <h2 className="page-title">额度管理</h2>
      <div className="page-tabs" role="tablist" aria-label="额度管理视图">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'members'}
          className={activeView === 'members' ? 'page-tab is-active' : 'page-tab'}
          onClick={() => selectView('members')}
        >成员额度</button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'ledger'}
          className={activeView === 'ledger' ? 'page-tab is-active' : 'page-tab'}
          onClick={() => selectView('ledger')}
        >额度流水</button>
      </div>

      {activeView === 'members' ? (
        <>
          <BudgetSummary pool={pool} onPolicyToggle={() => setPolicyDialogOpen(true)} />
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
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onAllocate={(memberId) => setAction({ mode: 'allocate', memberIds: [memberId] })}
            onRecover={(memberId) => setAction({ mode: 'recover', memberIds: [memberId] })}
            onLedger={setLedgerMemberId}
            onBatchAllocate={() => setAction({ mode: 'allocate', memberIds: selectedIds })}
          />
        </>
      ) : (
        <section className="data-section full-ledger-section" aria-labelledby="all-ledger-title">
          <div className="section-heading">
            <div>
              <h3 id="all-ledger-title">全部额度流水</h3>
              <span>流水不可编辑或删除</span>
            </div>
          </div>
          <LedgerTable entries={ledger} members={members} />
        </section>
      )}

      {action && actionTargets.length > 0 && (
        <BudgetActionDialog
          mode={action.mode}
          targets={actionTargets}
          pool={pool}
          onClose={() => setAction(null)}
          onConfirm={confirmAction}
        />
      )}

      {ledgerMember && (
        <BudgetLedgerDrawer
          member={ledgerMember}
          entries={ledger.filter((entry) => entry.memberId === ledgerMember.id)}
          onClose={() => setLedgerMemberId(null)}
        />
      )}

      {policyDialogOpen && (
        <div className="modal-backdrop">
          <section className="policy-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-dialog-title">
            <header className="dialog-header">
              <div>
                <h3 id="policy-dialog-title">关闭个人预算控制</h3>
                <span>关闭后将回收全部成员未使用额度</span>
              </div>
              <button type="button" className="icon-button" aria-label="关闭个人预算控制弹窗" title="关闭" onClick={() => setPolicyDialogOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="policy-dialog-body">
              <div className="policy-block-message">
                <AlertTriangle size={18} aria-hidden="true" />
                <p>当前存在运行中预占 {liveReservations.toLocaleString('zh-CN')} Credits，必须等待任务结算或释放预占后才能关闭。</p>
              </div>
            </div>
            <footer className="dialog-footer">
              <Button onClick={() => setPolicyDialogOpen(false)}>取消</Button>
              <Button variant="primary" disabled>确认关闭</Button>
            </footer>
          </section>
        </div>
      )}

      {toast && (
        <div className="success-toast" role="status" aria-live="polite">
          <span>{toast}</span>
          <button type="button" aria-label="关闭成功提示" title="关闭" onClick={() => setToast(null)}><X size={16} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  )
}
