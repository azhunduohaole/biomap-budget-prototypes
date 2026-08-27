import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { OptTenantManagementPage } from './OptTenantManagementPage'

describe('OptTenantManagementPage', () => {
  it('creates tenants with personal budget authorization off by default', async () => {
    const user = userEvent.setup()
    render(<OptTenantManagementPage />)

    await user.click(screen.getByRole('button', { name: '新建租户' }))
    expect(screen.getByRole('switch', { name: '允许租户配置个人预算' })).not.toBeChecked()
    expect(screen.getByText('仅开放配置能力，不会自动启用，也不会自动给成员分配额度。')).toBeInTheDocument()
  })

  it('blocks authorization revocation while the tenant policy is enabled', async () => {
    const user = userEvent.setup()
    render(<OptTenantManagementPage />)

    const tenantRow = screen.getByRole('row', { name: /BioMap 研发平台/ })
    await user.click(within(tenantRow).getByRole('button', { name: '编辑租户 BioMap 研发平台' }))
    await user.click(screen.getByRole('switch', { name: '允许租户配置个人预算' }))
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请先在租户管理后台关闭个人预算并清空预占')
    expect(screen.getByRole('dialog', { name: '编辑租户' })).toBeInTheDocument()
  })

  it('requires confirmation before granting authorization', async () => {
    const user = userEvent.setup()
    render(<OptTenantManagementPage />)

    const tenantRow = screen.getByRole('row', { name: /北辰生物/ })
    await user.click(within(tenantRow).getByRole('button', { name: '编辑租户 北辰生物' }))
    await user.click(screen.getByRole('switch', { name: '允许租户配置个人预算' }))
    await user.type(screen.getByLabelText('变更原因'), '首批试点租户')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(screen.getByRole('dialog', { name: '确认开放个人预算配置' })).toBeInTheDocument()
    expect(screen.getByText('该操作不会自动启用个人预算，也不会自动给成员分配额度。')).toBeInTheDocument()
  })

  it('requires confirmation before revoking a clean authorization', async () => {
    const user = userEvent.setup()
    render(<OptTenantManagementPage />)

    let tenantRow = screen.getByRole('row', { name: /北辰生物/ })
    await user.click(within(tenantRow).getByRole('button', { name: '编辑租户 北辰生物' }))
    await user.click(screen.getByRole('switch', { name: '允许租户配置个人预算' }))
    await user.type(screen.getByLabelText('变更原因'), '开放试用')
    await user.click(screen.getByRole('button', { name: '保存修改' }))
    await user.click(screen.getByRole('button', { name: '确认开放' }))

    tenantRow = screen.getByRole('row', { name: /北辰生物/ })
    await user.click(within(tenantRow).getByRole('button', { name: '编辑租户 北辰生物' }))
    await user.click(screen.getByRole('switch', { name: '允许租户配置个人预算' }))
    await user.type(screen.getByLabelText('变更原因'), '试用结束')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(screen.getByRole('dialog', { name: '确认撤销个人预算配置权限' })).toBeInTheDocument()
    expect(screen.getByText(/重新授权后仍从未启用状态开始/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认撤销' }))

    tenantRow = screen.getByRole('row', { name: /北辰生物/ })
    expect(within(tenantRow).getByText('未允许')).toBeInTheDocument()
  })

  it('labels every tenant field for the responsive card layout', () => {
    render(<OptTenantManagementPage />)

    const tenantRow = screen.getByRole('row', { name: /BioMap 研发平台/ })
    expect(within(tenantRow).getByText('已允许').closest('td')).toHaveAttribute('data-label', '个人预算授权')
    expect(within(tenantRow).getByText('已启用').closest('td')).toHaveAttribute('data-label', '租户策略')
  })
})
