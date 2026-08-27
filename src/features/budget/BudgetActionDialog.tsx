import { AlertCircle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import type { BudgetPool, Currency, MemberBudget } from '../../types/budget'
import { currencyLabels, formatAmount } from './BudgetStatus'

export type BudgetActionMode = 'allocate' | 'recover'

interface BudgetActionDialogProps {
  mode: BudgetActionMode
  targets: MemberBudget[]
  pool: BudgetPool
  onClose: () => void
  onConfirm: (amount: number, note: string, currency: Currency) => string | null
  draftMode?: boolean
}

export function BudgetActionDialog({ mode, targets, pool, onClose, onConfirm, draftMode = false }: BudgetActionDialogProps) {
  const [currency, setCurrency] = useState<Currency>('credits')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const isBatch = targets.length > 1
  const amount = Number(amountText)
  const total = Number.isFinite(amount) ? amount * (mode === 'allocate' ? targets.length : 1) : 0
  const maximum = mode === 'allocate'
    ? pool[currency].unallocated / Math.max(targets.length, 1)
    : (targets[0]?.[currency].available ?? 0)

  useEffect(() => {
    amountInputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const preview = useMemo(() => {
    if (mode === 'allocate') {
      return {
        beforeLabel: '当前租户未分配额度',
        before: pool[currency].unallocated,
        afterLabel: '操作后租户未分配额度',
        after: pool[currency].unallocated - total,
      }
    }
    return {
      beforeLabel: '当前个人可用额度',
      before: targets[0]?.[currency].available ?? 0,
      afterLabel: '操作后个人可用额度',
      after: (targets[0]?.[currency].available ?? 0) - total,
    }
  }, [currency, mode, pool, targets, total])

  const submit = () => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('金额必须大于 0')
      return
    }
    if (!note.trim()) {
      setError('请填写操作备注')
      return
    }
    if (amount > maximum) {
      setError(
        mode === 'recover'
          ? '回收金额不能超过个人可用额度'
          : isBatch
            ? '批量分配总额不能超过租户未分配额度'
            : '分配金额不能超过租户未分配额度',
      )
      return
    }
    setError(onConfirm(amount, note.trim(), currency))
  }

  const title = mode === 'allocate'
    ? isBatch ? `批量${draftMode ? '配置' : '分配'}额度（${targets.length} 人）` : `给${targets[0]?.name ?? ''}${draftMode ? '配置' : '分配'}额度`
    : `回收${targets[0]?.name ?? ''}额度`

  return (
    <div className="modal-backdrop">
      <section className="budget-dialog" role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title">
        <header className="dialog-header">
          <div>
            <h3 id="budget-dialog-title">{title}</h3>
            <span>{mode === 'allocate' ? draftMode ? '仅保存配置草稿，确认启用前不影响正式账务' : '追加个人预算，不会立即扣减租户账面余额' : '仅可回收未消费、未预占的个人额度'}</span>
          </div>
          <button type="button" className="icon-button" aria-label="关闭额度操作弹窗" title="关闭" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="dialog-body">
          <div className="dialog-targets" aria-label="目标成员">
            <span>目标成员</span>
            <div>{targets.map((target) => <strong key={target.id}>{target.name} · {target.email}</strong>)}</div>
          </div>

          <fieldset className="currency-segmented">
            <legend>币种</legend>
            <div>
              {(['credits', 'cro'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={currency === item}
                  disabled={mode === 'allocate' && pool[item].status === 'INCONSISTENT'}
                  className={currency === item ? 'is-selected' : ''}
                  onClick={() => {
                    setCurrency(item)
                    setError(null)
                  }}
                >
                  {currencyLabels[item]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field dialog-field">
            <span>{mode === 'allocate' ? '分配金额' : '回收金额'}</span>
            <div className="amount-input-wrap">
              <input
                ref={amountInputRef}
                type="number"
                aria-label={mode === 'allocate' ? '分配金额' : '回收金额'}
                min="0"
                step="0.01"
                value={amountText}
                onChange={(event) => {
                  setAmountText(event.target.value)
                  setError(null)
                }}
                placeholder="请输入金额"
              />
              <span>{currencyLabels[currency]}</span>
            </div>
            <small>
              单人本次最多{mode === 'allocate' && isBatch ? '平均' : ''}可操作 {formatAmount(maximum)} {currencyLabels[currency]}
            </small>
          </label>

          <dl className="action-preview">
            <div><dt>单人金额</dt><dd>{formatAmount(Number.isFinite(amount) ? amount : 0)}</dd></div>
            {isBatch && <div><dt>批量分配总额</dt><dd>{formatAmount(total)}</dd></div>}
            <div><dt>{preview.beforeLabel}</dt><dd>{formatAmount(preview.before)}</dd></div>
            <div><dt>{preview.afterLabel}</dt><dd className={preview.after < 0 ? 'is-negative' : ''}>{formatAmount(preview.after)}</dd></div>
          </dl>

          <label className="field dialog-field">
            <span>操作备注</span>
            <textarea aria-label="操作备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="请输入预算用途或回收原因" rows={3} />
          </label>

          {error && <div className="form-error" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</div>}
        </div>

        <footer className="dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit}>{mode === 'allocate' ? draftMode ? '保存草稿' : '确认分配' : '确认回收'}</Button>
        </footer>
      </section>
    </div>
  )
}
