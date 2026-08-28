import { List, RotateCcw, WalletCards } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import type { BudgetPolicyStatus, BudgetPool, Currency, DraftBudgetEntry, MemberBudget, MemberBudgetStatus } from '../../types/budget'
import { deriveExecutableBudget } from '../../utils/budget'
import { BlockReason, BudgetStatus, currencyLabels, formatAmount } from './BudgetStatus'

interface MemberBudgetTableProps {
  members: MemberBudget[]
  pool: BudgetPool
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onAllocate: (memberId: string) => void
  onRecover: (memberId: string) => void
  onLedger: (memberId: string) => void
  onBatchAllocate: () => void
  policyStatus: BudgetPolicyStatus
  drafts: DraftBudgetEntry[]
}

function CurrencyCell({ member, pool, currency, draftAmount, policyStatus }: { member: MemberBudget; pool: BudgetPool; currency: Currency; draftAmount: number; policyStatus: BudgetPolicyStatus }) {
  const budget = member[currency]
  const executable = deriveExecutableBudget(member, pool, currency)
  const policyActive = policyStatus === 'ENABLED' || policyStatus === 'DISABLING'
  const memberActive = member.budgetStatus === 'ENABLED' || member.budgetStatus === 'ENABLING'

  return (
    <div className="currency-budget-cell">
      <div className="currency-budget-topline">
        <strong>{currencyLabels[currency]}</strong>
        <BudgetStatus budget={budget} />
      </div>
      {draftAmount > 0 && <span className="draft-budget-amount">草稿 {formatAmount(draftAmount)}</span>}
      <span>个人可用 {formatAmount(budget.available)}</span>
      <span className="executable-amount">当前可执行 {policyActive && memberActive ? formatAmount(executable.accountExecutable) : '--'}</span>
      <span>预占 {formatAmount(budget.reserved)} · 累计消费 {formatAmount(budget.consumed)}</span>
      {member.status === 'disabled'
        ? <span className="block-reason block-reason-active">账号已禁用</span>
        : policyActive && memberActive
          ? <BlockReason reason={executable.reason} />
          : <span className="block-reason block-reason-neutral">正式额度未生效</span>}
      <details className="budget-breakdown">
        <summary>查看组成</summary>
        <dl>
          <div><dt>个人可用额度</dt><dd>{formatAmount(budget.available)}</dd></div>
          <div><dt>租户可支付余额</dt><dd>{formatAmount(pool[currency].spendable)}</dd></div>
        </dl>
      </details>
    </div>
  )
}

