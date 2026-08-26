import { ChevronLeft, ChevronRight, FileSearch } from 'lucide-react'

import type { ExpenseType, PersonalExpenseRecord } from '../../types/personalExpense'

const currencyLabels = { credits: 'Credits', cro: 'CRO币' } as const

const expenseTypeLabels: Record<ExpenseType, string> = {
  reservation: '预占',
  deduction: '已扣减',
  release: '释放',
  refund: '退款',
}

interface PersonalExpenseTableProps {
  records: PersonalExpenseRecord[]
  onDetail: (record: PersonalExpenseRecord) => void
  filtered: boolean
}

export function PersonalExpenseTable({ records, onDetail, filtered }: PersonalExpenseTableProps) {
  return (
    <section className="personal-expense-data" aria-labelledby="expense-records-title">
      <div className="personal-data-heading">
        <div>
          <h3 id="expense-records-title">个人扣减记录</h3>
          <p>记录任务预占、实际扣减、释放与退款</p>
        </div>
        <span>{filtered ? `共 ${records.length} 条匹配结果` : '共 68 条记录'}</span>
      </div>

      <div className="personal-table-shell">
        <table className="personal-expense-table" aria-label="个人扣减记录">
          <thead>
            <tr>
              <th>记录 ID</th>
              <th>任务类型</th>
              <th>任务名称</th>
              <th>产品线</th>
              <th>费用类型</th>
              <th>变动金额</th>
              <th>状态</th>
              <th>操作时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td data-label="记录 ID"><span className="expense-record-id">{record.id}</span></td>
                <td data-label="任务类型">{record.taskType}</td>
                <td data-label="任务名称"><strong>{record.taskName}</strong><small>{record.taskId}</small></td>
                <td data-label="产品线">{record.productLine}</td>
                <td data-label="费用类型"><span className={`expense-type is-${record.expenseType}`}>{expenseTypeLabels[record.expenseType]}</span></td>
                <td data-label="变动金额" className={`expense-amount is-${record.expenseType}`}>
                  {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} {currencyLabels[record.currency]}
                </td>
                <td data-label="状态"><span className={`expense-status is-${record.status}`}>{record.status}</span></td>
                <td data-label="操作时间">{record.operatedAt}</td>
                <td data-label="操作"><button type="button" className="personal-link-button" aria-label={`查看${record.taskName}费用详情`} onClick={() => onDetail(record)}>详情</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="personal-empty-state" role="status">
            <FileSearch size={28} aria-hidden="true" />
            <strong>暂无匹配的扣减记录</strong>
            <span>请调整筛选条件后重新查询</span>
          </div>
        )}
      </div>

      <div className="personal-pagination" aria-label="扣减记录分页">
        <span>{filtered ? `共 ${records.length} 条` : '共 68 条'}</span>
        <button type="button" aria-label="上一页" disabled><ChevronLeft size={16} aria-hidden="true" /></button>
        <button type="button" className="is-current" aria-current="page">1</button>
        {!filtered && <><button type="button">2</button><button type="button">3</button><span>…</span><button type="button">7</button></>}
        <button type="button" aria-label="下一页" disabled={filtered}><ChevronRight size={16} aria-hidden="true" /></button>
        <select aria-label="每页条数" defaultValue="10"><option value="10">10 / page</option></select>
      </div>
    </section>
  )
}
