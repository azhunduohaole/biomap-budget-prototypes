import { CircleDollarSign, FlaskConical, ShieldCheck, ShieldAlert } from 'lucide-react'

import type { BudgetPool, Currency } from '../../types/budget'
import { currencyLabels, formatAmount } from './BudgetStatus'

interface BudgetSummaryProps { pool: BudgetPool }

const summaryMetrics: Array<{
  key: 'ledgerBalance' | 'reserved' | 'allocatedAvailable' | 'unallocated'
  label: string
}> = [
  { key: 'ledgerBalance', label: '租户账面余额' },
  { key: 'reserved', label: '当前租户预占' },
  { key: 'allocatedAvailable', label: '已分配未使用' },
  { key: 'unallocated', label: '租户未分配额度' },
]

function CurrencySummary({ currency, pool }: { currency: Currency; pool: BudgetPool }) {
  const item = pool[currency]
  const healthy = item.status === 'NORMAL'
  const Icon = currency === 'credits' ? CircleDollarSign : FlaskConical

  return (
    <section className="budget-summary-card" role="region" aria-label={`${currencyLabels[currency]} 额度概览`}>
      <div className="budget-summary-heading">
        <span className={`currency-icon currency-icon-${currency}`} aria-hidden="true">
          <Icon size={20} />
        </span>
        <div>
          <h3>{currencyLabels[currency]}</h3>
          <span className={`pool-health ${healthy ? 'pool-health-normal' : 'pool-health-error'}`}>
            {healthy ? <ShieldCheck size={14} aria-hidden="true" /> : <ShieldAlert size={14} aria-hidden="true" />}
            {healthy ? '预算池正常' : '预算池异常'}
          </span>
        </div>
      </div>

      <dl className="summary-metrics">
        {summaryMetrics.map((metric) => (
          <div key={metric.key} className="summary-metric">
            <dt>{metric.label}</dt>
            <dd aria-label={`${metric.label} ${formatAmount(item[metric.key])}`}>
              {formatAmount(item[metric.key])}
            </dd>
          </div>
        ))}
      </dl>

      {!healthy && (
        <p className="summary-warning">
          成员个人预算仍保留，但租户当前支付能力不足，付费任务暂时无法启动。
        </p>
      )}
    </section>
  )
}

export function BudgetSummary({ pool }: BudgetSummaryProps) {
  return (
    <section className="budget-overview" aria-labelledby="budget-overview-title">
      <div className="budget-overview-heading">
        <div>
          <h3 id="budget-overview-title">租户额度概览</h3>
          <span>更新于 2026-08-26 12:08:36</span>
        </div>
      </div>
      <div className="budget-summary-grid">
        <CurrencySummary currency="credits" pool={pool} />
        <CurrencySummary currency="cro" pool={pool} />
      </div>
    </section>
  )
}
