import { CircleAlert, CircleCheck, Coins, FlaskConical, Info } from 'lucide-react'

import type { PersonalBudgetBlockReason, PersonalBudgetOverview } from '../../types/personalExpense'

const currencyLabels = {
  credits: 'Credits',
  cro: 'CRO币',
} as const

const reasonLabels: Record<Exclude<PersonalBudgetBlockReason, null>, string> = {
  PERSONAL_BUDGET_INSUFFICIENT: '个人额度不足',
  TENANT_PAYMENT_CAPACITY_INSUFFICIENT: '租户支付能力不足',
  TENANT_ELIGIBLE_FUNDS_INSUFFICIENT: '当前资金不适用于本任务',
}

function displayAmount(value: number | null, serviceAvailable: boolean) {
  return serviceAvailable && value !== null
    ? new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
    : '--'
}

function statusClass(status: PersonalBudgetOverview['status'], serviceAvailable: boolean) {
  if (!serviceAvailable || !status) return 'is-neutral'
  if (status === '正常') return 'is-success'
  if (status === '即将耗尽') return 'is-warning'
  return status === '未分配' ? 'is-neutral' : 'is-danger'
}

export function PersonalBudgetSummary({ overview }: { overview: PersonalBudgetOverview[] }) {
  return (
    <section className="personal-budget-section" aria-labelledby="personal-budget-title">
      <div className="personal-section-heading">
        <div>
          <h3 id="personal-budget-title">我的额度</h3>
          <p>个人预算有余额不代表当前一定具备租户支付能力</p>
        </div>
        <span className="budget-rule-note"><Info size={14} aria-hidden="true" />任务启动时校验</span>
      </div>

      <div className="personal-budget-grid">
        {overview.map((item) => {
          const label = currencyLabels[item.currency]
          const blocked = Boolean(item.blockingReason)
          const CurrencyIcon = item.currency === 'credits' ? Coins : FlaskConical

          return (
            <section key={item.currency} className={`personal-budget-card ${blocked ? 'is-blocked' : ''}`} aria-label={`${label}个人额度`}>
              <div className="personal-budget-card-heading">
                <span className={`personal-currency-icon is-${item.currency}`}><CurrencyIcon size={20} aria-hidden="true" /></span>
                <div>
                  <h4>{label}</h4>
                  <span className={`personal-budget-status ${statusClass(item.status, item.serviceAvailable)}`}>
                    {item.serviceAvailable ? item.status : '暂无法获取'}
                  </span>
                </div>
              </div>

              <dl className="personal-budget-metrics">
                <div><dt>个人可用额度</dt><dd>{displayAmount(item.personalAvailable, item.serviceAvailable)}</dd></div>
                <div className={blocked ? 'is-emphasized' : ''}><dt>当前可执行额度</dt><dd>{displayAmount(item.taskExecutable, item.serviceAvailable)}</dd></div>
                <div><dt>运行中预占</dt><dd>{displayAmount(item.reserved, item.serviceAvailable)}</dd></div>
                <div><dt>累计消费</dt><dd>{displayAmount(item.consumed, item.serviceAvailable)}</dd></div>
              </dl>

              {item.serviceAvailable && item.blockingReason && (
                <div className="personal-budget-block-message" role="status">
                  <CircleAlert size={18} aria-hidden="true" />
                  <div>
                    <strong>{reasonLabels[item.blockingReason]}</strong>
                    <p>您的个人预算仍有余额，但租户当前支付能力不足，任务暂时无法启动。个人预算不会扣除，请联系租户管理员。</p>
                  </div>
                </div>
              )}

              {item.serviceAvailable && !item.blockingReason && (
                <div className="personal-budget-ready"><CircleCheck size={16} aria-hidden="true" />当前可正常启动计费任务</div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