export function MemberBudgetTable({
  members,
  pool,
  selectedIds,
  onSelectionChange,
  onAllocate,
  onRecover,
  onLedger,
  onBatchAllocate,
  policyStatus,
  drafts,
}: MemberBudgetTableProps) {
  const selectableIds = members.filter((member) => member.status === 'active').map((member) => member.id)
  const selectedVisibleCount = selectableIds.filter((id) => selectedIds.includes(id)).length
  const allSelected = selectableIds.length > 0 && selectedVisibleCount === selectableIds.length
  const canAllocate = policyStatus === 'CONFIGURING' || policyStatus === 'ENABLED'

  const budgetStatusLabel: Record<MemberBudgetStatus, string> = {
    UNCONFIGURED: '待配置',
    ENABLING: '启用中',
    ENABLED: '已启用',
    ENABLE_FAILED: '启用失败',
  }

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !selectableIds.includes(id)))
      return
    }
    onSelectionChange(Array.from(new Set([...selectedIds, ...selectableIds])))
  }

  const toggleOne = (memberId: string) => {
    onSelectionChange(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId],
    )
  }

  return (
    <section className="data-section budget-member-section" aria-labelledby="member-budget-title">
      <div className="section-heading budget-table-heading">
        <div>
          <h3 id="member-budget-title">成员预算明细</h3>
          <span>共 {members.length} 位成员{selectedIds.length > 0 ? `，已选 ${selectedIds.length} 位` : ''}</span>
        </div>
        <Button
          variant="primary"
          icon={<WalletCards size={16} aria-hidden="true" />}
          disabled={selectedIds.length === 0 || !canAllocate}
          onClick={onBatchAllocate}
        >
          批量{policyStatus === 'CONFIGURING' ? '配置' : '分配'}额度
        </Button>
      </div>

      <div className="table-shell budget-table-shell">
        <table className="data-table budget-table">
          <thead>
            <tr>
              <th className="selection-column">
                <input
                  type="checkbox"
                  aria-label="选择当前页全部正常成员"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th>成员</th>
              <th>角色</th>
              <th>预算生效状态</th>
              <th>Credits</th>
              <th>CRO币</th>
              <th>使用情况</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td data-label="选择" className="selection-column">
                  <input
                    type="checkbox"
                    aria-label={`选择${member.name}`}
                    checked={selectedIds.includes(member.id)}
                    disabled={member.status !== 'active'}
                    onChange={() => toggleOne(member.id)}
                  />
                </td>
                <td data-label="成员">
                  <div className="member-identity">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                    <span className={`account-status account-status-${member.status}`}>
                      {member.status === 'active' ? '正常' : '已禁用'}
                    </span>
                  </div>
                </td>
                <td data-label="角色"><span className="role-tag">{member.role}</span></td>
                <td data-label="预算生效状态"><span className={`member-budget-status member-budget-status-${member.budgetStatus.toLowerCase()}`}>{budgetStatusLabel[member.budgetStatus]}</span></td>
                <td data-label="Credits"><CurrencyCell member={member} pool={pool} currency="credits" policyStatus={policyStatus} draftAmount={drafts.find((item) => item.memberId === member.id && item.currency === 'credits')?.amount ?? 0} /></td>
                <td data-label="CRO币"><CurrencyCell member={member} pool={pool} currency="cro" policyStatus={policyStatus} draftAmount={drafts.find((item) => item.memberId === member.id && item.currency === 'cro')?.amount ?? 0} /></td>
                <td data-label="使用情况">
                  <div className="usage-cell">
                    <span>最近消费</span>
                    <strong>{member.lastSpentAt ?? '暂无消费'}</strong>
                  </div>
                </td>
                <td data-label="操作">
                  <div className="budget-row-actions">
                    <Button
                      variant="link"
                      icon={<WalletCards size={14} aria-hidden="true" />}
                      aria-label={policyStatus === 'CONFIGURING' ? `${member.budgetStatus === 'ENABLE_FAILED' ? '重试' : '给'}${member.name}配置预算` : `给${member.name}分配额度`}
                      disabled={member.status !== 'active' || !canAllocate || (policyStatus === 'CONFIGURING' && (member.budgetStatus === 'ENABLING' || member.budgetStatus === 'ENABLED')) || (policyStatus === 'ENABLED' && (pool.credits.status === 'INCONSISTENT' && pool.cro.status === 'INCONSISTENT'))}
                      onClick={() => onAllocate(member.id)}
                    >{policyStatus === 'CONFIGURING' ? member.budgetStatus === 'ENABLE_FAILED' ? '重试' : member.budgetStatus === 'ENABLING' ? '启用中' : member.budgetStatus === 'ENABLED' ? '已启用' : '配置' : '分配'}</Button>
                    <Button
                      variant="link"
                      icon={<RotateCcw size={14} aria-hidden="true" />}
                      aria-label={`回收${member.name}额度`}
                      disabled={member.status !== 'active' || policyStatus !== 'ENABLED' || member.budgetStatus !== 'ENABLED'}
                      onClick={() => onRecover(member.id)}
                    >回收</Button>
                    <Button
                      variant="link"
                      icon={<List size={14} aria-hidden="true" />}
                      aria-label={`查看${member.name}额度流水`}
                      onClick={() => onLedger(member.id)}
                    >流水</Button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-table-state">没有符合筛选条件的成员</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination" aria-label="成员额度分页">
        <span>共 {members.length} 条</span>
        <button type="button" className="page-number is-current" aria-current="page">1</button>
        <select aria-label="每页条数" defaultValue="10"><option value="10">10 / page</option></select>
      </div>
    </section>
  )
}
