import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BudgetManagementPage } from './BudgetManagementPage'

describe('BudgetManagementPage', () => {
  it('keeps personal budget visible while explaining zero executable CRO capacity', () => {
    render(<BudgetManagementPage />)

    const zhangRow = screen.getByRole('row', { name: /张雯/ })
    expect(within(zhangRow).getByText('个人可用 1,500')).toBeInTheDocument()
    expect(within(zhangRow).getByText('当前可执行 0')).toBeInTheDocument()
    expect(within(zhangRow).getByText('租户支付能力不足')).toBeInTheDocument()

    const croSummary = screen.getByRole('region', { name: 'CRO币 额度概览' })
    expect(within(croSummary).getByText('租户账面余额')).toBeInTheDocument()
    expect(within(croSummary).getByLabelText('租户账面余额 0')).toBeInTheDocument()
  })

  it('allocates Credits without deducting the tenant ledger balance', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.click(screen.getByRole('button', { name: '给张雯分配额度' }))
    await user.type(screen.getByLabelText('分配金额'), '200')
    await user.type(screen.getByLabelText('操作备注'), '追加抗体项目预算')
    await user.click(screen.getByRole('button', { name: '确认分配' }))

    expect(screen.getByRole('status')).toHaveTextContent('额度分配成功')
    const zhangRow = screen.getByRole('row', { name: /张雯/ })
    expect(within(zhangRow).getByText('个人可用 8,400')).toBeInTheDocument()

    const creditsSummary = screen.getByRole('region', { name: 'Credits 额度概览' })
    expect(within(creditsSummary).getByText('120,000')).toBeInTheDocument()
    expect(within(creditsSummary).getByText('88,600')).toBeInTheDocument()
  })

  it('rejects an over-limit batch allocation without changing any selected member', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.click(screen.getByRole('checkbox', { name: '选择张雯' }))
    await user.click(screen.getByRole('checkbox', { name: '选择秦雯' }))
    await user.click(screen.getByRole('button', { name: '批量分配额度' }))
    await user.type(screen.getByLabelText('分配金额'), '50000')
    await user.type(screen.getByLabelText('操作备注'), '批量季度预算')
    await user.click(screen.getByRole('button', { name: '确认分配' }))

    expect(screen.getByRole('alert')).toHaveTextContent('批量分配总额不能超过租户未分配额度')
    expect(within(screen.getByRole('row', { name: /张雯/ })).getByText('个人可用 8,200')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /秦雯/ })).getByText('个人可用 6,500')).toBeInTheDocument()
  })

  it('recovers only available personal budget into the tenant unallocated pool', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.click(screen.getByRole('button', { name: '回收张雯额度' }))
    await user.type(screen.getByLabelText('回收金额'), '200')
    await user.type(screen.getByLabelText('操作备注'), '项目预算回收')
    await user.click(screen.getByRole('button', { name: '确认回收' }))

    expect(screen.getByRole('status')).toHaveTextContent('额度回收成功')
    expect(within(screen.getByRole('row', { name: /张雯/ })).getByText('个人可用 8,000')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Credits 额度概览' })).getByText('89,000')).toBeInTheDocument()
  })

  it('filters members and opens an immutable ledger drawer', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.type(screen.getByLabelText('成员邮箱'), 'qinwen')
    await user.click(screen.getByRole('button', { name: '查询' }))
    expect(screen.getByRole('row', { name: /秦雯/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /张雯/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看秦雯额度流水' }))
    expect(screen.getByRole('dialog', { name: '秦雯的额度流水' })).toBeInTheDocument()
    expect(screen.getByText('CRO 实验预算')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '秦雯的额度流水' })).not.toBeInTheDocument()
  })

  it('explains why personal budget control cannot close with live reservations', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.click(screen.getByRole('switch', { name: '个人预算控制' }))

    expect(screen.getByRole('dialog', { name: '关闭个人预算控制' })).toBeInTheDocument()
    expect(screen.getByText(/当前存在运行中预占/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认关闭' })).toBeDisabled()
  })
})
