import { AlertTriangle, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { BioMapOsHeader } from '../../components/BioMapOsHeader'
import { personalBudgetOverview, personalExpenseRecords } from '../../data/personalExpenseMock'
import type { BudgetPolicyStatus, PersonalExpenseRecord, PersonalMemberBudgetStatus } from '../../types/personalExpense'
import { PersonalBudgetSummary } from './PersonalBudgetSummary'
import { PersonalExpenseDrawer } from './PersonalExpenseDrawer'
import { emptyExpenseFilters, PersonalExpenseFilters } from './PersonalExpenseFilters'
import { PersonalExpenseTable } from './PersonalExpenseTable'
import '../../styles/personal-expense.css'

interface PersonalExpensePageProps {
  entitlementAllowed?: boolean
  policyStatus?: BudgetPolicyStatus
  memberBudgetStatus?: PersonalMemberBudgetStatus
}

export function PersonalExpensePage({
  entitlementAllowed = true,
  policyStatus = 'ENABLED',
  memberBudgetStatus,
}: PersonalExpensePageProps) {
  const params = new URLSearchParams(window.location.search)
  const budgetServiceUnavailable = params.get('budgetService') === 'unavailable'
  const memberBudgetZero = params.get('memberBudgetZero') === 'true'
  const resolvedMemberStatus = memberBudgetStatus
    ?? (policyStatus === 'ENABLED' && entitlementAllowed ? 'ENABLED' : 'UNCONFIGURED')
  const overview = memberBudgetZero
    ? personalBudgetOverview.map((item) => ({
      ...item,
      personalAvailable: 0,
      accountExecutable: 0,
      status: '已耗尽' as const,
      blockingReason: 'PERSONAL_BUDGET_INSUFFICIENT' as const,
    }))
    : budgetServiceUnavailable
    ? personalBudgetOverview.map((item) => ({ ...item, serviceAvailable: false, status: null, blockingReason: null }))
    : personalBudgetOverview
  const [draftFilters, setDraftFilters] = useState(emptyExpenseFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyExpenseFilters)
  const [selectedRecord, setSelectedRecord] = useState<PersonalExpenseRecord | null>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Biomap OS'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const filteredRecords = useMemo(() => personalExpenseRecords.filter((record) => {
    if (appliedFilters.productLine && record.productLine !== appliedFilters.productLine) return false
    if (appliedFilters.taskName && !record.taskName.toLowerCase().includes(appliedFilters.taskName.toLowerCase())) return false
    if (appliedFilters.currency && record.currency !== appliedFilters.currency) return false
    if (appliedFilters.status && record.status !== appliedFilters.status) return false
    if (appliedFilters.expenseType && record.expenseType !== appliedFilters.expenseType) return false
    if (appliedFilters.dateFrom && record.operatedAt.slice(0, 10) < appliedFilters.dateFrom) return false
    if (appliedFilters.dateTo && record.operatedAt.slice(0, 10) > appliedFilters.dateTo) return false
    return true
  }), [appliedFilters])

  const draftFilterCount = Object.values(draftFilters).filter(Boolean).length
  const hasAppliedFilters = Object.values(appliedFilters).some(Boolean)
  const tenantTransitionInProgress = policyStatus === 'ENABLING' || policyStatus === 'DISABLING'
  const memberTransitionInProgress = entitlementAllowed && resolvedMemberStatus === 'ENABLING'
  const memberEnableFailed = entitlementAllowed && resolvedMemberStatus === 'ENABLE_FAILED'
  const personalBudgetActive = entitlementAllowed
    && (policyStatus === 'CONFIGURING' || policyStatus === 'ENABLED')
    && resolvedMemberStatus === 'ENABLED'

  return (
    <div className="personal-app-shell">
      <BioMapOsHeader />
      <main className="personal-main">
        <section className="personal-page">
          <header className="personal-page-title">
            <div>
              <h2>扣减记录</h2>
              <p>查看个人额度及任务费用变动</p>
            </div>
          </header>
          {personalBudgetActive ? (
            <PersonalBudgetSummary overview={overview} />
          ) : memberTransitionInProgress ? (
            <div className="personal-policy-notice is-warning" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>您的个人预算正在生效，付费任务暂不可用。</strong>
                <p>仅影响当前账号，其他租户成员不受影响；生效完成后即可继续提交任务。</p>
              </div>
            </div>
          ) : memberEnableFailed ? (
            <div className="personal-policy-notice is-warning" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>个人预算启用失败，付费任务暂不可用。</strong>
                <p>请联系租户管理员重试配置；个人额度不会被错误扣减。</p>
              </div>
            </div>
          ) : tenantTransitionInProgress ? (
            <div className="personal-policy-notice is-warning" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>个人预算策略切换中，付费任务暂不可用。</strong>
                <p>切换完成后将自动恢复，期间不会将个人余额改为 0。</p>
              </div>
            </div>
          ) : (
            <div className="personal-policy-notice is-info" role="status">
              <Info size={18} aria-hidden="true" />
              <div>
                <strong>当前租户未启用个人预算，计费任务按租户原有规则执行。</strong>
                <p>个人扣减历史仍可查看，个人额度卡片将在策略启用后展示。</p>
              </div>
            </div>
          )}
          <PersonalExpenseFilters
            values={draftFilters}
            activeCount={draftFilterCount}
            onChange={setDraftFilters}
            onSearch={() => setAppliedFilters(draftFilters)}
            onReset={() => {
              setDraftFilters(emptyExpenseFilters)
              setAppliedFilters(emptyExpenseFilters)
            }}
          />
          <PersonalExpenseTable records={filteredRecords} filtered={hasAppliedFilters} onDetail={setSelectedRecord} />
        </section>
      </main>
      {selectedRecord && <PersonalExpenseDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </div>
  )
}
