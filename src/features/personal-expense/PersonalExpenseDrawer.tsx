import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { PersonalExpenseRecord } from '../../types/personalExpense'

const currencyLabels = { credits: 'Credits', cro: 'CRO币' } as const

function amount(value: number | null, currency: PersonalExpenseRecord['currency']) {
  return value === null ? '--' : `${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${currencyLabels[currency]}`
}

export function PersonalExpenseDrawer({ record, onClose }: { record: PersonalExpenseRecord; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const details = [
    ['任务 ID', record.taskId],
    ['任务类型', record.taskType],
    ['任务名称', record.taskName],
    ['产品线', record.productLine],
    ['币种', currencyLabels[record.currency]],
    ['预估费用', amount(record.estimatedCost, record.currency)],
    ['实际费用', amount(record.actualCost, record.currency)],
    ['预占金额', amount(record.reservedAmount, record.currency)],
    ['释放金额', amount(record.releasedAmount, record.currency)],
    ['当前状态', record.status],
    ['创建时间', record.createdAt],
    ['更新时间', record.updatedAt],
    ['阻断 / 失败原因', record.failureReason ?? '无'],
    ['关联流水 ID', record.ledgerId],
  ]

  return (
    <div className="expense-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="expense-drawer" role="dialog" aria-modal="true" aria-labelledby="expense-drawer-title">
        <header className="expense-drawer-header">
          <div>
            <h3 id="expense-drawer-title">费用详情</h3>
            <p>{record.id} · 详情只读</p>
          </div>
          <button ref={closeButtonRef} type="button" className="personal-icon-button" aria-label="关闭费用详情" title="关闭" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="expense-drawer-body">
          <dl className="expense-detail-list">
            {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
      </aside>
    </div>
  )
}
