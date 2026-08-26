import { ChevronDown, Dna, Menu, X } from 'lucide-react'
import { useState } from 'react'

const osNavigation = [
  '知识助手',
  'AgentOS',
  '蛋白设计',
  '智能实验',
  '数据中心',
  '模型平台',
  '项目管理',
]

export function BioMapOsHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="os-header">
      <div className="os-brand-lockup">
        <span className="os-biomap-mark" aria-hidden="true"><Dna size={24} strokeWidth={1.7} /></span>
        <h1>BioMap OS</h1>
      </div>

      <button
        className="os-mobile-menu"
        type="button"
        aria-label={menuOpen ? '关闭导航' : '打开导航'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      <div className={`os-header-content ${menuOpen ? 'is-open' : ''}`}>
        <nav className="os-navigation" aria-label="BioMap OS 主导航">
          {osNavigation.map((item) => (
            <a key={item} href={`#${item}`} onClick={() => setMenuOpen(false)}>{item}</a>
          ))}
        </nav>
        <button type="button" className="os-account-button" aria-label="打开个人账户菜单">
          <span aria-hidden="true">Y</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
