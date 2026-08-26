import { useEffect, useMemo, useState } from 'react'

import { BioMapOsHeader } from '../../components/BioMapOsHeader'
import { personalBudgetOverview, personalExpenseRecords } from '../../data/personalExpenseMock'
import type { PersonalExpenseRecord } from '../../types/personalExpense'
import { PersonalBudgetSummary } from './PersonalBudgetSummary'
import { PersonalExpenseDrawer } from './PersonalExpenseDrawer'
import { emptyExpenseFilters, PersonalExpenseFilters } from './PersonalExpenseFilters'
import { PersonalExpenseTable } from './PersonalExpenseTable'
import '../../styles/personal-expense.css'

export function PersonalExpensePage() {
  const budgetServiceUnavailable = new URLSearchParams(window.location.search).get('budgetService') === 'unavailable'
  const overview = budgetServiceUnavailable
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
          <PersonalBudgetSummary overview={overview} />
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
