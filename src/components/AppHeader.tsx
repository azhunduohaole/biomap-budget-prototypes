import { Menu, X } from 'lucide-react'
import { useState } from 'react'

import { BioMapMark } from './BioMapMark'

export type PageKey = 'users' | 'budget' | 'permissions' | 'logs' | 'invitations'

interface AppHeaderProps {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
}

const navigation: Array<{ key: PageKey; label: string }> = [
  { key: 'users', label: '用户中心' },
  { key: 'budget', label: '额度管理' },
  { key: 'permissions', label: '操作权限' },
  { key: 'logs', label: '操作日志' },
  { key: 'invitations', label: '邀请码管理' },
]

export function AppHeader({ activePage, onNavigate }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (page: PageKey) => {
    onNavigate(page)
    setMenuOpen(false)
  }

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <BioMapMark />
        <h1>BioMap 门户</h1>
      </div>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? '关闭导航' : '打开导航'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`header-actions ${menuOpen ? 'is-open' : ''}`}>
        <nav className="top-navigation" aria-label="租户管理导航">
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? 'nav-item is-active' : 'nav-item'}
              aria-current={activePage === item.key ? 'page' : undefined}
              onClick={() => navigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="account-controls">
          <button type="button" className="language-button" aria-label="切换语言">
            EN
          </button>
          <span className="account-avatar" aria-hidden="true">y</span>
          <span className="account-email">yuejiao@biomap.com</span>
        </div>
      </div>
    </header>
  )
}
