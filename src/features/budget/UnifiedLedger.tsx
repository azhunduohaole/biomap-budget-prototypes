import { Download, FileSearch, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../components/ui/Button'
import type {
  BudgetLedgerEntry,
  BudgetPool,
  BillingScope,
  Currency,
  LedgerOperation,
  LedgerRecordCategory,
  LedgerStatus,
} from '../../types/budget'
import { currencyLabels, formatAmount } from './BudgetStatus'

const categoryLabels: Record<LedgerRecordCategory, string> = {
  BUDGET_MANAGEMENT: '预算管理',
  TASK_BILLING: '任务计费',
}

const operationLabels: Record<BudgetLedgerEntry['operation'], string> = {
  ALLOCATION: '分配',
  RECOVERY: '回收',
  RESERVATION: '预占',
  ADDITIONAL_RESERVATION: '追加预占',
  SETTLEMENT: '结算',
  RELEASE: '释放',
  SYSTEM_RECOVERY: '系统回收',
}

const billingScopeLabels = {
  PERSONAL_BUDGET: '个人预算',
  TENANT_ONLY: '租户级计费',
} as const

const ledgerStatusLabels = {
  SUCCESS: '已完成',
  PROCESSING: '处理中',
  FAILED: '失败',
} as const

type LedgerBillingScope = Exclude<BillingScope, null>

function valueOrDash(value?: number | string) {
  if (value === undefined || value === '') return '--'
  return typeof value === 'number' ? formatAmount(value) : value
}

function getBusinessMeta(entry: BudgetLedgerEntry) {
  const taskMeta = [entry.productLine, entry.taskType].filter(Boolean).join(' · ')
  return taskMeta || entry.taskId || '--'
}

function getAmountBreakdown(entry: BudgetLedgerEntry) {
  if (entry.regularAmount === undefined && entry.giftAmount === undefined) return null
  return `赠 ${formatAmount(entry.giftAmount ?? 0)} / 普 ${formatAmount(entry.regularAmount ?? 0)} ${currencyLabels[entry.currency]}`
}

function getLedgerStatusLabel(entry: BudgetLedgerEntry) {
  if (entry.recordCategory === 'TASK_BILLING' && entry.operation === 'SETTLEMENT' && entry.status === 'SUCCESS') {
    return '已结算'
  }
  return ledgerStatusLabels[entry.status]
}

function LedgerDetailDrawer({ entry, onClose }: { entry: BudgetLedgerEntry; onClose: () => void }) {
  const details = [
    ['记录分类', categoryLabels[entry.recordCategory]],
    ['计费范围', entry.billingScope ? billingScopeLabels[entry.billingScope] : '--'],
    ['成员', `${entry.memberName} · ${entry.memberEmail}`],
    ['产品线', entry.productLine ?? '--'],
    ['任务类型', entry.taskType ?? '--'],
    ['任务名称', entry.taskName ?? '--'],
    ['任务 ID', entry.taskId ?? '--'],
    ['计费方式', entry.billingMethod ?? '--'],
    ['预估用量', entry.estimatedUsage ?? '--'],
    ['实际用量', entry.actualUsage ?? '--'],
    ['预估费用', entry.estimatedCost === undefined ? '--' : `${formatAmount(entry.estimatedCost)} ${currencyLabels[entry.currency]}`],
    ['实际费用', entry.actualCost === undefined ? '--' : `${formatAmount(entry.actualCost)} ${currencyLabels[entry.currency]}`],
    ['普通额度', entry.regularAmount === undefined ? '--' : formatAmount(entry.regularAmount)],
    ['赠送额度', entry.giftAmount === undefined ? '--' : formatAmount(entry.giftAmount)],
    ['预占时间', entry.reservedAt ?? '--'],
    ['结算时间', entry.settledAt ?? '--'],
    ['个人可用额度', `${valueOrDash(entry.availableBefore)} → ${valueOrDash(entry.availableAfter)}`],
    ['个人预占', `${valueOrDash(entry.reservedBefore)} → ${valueOrDash(entry.reservedAfter)}`],
    ['租户账面余额', `${valueOrDash(entry.tenantLedgerBefore)} → ${valueOrDash(entry.tenantLedgerAfter)}`],
    ['租户预占', `${valueOrDash(entry.tenantReservedBefore)} → ${valueOrDash(entry.tenantReservedAfter)}`],
    ['租户未分配额度', `${valueOrDash(entry.tenantUnallocatedBefore)} → ${valueOrDash(entry.tenantUnallocatedAfter)}`],
    ['操作人', entry.actor],
    ['操作备注', entry.note],
    ['失败原因', entry.failureReason ?? '--'],
  ]

  return (
    <div className="drawer-backdrop">
      <aside className="ledger-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="ledger-detail-title">
        <header className="drawer-header"><div><h3 id="ledger-detail-title">流水详情</h3><span>{entry.id} · 只读且不可删除</span></div><button type="button" className="icon-button" aria-label="关闭流水详情" onClick={onClose}><X size={18} /></button></header>
        <div className="drawer-body">
          {entry.migrated && <div className="ledger-migration-note">该记录迁移自原扣减记录，个人预算账务字段无历史数据时显示“--”。</div>}
          <dl className="ledger-detail-list">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </aside>
    </div>
  )
}

export function UnifiedLedger({ entries, pool, memberId, reportingMonth }: { entries: BudgetLedgerEntry[]; pool: BudgetPool; memberId?: string; reportingMonth?: string }) {
  const [category, setCategory] = useState<'' | LedgerRecordCategory>('')
  const [billingScope, setBillingScope] = useState<'' | LedgerBillingScope>('')
  const [currency, setCurrency] = useState<'' | Currency>('')
  const [productLine, setProductLine] = useState('')
  const [status, setStatus] = useState<'' | LedgerStatus>('')
  const [operation, setOperation] = useState<'' | LedgerOperation>('')
  const [memberQuery, setMemberQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<BudgetLedgerEntry | null>(null)
  const [exported, setExported] = useState(false)

  const scopedEntries = useMemo(() => entries.filter((entry) => {
    if (memberId && entry.memberId !== memberId) return false
    if (category && entry.recordCategory !== category) return false
    if (billingScope && entry.billingScope !== billingScope) return false
    if (currency && entry.currency !== currency) return false
    if (productLine && entry.productLine !== productLine) return false
    if (status && entry.status !== status) return false
    if (operation && entry.operation !== operation) return false
    if (memberQuery && !`${entry.memberName}${entry.memberEmail}`.toLowerCase().includes(memberQuery.toLowerCase())) return false
    if (taskQuery && !`${entry.taskName ?? ''}${entry.taskId ?? ''}`.toLowerCase().includes(taskQuery.toLowerCase())) return false
    if (dateFrom && entry.timestamp.slice(0, 10) < dateFrom) return false
    if (dateTo && entry.timestamp.slice(0, 10) > dateTo) return false
    return true
  }), [billingScope, category, currency, dateFrom, dateTo, entries, memberId, memberQuery, operation, productLine, status, taskQuery])

  const currentMonth = reportingMonth ?? new Date().toISOString().slice(0, 7)
  const currentMonthSettlements = scopedEntries.filter((entry) =>
    entry.operation === 'SETTLEMENT'
    && entry.status === 'SUCCESS'
    && entry.timestamp.startsWith(currentMonth),
  )
  const creditsDeduction = currentMonthSettlements.filter((entry) => entry.currency === 'credits').reduce((total, entry) => total + Math.abs(entry.amount), 0)
  const croDeduction = currentMonthSettlements.filter((entry) => entry.currency === 'cro').reduce((total, entry) => total + Math.abs(entry.amount), 0)
  const involvedUsers = new Set(scopedEntries.filter((entry) => entry.recordCategory === 'TASK_BILLING' && entry.memberId).map((entry) => entry.memberId)).size

  return (
    <section className="unified-ledger" aria-labelledby="unified-ledger-title">
      <div className="section-heading unified-ledger-heading">
        <div><h3 id="unified-ledger-title">统一额度流水</h3><span>覆盖预算管理操作、个人预算计费及历史租户级扣减</span></div>
        <Button icon={<Download size={15} />} onClick={() => setExported(true)}>导出流水</Button>
      </div>

      {!memberId && <dl className="ledger-summary-strip"><div><dt>本月 Credits 扣减</dt><dd aria-label={`本月 Credits 扣减 ${formatAmount(creditsDeduction)}`}>{formatAmount(creditsDeduction)}</dd></div><div><dt>本月 CRO币扣减</dt><dd aria-label={`本月 CRO币扣减 ${formatAmount(croDeduction)}`}>{formatAmount(croDeduction)}</dd></div><div><dt>涉及用户数</dt><dd>{involvedUsers}</dd></div><div><dt>当前预占</dt><dd className="ledger-current-reserved" aria-label={`当前预占 Credits ${formatAmount(pool.credits.reserved)} CRO币 ${formatAmount(pool.cro.reserved)}`}>Credits {formatAmount(pool.credits.reserved)}<small>CRO币 {formatAmount(pool.cro.reserved)}</small></dd></div><div><dt>租户可用余额</dt><dd className="ledger-tenant-balance">Credits {formatAmount(pool.credits.spendable)}<small>CRO币 {formatAmount(pool.cro.spendable)}</small></dd></div></dl>}

      <section className="ledger-filter-bar" aria-label="额度流水筛选">
        <label><span>记录分类</span><select aria-label="记录分类" value={category} onChange={(event) => setCategory(event.target.value as '' | LedgerRecordCategory)}><option value="">全部分类</option><option value="BUDGET_MANAGEMENT">预算管理</option><option value="TASK_BILLING">任务计费</option></select></label>
        <label><span>计费范围</span><select aria-label="计费范围" value={billingScope} onChange={(event) => setBillingScope(event.target.value as '' | LedgerBillingScope)}><option value="">全部范围</option><option value="PERSONAL_BUDGET">个人预算</option><option value="TENANT_ONLY">租户级计费</option></select></label>
        <label><span>成员</span><input aria-label="流水成员" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="姓名或邮箱" /></label>
        <label><span>任务</span><input aria-label="流水任务" value={taskQuery} onChange={(event) => setTaskQuery(event.target.value)} placeholder="任务名称或 ID" /></label>
        <label><span>币种</span><select aria-label="流水币种" value={currency} onChange={(event) => setCurrency(event.target.value as '' | Currency)}><option value="">全部币种</option><option value="credits">Credits</option><option value="cro">CRO币</option></select></label>
        <label><span>产品线</span><select aria-label="流水产品线" value={productLine} onChange={(event) => setProductLine(event.target.value)}><option value="">全部产品线</option><option value="AgentOS">AgentOS</option><option value="蛋白设计">蛋白设计</option><option value="智能实验">智能实验</option></select></label>
        <label><span>状态</span><select aria-label="流水状态" value={status} onChange={(event) => setStatus(event.target.value as '' | LedgerStatus)}><option value="">全部状态</option><option value="SUCCESS">成功（含任务已结算）</option><option value="PROCESSING">处理中</option><option value="FAILED">失败</option></select></label>
        <label><span>操作类型</span><select aria-label="流水操作类型" value={operation} onChange={(event) => setOperation(event.target.value as '' | LedgerOperation)}><option value="">全部操作</option>{Object.entries(operationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>开始时间</span><input aria-label="流水开始时间" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label><span>结束时间</span><input aria-label="流水结束时间" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <Button variant="primary" icon={<Search size={15} />}>查询</Button>
      </section>

      <div className="table-shell unified-ledger-table-shell">
        <table className="data-table unified-ledger-table">
          <thead><tr><th>时间 / 流水</th><th>成员</th><th>分类 / 范围</th><th>业务信息</th><th>币种 / 操作</th><th>变动金额</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{scopedEntries.map((entry) => (
            <tr key={entry.id}>
              <td><span>{entry.timestamp}</span><small>{entry.id}</small></td>
              <td><strong>{entry.memberName}</strong><small>{entry.memberEmail}</small></td>
              <td><span>{categoryLabels[entry.recordCategory]}</span><small>{entry.billingScope ? billingScopeLabels[entry.billingScope] : '--'}</small></td>
              <td><strong>{entry.taskName ?? entry.note}</strong><small>{getBusinessMeta(entry)}</small></td>
              <td><span>{currencyLabels[entry.currency]}</span><small>{operationLabels[entry.operation]}</small></td>
              <td className={entry.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                <span>{entry.amount > 0 ? '+' : ''}{formatAmount(entry.amount)}</span>
                {getAmountBreakdown(entry) && <small>{getAmountBreakdown(entry)}</small>}
              </td>
              <td><span className={`ledger-status is-${entry.status.toLowerCase()}`}>{getLedgerStatusLabel(entry)}</span></td>
              <td><Button variant="link" aria-label={`查看${entry.taskName ?? entry.note}详情`} onClick={() => setSelected(entry)}>详情</Button></td>
            </tr>
          ))}</tbody>
        </table>
        {scopedEntries.length === 0 && <div className="ledger-empty"><FileSearch size={28} /><strong>暂无匹配流水</strong></div>}
      </div>
      <div className="pagination"><span>共 {scopedEntries.length} 条</span><button type="button" className="page-number is-current">1</button><select aria-label="流水每页条数" defaultValue="10"><option value="10">10 / page</option></select></div>
      {exported && <div className="success-toast" role="status"><span>导出任务已创建，将包含当前筛选范围内的完整历史流水</span><button type="button" aria-label="关闭导出提示" onClick={() => setExported(false)}><X size={16} /></button></div>}
      {selected && <LedgerDetailDrawer entry={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
