import { ChevronDown, Filter, Plus } from 'lucide-react'

import { Button } from '../../components/ui/Button'

const userRows = [
  ['zhangwen@biomap.com', '抗体-超级管理员', '邀请注册', '2026-08-26 11:14:56', '2026-08-26 11:19:36'],
  ['qinwen@biomap.com', '合成生物学-非超管', '邀请注册', '2026-08-13 18:44:21', '2026-08-21 18:21:11'],
  ['xinping_2026@biomap.com', 'zzt-抗体', '邀请注册', '2026-08-12 11:29:10', '2026-08-20 17:34:04'],
  ['keyu_2026@biomap.com', 'cc-test', '邀请注册', '2026-08-12 11:28:49', '2026-08-19 13:54:44'],
  ['rongwei@biomap.com', '项目管理-超级管理员', '邀请注册', '2026-08-10 15:09:08', '2026-08-25 12:56:55'],
]

export function UserCenterPage() {
  return (
    <section className="page page-user-center">
      <h2 className="page-title">用户中心</h2>

      <div className="page-tabs" role="tablist" aria-label="用户中心视图">
        <button type="button" role="tab" aria-selected="true" className="page-tab is-active">用户中心</button>
        <button type="button" role="tab" aria-selected="false" className="page-tab">注册用户审核</button>
      </div>

      <section className="filter-panel" aria-labelledby="user-filter-title">
        <div className="filter-panel-heading">
          <div className="filter-title-wrap">
            <Filter size={16} aria-hidden="true" />
            <h3 id="user-filter-title">筛选</h3>
            <span>（已选0项筛选条件）</span>
          </div>
          <div className="filter-actions">
            <Button variant="primary">查询</Button>
            <Button>重置</Button>
          </div>
        </div>

        <div className="filter-grid user-filter-grid">
          <label className="field">
            <span>用户邮箱</span>
            <input type="search" placeholder="请输入用户邮箱" />
          </label>
          {['状态', '角色', '注册来源'].map((label) => (
            <label className="field select-field" key={label}>
              <span>{label}</span>
              <select defaultValue="">
                <option value="">请选择{label}</option>
                <option value="normal">正常</option>
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
          ))}
        </div>
      </section>

      <section className="data-section" aria-labelledby="user-list-title">
        <div className="section-heading">
          <h3 id="user-list-title">用户列表</h3>
          <Button variant="primary" icon={<Plus size={16} aria-hidden="true" />}>新增用户</Button>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户邮箱</th>
                <th>角色</th>
                <th>注册来源</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>最后登录时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td><span className="role-tag">抗体</span><span className="role-tag">{row[1]}</span></td>
                  <td>{row[2]}</td>
                  <td><span className="status-tag status-success"><span aria-hidden="true" />正常</span></td>
                  <td>{row[3]}</td>
                  <td>{row[4]}</td>
                  <td className="row-actions"><Button variant="link">管理角色</Button><Button variant="danger">禁用</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination" aria-label="用户列表分页">
          <span>共 160 条</span>
          <button type="button" className="page-number is-current" aria-current="page">1</button>
          <button type="button" className="page-number">2</button>
          <button type="button" className="page-number">3</button>
          <span>…</span>
          <button type="button" className="page-number">16</button>
          <select aria-label="每页条数" defaultValue="10"><option value="10">10 / page</option></select>
        </div>
      </section>
    </section>
  )
}
