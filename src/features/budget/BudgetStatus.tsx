import type { BudgetBlockReason, Currency, CurrencyBudget } from '../../types/budget'

export const currencyLabels: Record<Currency, string> = {
  credits: 'Credits',
  cro: 'CRO币',
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

const reasonLabels: Record<Exclude<BudgetBlockReason, null>, string> = {
  PERSONAL_BUDGET_INSUFFICIENT: '个人额度不足',
  TENANT_PAYMENT_CAPACITY_INSUFFICIENT: '租户支付能力不足',
  TENANT_ELIGIBLE_FUNDS_INSUFFICIENT: '当前资金不适用于本任务',
}

export function getBudgetStatus(budget: CurrencyBudget) {
  const remaining = budget.available + budget.reserved

  if (budget.alertBaseline === 0 && remaining === 0) return '未分配'
  if (budget.available === 0 && budget.reserved > 0) return '已全部预占'
  if (budget.alertBaseline > 0 && remaining === 0) return '已耗尽'
  if (remaining <= budget.alertBaseline * 0.1) return '即将耗尽'
  return '正常'
}

export function BudgetStatus({ budget }: { budget: CurrencyBudget }) {
  const status = getBudgetStatus(budget)
  const statusClass = status === '正常'
    ? 'budget-status-normal'
    : status === '未分配'
      ? 'budget-status-neutral'
      : status === '即将耗尽'
        ? 'budget-status-warning'
        : 'budget-status-danger'

  return <span className={`budget-status ${statusClass}`}>{status}</span>
}

export function BlockReason({ reason }: { reason: BudgetBlockReason }) {
  if (!reason) return <span className="block-reason block-reason-clear">可正常执行</span>

  return (
    <span className="block-reason block-reason-active">
      {reasonLabels[reason]}
    </span>
  )
}
