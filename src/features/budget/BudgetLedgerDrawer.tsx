import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { BudgetLedgerEntry, MemberBudget } from '../../types/budget'
import { currencyLabels, formatAmount } from './BudgetStatus'

const operationLabels: Record<BudgetLedgerEntry['operation'], string> = {
  ALLOCATION: '分配',
  RECOVERY: '回收',
  RESERVATION: '预占',
  SETTLEMENT: '结算',
  RELEASE: '释放',
  REFUND: '退款',
}

interface LedgerTableProps {
  entries: BudgetLedgerEntry[]
  members: MemberBudget[]
  compact?: boolean
}

export function LedgerTable({ entries, members, compact = false }: LedgerTableProps) {
  const memberById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="table-shell ledger-table-shell">
      <table className={`data-table ledger-table ${compact ? 'is-compact' : ''}`}>
        <thead>
          <tr>
            <th>时间 / 流水</th>
            <th>成员</th>
            <th>币种 / 类型</th>
            <th>变动金额</th>
            <th>变动后余额</th>
            <th>操作人 / 任务</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td data-label="时间 / 流水"><span>{entry.timestamp}</span><small>{entry.id}</small></td>
              <td data-label="成员">{memberById.get(entry.memberId)?.name ?? '已移除成员'}</td>
              <td data-label="币种 / 类型"><strong>{currencyLabels[entry.currency]}</strong><span>{operationLabels[entry.operation]}</span></td>
              <td data-label="变动金额" className={entry.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                {entry.amount >= 0 ? '+' : ''}{formatAmount(entry.amount)}
              </td>
              <td data-label="变动后余额"><span>可用 {formatAmount(entry.availableAfter)}</span><small>预占 {formatAmount(entry.reservedAfter)}</small></td>
              <td data-label="操作人 / 任务"><span>{entry.actor}</span><small>{entry.taskId ?? '无关联任务'}</small></td>
              <td data-label="备注">{entry.note}</td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td colSpan={7} className="empty-table-state">暂无额度流水</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

interface BudgetLedgerDrawerProps {
  member: MemberBudget
  entries: BudgetLedgerEntry[]
  onClose: () => void
}

export function BudgetLedgerDrawer({ member, entries, onClose }: BudgetLedgerDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="drawer-backdrop">
      <aside className="budget-drawer" role="dialog" aria-modal="true" aria-labelledby="ledger-drawer-title">
        <header className="drawer-header">
          <div>
            <h3 id="ledger-drawer-title">{member.name}的额度流水</h3>
            <span>{member.email} · 流水只读且不可删除</span>
          </div>
          <button ref={closeButtonRef} type="button" className="icon-button" aria-label="关闭额度流水" title="关闭" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="drawer-body">
          <LedgerTable entries={entries} members={[member]} compact />
        </div>
      </aside>
    </div>
  )
}
