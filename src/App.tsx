import { useState } from 'react'

import { AppHeader, type PageKey } from './components/AppHeader'
import { BudgetManagementPage } from './features/budget/BudgetManagementPage'
import { PersonalExpensePage } from './features/personal-expense/PersonalExpensePage'
import { UserCenterPage } from './features/user-center/UserCenterPage'

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('users')
  const pathname = window.location.pathname.replace(/\/+$/, '')

  if (pathname.endsWith('/deduction-records')) {
    return <PersonalExpensePage />
  }

  return (
    <div className="app-shell">
      <AppHeader activePage={activePage} onNavigate={setActivePage} />
      <main className="app-main">
        {activePage === 'budget' ? <BudgetManagementPage /> : <UserCenterPage />}
      </main>
    </div>
  )
}
