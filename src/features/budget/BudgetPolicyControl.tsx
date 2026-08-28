import { CircleAlert, Clock3, LoaderCircle, Settings2, ShieldCheck } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import type { BudgetPolicyStatus, DraftBudgetEntry, MemberBudget } from '../../types/budget'
import { formatAmount } from './BudgetStatus'

const statusMeta: Record<BudgetPolicyStatus, { label: string; description: string }> = {
  DISABLED: { label: '未启用', description: '当前付费任务沿用租户级计费规则' },
  CONFIGURING: { label: '首轮额度配置中', description: '首轮额度仅为草稿，尚未影响正式账务' },
  ENABLING: { label: '启用中', description: '正在完成一致性校验，暂不允许新建付费任务' },
  ENABLED: { label: '个人预算已启用', description: '付费任务同时校验个人预算与租户支付能力' },
  DISABLING: { label: '关闭中', description: '正在回收成员可用额度，暂不允许新建付费任务' },
}

export function BudgetPolicyControl({
  status,
  drafts,
  onStart,
  onCancel,
  onDisable,
  members,
}: {
  status: BudgetPolicyStatus
  drafts: DraftBudgetEntry[]
  onStart: () => void
  onCancel: () => void
  onDisable: () => void
  members: MemberBudget[]
}) {
  const meta = statusMeta[status]
  const draftTotals = drafts.reduce(
    (totals, item) => ({ ...totals, [item.currency]: totals[item.currency] + item.amount }),
    { credits: 0, cro: 0 },
  )
  const activeMemberCount = members.filter((item) => item.status === 'active').length
  const enabledMemberCount = members.filter((item) => item.status === 'active' && item.budgetStatus === 'ENABLED').length
  const enablingMemberCount = members.filter((item) => item.status === 'active' && item.budgetStatus === 'ENABLING').length
  const unconfiguredMemberCount = members.filter((item) => item.status === 'active' && item.budgetStatus !== 'ENABLED').length
  const transitioning = status === 'ENABLING' || status === 'DISABLING'

  return (
    <section className={`policy-status-panel is-${status.toLowerCase()}`} aria-labelledby="policy-status-title">
      <div className="policy-status-main">
        <span className="policy-status-icon">
          {transitioning ? <LoaderCircle size={19} className="is-spinning" /> : status === 'ENABLED' ? <ShieldCheck size={19} /> : <Settings2 size={19} />}
        </span>
        <div>
          <span>个人预算控制</span>
          <strong id="policy-status-title">{meta.label}</strong>
          <p>{meta.description}</p>
        </div>
      </div>

      {(status === 'CONFIGURING' || status === 'ENABLED') && (
        <div className="policy-draft-summary">
          <span><Clock3 size={15} />{status === 'CONFIGURING' ? '成员逐个确认，生效互不阻断' : '所有正常成员均已完成预算启用'}</span>
          {status === 'CONFIGURING' && <span>草稿剩余时间 30:00</span>}
          <strong>已启用 {enabledMemberCount} / {activeMemberCount} 人</strong>
          <span>启用中 {enablingMemberCount} 人 · 待配置 {unconfiguredMemberCount - enablingMemberCount} 人</span>
        </div>
      )}

      <div className="policy-status-actions">
        {status === 'DISABLED' && <Button variant="primary" onClick={onStart}>开始配置</Button>}
        {status === 'CONFIGURING' && <Button onClick={onCancel}>取消配置</Button>}
        {status === 'ENABLED' && <Button variant="danger" onClick={onDisable}>关闭个人预算</Button>}
        {transitioning && <span className="policy-transition-note"><CircleAlert size={15} />请等待切换完成</span>}
      </div>
    </section>
  )
}
