import { AlertCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import type { BudgetPool, MemberBudget } from '../../types/budget'
import { formatAmount } from './BudgetStatus'

interface MemberBudgetConfigurationDialogProps {
  member: MemberBudget
  pool: BudgetPool
  onClose: () => void
  onConfirm: (credits: number, cro: number, note: string) => string | null
}

export function MemberBudgetConfigurationDialog({ member, pool, onClose, onConfirm }: MemberBudgetConfigurationDialogProps) {
  const [creditsText, setCreditsText] = useState(member.activationDraft?.credits.toString() ?? '')
  const [croText, setCroText] = useState(member.activationDraft?.cro.toString() ?? '')
  const [note, setNote] = useState(member.activationDraft?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const credits = Number(creditsText)
  const cro = Number(croText)
  const validAmount = (value: number) => Number.isFinite(value) && value >= 0
  const submit = () => {
    if (creditsText.trim() === '' || croText.trim() === '') {
      setError('请填写 Credits 和 CRO币额度；如无需分配请填写 0')
      return
    }
    if (!validAmount(credits) || !validAmount(cro)) {
      setError('额度必须为 0 或更大')
      return
    }
    if (!note.trim()) {
      setError('请填写配置备注')
      return
    }
    setError(onConfirm(credits, cro, note.trim()))
  }

  return (
    <div className="modal-backdrop">
      <section className="budget-dialog member-budget-config-dialog" role="dialog" aria-modal="true" aria-labelledby="member-budget-dialog-title">
        <header className="dialog-header">
          <div>
            <h3 id="member-budget-dialog-title">配置 {member.name} 的个人预算</h3>
            <span>确认后仅该成员进入启用中，生效前无法提交新的付费任务</span>
          </div>
          <button type="button" className="icon-button" aria-label="关闭成员预算配置弹窗" title="关闭" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="dialog-body">
          <div className="dialog-targets" aria-label="配置成员">
            <span>配置成员</span>
            <strong>{member.name} · {member.email}</strong>
          </div>

          <div className="member-budget-config-grid">
            <label className="field dialog-field">
              <span>Credits 预算上限</span>
              <div className="amount-input-wrap">
                <input ref={firstInputRef} type="number" aria-label="Credits 预算上限" min="0" step="0.01" value={creditsText} onChange={(event) => { setCreditsText(event.target.value); setError(null) }} placeholder="可填写 0" />
                <span>Credits</span>
              </div>
              <small>当前租户可用于待生效承诺 {formatAmount(pool.credits.unallocated)} Credits</small>
            </label>
            <label className="field dialog-field">
              <span>CRO币预算上限</span>
              <div className="amount-input-wrap">
                <input type="number" aria-label="CRO币预算上限" min="0" step="0.01" value={croText} onChange={(event) => { setCroText(event.target.value); setError(null) }} placeholder="可填写 0" />
                <span>CRO币</span>
              </div>
              <small>当前租户可用于待生效承诺 {formatAmount(pool.cro.unallocated)} CRO币</small>
            </label>
          </div>

          <div className="config-zero-note">允许配置为 0。0 表示已明确启用个人预算但没有可用额度，不会回退到租户级计费。</div>

          <label className="field dialog-field">
            <span>配置备注</span>
            <textarea aria-label="配置备注" value={note} onChange={(event) => { setNote(event.target.value); setError(null) }} placeholder="请输入预算用途或零额度原因" rows={3} />
          </label>

          {error && <div className="form-error" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</div>}
        </div>

        <footer className="dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit}>确认并启用</Button>
        </footer>
      </section>
    </div>
  )
}
