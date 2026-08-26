import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { Button } from '../../components/ui/Button'

export interface BudgetFilterValues {
  email: string
  status: string
  role: string
  budgetStatus: string
}

interface BudgetFiltersProps {
  values: BudgetFilterValues
  activeCount: number
  onChange: (values: BudgetFilterValues) => void
  onSearch: () => void
  onReset: () => void
}

const selectOptions = {
  status: [['', '全部状态'], ['active', '正常'], ['disabled', '已禁用']],
  role: [['', '全部角色'], ['admin', '超级管理员'], ['member', '普通成员']],
  budgetStatus: [
    ['', '全部额度状态'],
    ['正常', '正常'],
    ['未分配', '未分配'],
    ['即将耗尽', '即将耗尽'],
    ['已全部预占', '已全部预占'],
    ['已耗尽', '已耗尽'],
  ],
}

export function BudgetFilters({ values, activeCount, onChange, onSearch, onReset }: BudgetFiltersProps) {
  const update = (key: keyof BudgetFilterValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...values, [key]: event.target.value })
  }

  return (
    <section className="filter-panel budget-filter-panel" aria-labelledby="budget-filter-title">
      <div className="filter-panel-heading">
        <div className="filter-title-wrap">
          <Filter size={16} aria-hidden="true" />
          <h3 id="budget-filter-title">筛选</h3>
          <span>（已选 {activeCount} 项筛选条件）</span>
        </div>
        <div className="filter-actions">
          <Button variant="primary" icon={<Search size={15} aria-hidden="true" />} onClick={onSearch}>查询</Button>
          <Button icon={<RotateCcw size={15} aria-hidden="true" />} onClick={onReset}>重置</Button>
        </div>
      </div>

      <div className="filter-grid budget-filter-grid">
        <label className="field">
          <span>成员邮箱</span>
          <input value={values.email} onChange={update('email')} type="search" placeholder="请输入成员邮箱" />
        </label>
        {(['status', 'role', 'budgetStatus'] as const).map((key) => (
          <label className="field select-field" key={key}>
            <span>{key === 'status' ? '账号状态' : key === 'role' ? '角色' : '额度状态'}</span>
            <select value={values[key]} onChange={update(key)}>
              {selectOptions[key].map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        ))}
      </div>
    </section>
  )
}
