import { useState } from 'react'

import { AppHeader, type PageKey } from './components/AppHeader'
import { BudgetManagementPage } from './features/budget/BudgetManagementPage'
import { PersonalExpensePage } from './features/personal-expense/PersonalExpensePage'
import { OptTenantManagementPage } from './features/opt/OptTenantManagementPage'
import { UserCenterPage } from './features/user-center/UserCenterPage'
import type { BudgetPolicyStatus } from './types/budget'

const budgetPolicyStatuses: BudgetPolicyStatus[] = ['DISABLED', 'CONFIGURING', 'ENABLING', 'ENABLED', 'DISABLING']

function getBudgetPolicyStatus(params: URLSearchParams): BudgetPolicyStatus {
  const requestedStatus = params.get('budgetPolicy')?.toUpperCase()
  return budgetPolicyStatuses.includes(requestedStatus as BudgetPolicyStatus)
    ? requestedStatus as BudgetPolicyStatus
    : 'ENABLED'
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('users')
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const params = new URLSearchParams(window.location.search)
  const entitlementAllowed = params.get('budgetAuthorization') !== 'denied'
  const policyStatus = getBudgetPolicyStatus(params)

  if (pathname.endsWith('/opt/tenant-management')) {
    return <OptTenantManagementPage />
  }

  if (pathname.endsWith('/deduction-records')) {
    return <PersonalExpensePage entitlementAllowed={entitlementAllowed} policyStatus={policyStatus} />
  }

  return (
    <div className="app-shell">
      <AppHeader activePage={activePage} onNavigate={setActivePage} />
      <main className="app-main">
        {activePage === 'budget'
          ? <BudgetManagementPage initialEntitlementAllowed={entitlementAllowed} initialPolicyStatus={policyStatus} />
          : <UserCenterPage />}
      </main>
    </div>
  )
}
