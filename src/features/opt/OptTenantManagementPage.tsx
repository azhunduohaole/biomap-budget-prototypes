import {
  Building2,
  ChevronDown,
  CircleAlert,
  FileClock,
  Filter,
  KeyRound,
  LayoutDashboard,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { BioMapMark } from '../../components/BioMapMark'
import { Button } from '../../components/ui/Button'
import { initialOptTenants } from '../../data/optMock'
import type { OptTenant } from '../../types/opt'

const policyLabels = {
  DISABLED: '未启用',
  CONFIGURING: '配置中',
  ENABLING: '启用中',
  ENABLED: '已启用',
  DISABLING: '关闭中',
} as const

interface TenantFormState {
  name: string
  account: string
  personalBudgetAllowed: boolean
  reason: string
}

const emptyForm: TenantFormState = {
  name: '',
  account: '',
  personalBudgetAllowed: false,
  reason: '',
}

function AuthorizationSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label="允许租户配置个人预算"
      aria-checked={checked}
      className={`opt-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" />
    </button>
  )
}

function TenantDialog({
  tenant,
  form,
  error,
  onFormChange,
  onClose,
  onSave,
}: {
  tenant: OptTenant | null
  form: TenantFormState
  error: string | null
  onFormChange: (form: TenantFormState) => void
  onClose: () => void
  onSave: () => void
}) {
  const editing = Boolean(tenant)
  const dialogTitle = editing ? '编辑租户' : '新建租户'

  return (
    <div className="modal-backdrop">
      <section className="opt-tenant-dialog" role="dialog" aria-modal="true" aria-labelledby="opt-tenant-dialog-title">
        <header className="dialog-header">
          <div>
            <h3 id="opt-tenant-dialog-title">{dialogTitle}</h3>
            <span>{editing ? `${tenant?.name} · ${tenant?.account}` : '新租户默认不开放个人预算配置能力'}</span>
          </div>
          <button type="button" className="icon-button" aria-label={`关闭${dialogTitle}`} title="关闭" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="dialog-body opt-dialog-body">
          <label className="field">
            <span>租户名称</span>
            <input aria-label="租户名称" value={form.name} disabled={editing} placeholder="请输入租户名称" onChange={(event) => onFormChange({ ...form, name: event.target.value })} />
          </label>
          <label className="field">
            <span>租户账号</span>
            <input aria-label="租户账号" value={form.account} disabled={editing} placeholder="请输入英文账号" onChange={(event) => onFormChange({ ...form, account: event.target.value })} />
          </label>
          <section className="opt-entitlement-field" aria-labelledby="entitlement-field-title">
            <div>
              <strong id="entitlement-field-title">允许租户配置个人预算</strong>
              <p>仅开放配置能力，不会自动启用，也不会自动给成员分配额度。</p>
            </div>
            <AuthorizationSwitch checked={form.personalBudgetAllowed} onChange={(checked) => onFormChange({ ...form, personalBudgetAllowed: checked })} />
          </section>
          <label className="field">
            <span>变更原因</span>
            <textarea aria-label="变更原因" rows={3} value={form.reason} placeholder="请填写授权或撤销原因" onChange={(event) => onFormChange({ ...form, reason: event.target.value })} />
          </label>
          {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
        </div>
        <footer className="dialog-footer">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onSave}>{editing ? '保存修改' : '确认创建'}</Button>
        </footer>
      </section>
    </div>
  )
}

export function OptTenantManagementPage() {
  const [tenants, setTenants] = useState(initialOptTenants)
  const [query, setQuery] = useState('')
  const [authorizationFilter, setAuthorizationFilter] = useState('')
  const [editingTenant, setEditingTenant] = useState<OptTenant | null | undefined>(undefined)
  const [form, setForm] = useState<TenantFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingGrant, setPendingGrant] = useState<OptTenant | null>(null)
  const [pendingRevocation, setPendingRevocation] = useState<OptTenant | null>(null)
  const [detailTenant, setDetailTenant] = useState<OptTenant | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filteredTenants = useMemo(() => tenants.filter((tenant) => {
    if (query && !`${tenant.name}${tenant.account}`.toLowerCase().includes(query.toLowerCase())) return false
    if (authorizationFilter === 'allowed' && !tenant.personalBudgetAllowed) return false
    if (authorizationFilter === 'denied' && tenant.personalBudgetAllowed) return false
    return true
  }), [authorizationFilter, query, tenants])

  const openCreate = () => {
    setEditingTenant(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const openEdit = (tenant: OptTenant) => {
    setEditingTenant(tenant)
    setForm({
      name: tenant.name,
      account: tenant.account,
      personalBudgetAllowed: tenant.personalBudgetAllowed,
      reason: '',
    })
    setFormError(null)
  }

  const closeDialog = () => {
    setEditingTenant(undefined)
    setFormError(null)
  }

  const applyGrant = (tenant: OptTenant, reason: string) => {
    setTenants((current) => current.map((item) => item.id === tenant.id ? {
      ...item,
      personalBudgetAllowed: true,
      budgetPolicyStatus: 'DISABLED',
      authorizationUpdatedBy: 'yuejiao@biomap.com',
      authorizationUpdatedAt: '2026-08-27 19:02:16',
      authorizationReason: reason,
    } : item))
    setPendingGrant(null)
    closeDialog()
    setToast('个人预算配置授权已开放')
  }

  const applyRevocation = (tenant: OptTenant, reason: string) => {
    setTenants((current) => current.map((item) => item.id === tenant.id ? {
      ...item,
      personalBudgetAllowed: false,
      budgetPolicyStatus: 'DISABLED',
      authorizationUpdatedBy: 'yuejiao@biomap.com',
      authorizationUpdatedAt: '2026-08-27 19:02:16',
      authorizationReason: reason,
    } : item))
    setPendingRevocation(null)
    closeDialog()
    setToast('个人预算配置授权已撤销')
  }

  const save = () => {
    if (!form.name.trim() || !form.account.trim()) {
      setFormError('请填写租户名称和租户账号')
      return
    }
    if (editingTenant?.personalBudgetAllowed && !form.personalBudgetAllowed) {
      const revocationBlocked = editingTenant.budgetPolicyStatus !== 'DISABLED'
        || editingTenant.budgetCommitment > 0
        || editingTenant.budgetReserved > 0
        || editingTenant.budgetDraftCount > 0
      if (revocationBlocked) {
        setFormError('请先在租户管理后台关闭个人预算并清空预占、成员额度和配置草稿，再撤销授权。')
        return
      }
    }

    if (!form.reason.trim()) {
      setFormError('请填写变更原因')
      return
    }

    if (!editingTenant) {
      setTenants((current) => [{
        id: `tenant-${Date.now()}`,
        name: form.name.trim(),
        account: form.account.trim(),
        status: 'ACTIVE',
        productLines: [],
        personalBudgetAllowed: form.personalBudgetAllowed,
        budgetPolicyStatus: 'DISABLED',
        budgetCommitment: 0,
        budgetReserved: 0,
        budgetDraftCount: 0,
        authorizationUpdatedBy: 'yuejiao@biomap.com',
        authorizationUpdatedAt: '2026-08-27 19:02:16',
        authorizationReason: form.reason.trim(),
      }, ...current])
      closeDialog()
      setToast('租户创建成功')
      return
    }

    if (!editingTenant.personalBudgetAllowed && form.personalBudgetAllowed) {
      setPendingGrant(editingTenant)
      return
    }

    if (editingTenant.personalBudgetAllowed && !form.personalBudgetAllowed) {
      setPendingRevocation(editingTenant)
      return
    }

    setTenants((current) => current.map((item) => item.id === editingTenant.id ? {
      ...item,
      personalBudgetAllowed: form.personalBudgetAllowed,
      authorizationUpdatedBy: 'yuejiao@biomap.com',
      authorizationUpdatedAt: '2026-08-27 19:02:16',
      authorizationReason: form.reason.trim(),
    } : item))
    closeDialog()
    setToast('租户授权设置已更新')
  }

  return (
    <div className="opt-shell">
      <aside className="opt-sidebar">
        <div className="opt-brand"><BioMapMark /><strong>BioMap OPT</strong></div>
        <nav aria-label="OPT 管理导航">
          <a href="#dashboard"><LayoutDashboard size={17} />首页</a>
          <a href="#tenant" className="is-active"><Building2 size={17} />租户管理</a>
          <a href="#account"><Users size={17} />用户管理</a>
          <a href="#contract"><KeyRound size={17} />合同与产品</a>
          <a href="#audit"><FileClock size={17} />操作日志</a>
          <a href="#settings"><Settings2 size={17} />系统设置</a>
        </nav>
      </aside>
      <div className="opt-content">
        <header className="opt-topbar">
          <span>内部运营管理后台</span>
          <div><span className="account-avatar">Y</span><strong>yuejiao@biomap.com</strong></div>
        </header>
        <main className="opt-main">
          <header className="opt-page-heading">
            <div><h1>租户管理</h1><p>维护租户基础信息、产品权限与个人预算配置授权</p></div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>新建租户</Button>
          </header>

          <section className="filter-panel opt-filter-panel" aria-labelledby="opt-filter-title">
            <div className="filter-panel-heading">
              <div className="filter-title-wrap"><Filter size={16} /><h2 id="opt-filter-title">筛选</h2><span>共 {filteredTenants.length} 个租户</span></div>
              <Button icon={<Search size={15} />}>查询</Button>
            </div>
            <div className="filter-grid opt-filter-grid">
              <label className="field"><span>租户名称或账号</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="请输入租户名称或账号" /></label>
              <label className="field select-field"><span>个人预算授权</span><select aria-label="个人预算授权" value={authorizationFilter} onChange={(event) => setAuthorizationFilter(event.target.value)}><option value="">全部</option><option value="allowed">已允许</option><option value="denied">未允许</option></select><ChevronDown size={14} /></label>
            </div>
          </section>

          <section className="data-section" aria-labelledby="tenant-list-title">
            <div className="section-heading"><h2 id="tenant-list-title">租户列表</h2><span>授权关闭不影响历史账务记录</span></div>
            <div className="table-shell">
              <table className="data-table opt-tenant-table">
                <thead><tr><th>租户</th><th>状态</th><th>产品线</th><th>个人预算授权</th><th>租户策略</th><th>授权更新时间</th><th>操作</th></tr></thead>
                <tbody>{filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td data-label="租户"><div className="opt-cell-content"><strong>{tenant.name}</strong><small>{tenant.account}</small></div></td>
                    <td data-label="状态"><span className={`opt-status is-${tenant.status.toLowerCase()}`}>{tenant.status === 'ACTIVE' ? '正常' : '已停用'}</span></td>
                    <td data-label="产品线"><span className="opt-cell-content">{tenant.productLines.length ? tenant.productLines.join('、') : '--'}</span></td>
                    <td data-label="个人预算授权"><span className={`opt-entitlement ${tenant.personalBudgetAllowed ? 'is-allowed' : 'is-denied'}`}>{tenant.personalBudgetAllowed ? '已允许' : '未允许'}</span></td>
                    <td data-label="租户策略"><span className="opt-cell-content">{policyLabels[tenant.budgetPolicyStatus]}</span></td>
                    <td data-label="授权更新时间"><div className="opt-cell-content"><span>{tenant.authorizationUpdatedAt}</span><small>{tenant.authorizationUpdatedBy}</small></div></td>
                    <td data-label="操作"><div className="row-actions"><Button variant="link" aria-label={`编辑租户 ${tenant.name}`} onClick={() => openEdit(tenant)}>编辑</Button><Button variant="link" aria-label={`查看租户 ${tenant.name} 授权详情`} onClick={() => setDetailTenant(tenant)}>详情</Button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {editingTenant !== undefined && <TenantDialog tenant={editingTenant} form={form} error={formError} onFormChange={setForm} onClose={closeDialog} onSave={save} />}

      {pendingGrant && (
        <div className="modal-backdrop">
          <section className="policy-dialog" role="dialog" aria-modal="true" aria-labelledby="grant-confirm-title">
            <header className="dialog-header"><div><h3 id="grant-confirm-title">确认开放个人预算配置</h3><span>{pendingGrant.name}</span></div><button type="button" className="icon-button" aria-label="关闭确认开放弹窗" onClick={() => setPendingGrant(null)}><X size={18} /></button></header>
            <div className="policy-dialog-body"><div className="opt-confirm-message"><CircleAlert size={18} /><div><p>该操作不会自动启用个人预算，也不会自动给成员分配额度。</p><p>租户管理员需要进入额度管理完成首轮配置并确认启用。</p></div></div></div>
            <footer className="dialog-footer"><Button onClick={() => setPendingGrant(null)}>取消</Button><Button variant="primary" onClick={() => applyGrant(pendingGrant, form.reason.trim())}>确认开放</Button></footer>
          </section>
        </div>
      )}

      {pendingRevocation && (
        <div className="modal-backdrop">
          <section className="policy-dialog" role="dialog" aria-modal="true" aria-labelledby="revoke-confirm-title">
            <header className="dialog-header"><div><h3 id="revoke-confirm-title">确认撤销个人预算配置权限</h3><span>{pendingRevocation.name}</span></div><button type="button" className="icon-button" aria-label="关闭确认撤销弹窗" onClick={() => setPendingRevocation(null)}><X size={18} /></button></header>
            <div className="policy-dialog-body"><div className="opt-confirm-message"><CircleAlert size={18} /><div><p>撤销后，租户管理员将无法配置或启用个人预算。</p><p>该操作不会删除历史账务记录；重新授权后仍从未启用状态开始。</p></div></div></div>
            <footer className="dialog-footer"><Button onClick={() => setPendingRevocation(null)}>取消</Button><Button variant="danger" onClick={() => applyRevocation(pendingRevocation, form.reason.trim())}>确认撤销</Button></footer>
          </section>
        </div>
      )}

      {detailTenant && (
        <div className="drawer-backdrop">
          <aside className="opt-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="opt-detail-title">
            <header className="drawer-header"><div><h3 id="opt-detail-title">个人预算授权详情</h3><span>{detailTenant.name} · {detailTenant.account}</span></div><button type="button" className="icon-button" aria-label="关闭授权详情" onClick={() => setDetailTenant(null)}><X size={18} /></button></header>
            <div className="drawer-body"><dl className="opt-detail-list"><div><dt>授权状态</dt><dd>{detailTenant.personalBudgetAllowed ? '已允许' : '未允许'}</dd></div><div><dt>租户策略</dt><dd>{policyLabels[detailTenant.budgetPolicyStatus]}</dd></div><div><dt>修改人</dt><dd>{detailTenant.authorizationUpdatedBy}</dd></div><div><dt>修改时间</dt><dd>{detailTenant.authorizationUpdatedAt}</dd></div><div><dt>变更原因</dt><dd>{detailTenant.authorizationReason}</dd></div></dl></div>
          </aside>
        </div>
      )}

      {toast && <div className="success-toast" role="status"><span>{toast}</span><button type="button" aria-label="关闭成功提示" onClick={() => setToast(null)}><X size={16} /></button></div>}
    </div>
  )
}
