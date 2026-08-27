import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react'
import type { ChangeEvent } from 'react'

import type { PersonalExpenseFilters as FilterValues } from '../../types/personalExpense'

interface PersonalExpenseFiltersProps {
  values: FilterValues
  activeCount: number
  onChange: (values: FilterValues) => void
  onSearch: () => void
  onReset: () => void
}

export const emptyExpenseFilters: FilterValues = {
  productLine: '',
  taskName: '',
  currency: '',
  status: '',
  expenseType: '',
  dateFrom: '',
  dateTo: '',
}

export function PersonalExpenseFilters({ values, activeCount, onChange, onSearch, onReset }: PersonalExpenseFiltersProps) {
  const update = (key: keyof FilterValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...values, [key]: event.target.value })
  }

  return (
    <section className="expense-filter-panel" aria-labelledby="expense-filter-title">
      <div className="expense-filter-heading">
        <div className="expense-filter-title">
          <Filter size={16} aria-hidden="true" />
          <h3 id="expense-filter-title">扣减记录筛选</h3>
          <span>已选 {activeCount} 项</span>
        </div>
        <div className="expense-filter-actions">
          <button type="button" className="personal-button is-primary" onClick={onSearch}><Search size={15} aria-hidden="true" />查询</button>
          <button type="button" className="personal-button" onClick={onReset}><RotateCcw size={15} aria-hidden="true" />重置</button>
        </div>
      </div>

      <div className="expense-filter-grid">
        <label className="personal-field personal-select-field">
          <span>产品线</span>
          <select value={values.productLine} onChange={update('productLine')}>
            <option value="">全部产品线</option>
            <option value="AgentOS">AgentOS</option>
            <option value="蛋白设计">蛋白设计</option>
            <option value="智能实验">智能实验</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <label className="personal-field">
          <span>任务名称</span>
          <input type="search" value={values.taskName} onChange={update('taskName')} placeholder="请输入任务名称" />
        </label>
        <label className="personal-field personal-select-field">
          <span>币种</span>
          <select value={values.currency} onChange={update('currency')}>
            <option value="">全部币种</option>
            <option value="credits">Credits</option>
            <option value="cro">CRO币</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <label className="personal-field personal-select-field">
          <span>状态</span>
          <select value={values.status} onChange={update('status')}>
            <option value="">全部状态</option>
            <option value="预占中">预占中</option>
            <option value="已扣减">已扣减</option>
            <option value="已释放">已释放</option>
            <option value="失败">失败</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <label className="personal-field personal-select-field">
          <span>费用类型</span>
          <select value={values.expenseType} onChange={update('expenseType')}>
            <option value="">全部类型</option>
            <option value="reservation">预占</option>
            <option value="deduction">已扣减</option>
            <option value="release">释放</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <fieldset className="personal-date-range">
          <legend>时间范围</legend>
          <div>
            <label><span className="sr-only">开始时间</span><input aria-label="开始时间" type="date" value={values.dateFrom} onChange={update('dateFrom')} /></label>
            <span aria-hidden="true">至</span>
            <label><span className="sr-only">结束时间</span><input aria-label="结束时间" type="date" value={values.dateTo} onChange={update('dateTo')} /></label>
          </div>
        </fieldset>
      </div>
    </section>
  )
}
