import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BudgetManagementPage } from './BudgetManagementPage'

describe('BudgetManagementPage', () => {
  it('shows only the tenant overview and unified ledger when OPT authorization is absent', () => {
    render(<BudgetManagementPage initialEntitlementAllowed={false} initialPolicyStatus="DISABLED" />)

    expect(screen.getByRole('heading', { name: '租户额度概览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '统一额度流水' })).toBeInTheDocument()
    expect(screen.queryByText('成员预算明细')).not.toBeInTheDocument()
    expect(screen.queryByText('个人预算控制')).not.toBeInTheDocument()
    expect(screen.getByText('历史租户级计费')).toBeInTheDocument()
  })

  it('activates one member without blocking or enabling another member', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage initialPolicyStatus="DISABLED" />)

    await user.click(screen.getByRole('button', { name: '开始配置' }))
    await user.click(screen.getByRole('button', { name: '给张雯配置预算' }))
    expect(screen.getByRole('dialog', { name: '配置 张雯 的个人预算' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Credits 预算上限'), '200')
    await user.type(screen.getByLabelText('CRO币预算上限'), '0')
    await user.type(screen.getByLabelText('配置备注'), '首轮成员预算')
    await user.click(screen.getByRole('button', { name: '确认并启用' }))

    expect(screen.getByRole('status')).toHaveTextContent('张雯 已进入启用中')
    expect(within(screen.getByRole('row', { name: /张雯/ })).getByText('启用中', { selector: '.member-budget-status' })).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /秦雯/ })).getByText('待配置')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /秦雯/ })).getByRole('button', { name: '给秦雯配置预算' })).not.toBeDisabled()

    expect(await screen.findByText('张雯 的个人预算已生效')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /张雯/ })).getByText('已启用', { selector: '.member-budget-status' })).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /张雯/ })).getByText('个人可用 200')).toBeInTheDocument()
    expect(screen.getByText('已启用 1 / 5 人')).toBeInTheDocument()
  })

  it('requires explicit values for both currencies before confirming a member budget', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage initialPolicyStatus="DISABLED" />)

    await user.click(screen.getByRole('button', { name: '开始配置' }))
    await user.click(screen.getByRole('button', { name: '给张雯配置预算' }))
    await user.type(screen.getByLabelText('配置备注'), '补充零额度原因')
    await user.click(screen.getByRole('button', { name: '确认并启用' }))

    expect(screen.getByRole('alert')).toHaveTextContent('请填写 Credits 和 CRO币额度；如无需分配请填写 0')
    expect(screen.getByRole('dialog', { name: '配置 张雯 的个人预算' })).toBeInTheDocument()
  })

  it('allows explicit zero budgets and enables the tenant after every active member is confirmed', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage initialPolicyStatus="DISABLED" />)

    await user.click(screen.getByRole('button', { name: '开始配置' }))
    for (const name of ['张雯', '秦雯', '辛平', '柯宇', '荣伟']) {
      await user.click(screen.getByRole('button', { name: `给${name}配置预算` }))
      await user.type(screen.getByLabelText('Credits 预算上限'), '0')
      await user.type(screen.getByLabelText('CRO币预算上限'), '0')
      await user.type(screen.getByLabelText('配置备注'), '零额度启用')
      await user.click(screen.getByRole('button', { name: '确认并启用' }))
      await new Promise((resolve) => window.setTimeout(resolve, 350))
    }

    expect(await screen.findByText('个人预算已启用', { selector: '#policy-status-title' })).toBeInTheDocument()
    expect(screen.getByText('已启用 5 / 5 人')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /张雯/ })).getAllByText('个人可用 0')).toHaveLength(2)
    expect(within(screen.getByRole('row', { name: /张雯/ })).getAllByText('个人额度不足', { selector: '.block-reason' })).toHaveLength(2)
  })

  it('exposes task billing fields needed to replace the legacy deduction page', async () => {
    const user = userEvent.setup()
    render(<BudgetManagementPage />)

    await user.click(screen.getByRole('tab', { name: '额度流水' }))
    expect(screen.getByText('本月 Credits 扣减')).toBeInTheDocument()
    expect(screen.getByText('租户可用余额')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '记录分类' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '计费范围' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '流水产品线' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '流水状态' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '流水操作类型' })).toBeInTheDocument()
    expect(screen.getByLabelText('流水开始时间')).toBeInTheDocument()
    expect(screen.getByLabelText('流水结束时间')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '导出流水' })).toBeInTheDocument()
    expect(screen.getByLabelText('当前预占 Credits 1,200 CRO币 0')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '计费范围' }), 'TENANT_ONLY')
    expect(screen.getByLabelText('本月 Credits 扣减 2,400')).toBeInTheDocument()
    expect(screen.queryByText('抗体亲和力预测')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看历史租户级计费详情' }))
    const drawer = screen.getByRole('dialog', { name: '流水详情' })
    expect(within(drawer).getByText('租户级计费')).toBeInTheDocument()
    expect(within(drawer).getByText('普通额度')).toBeInTheDocument()
    expect(within(drawer).getByText('实际用量')).toBeInTheDocument()
  })

  it('prioritizes a disabled account over budget insufficiency', () => {
    render(<BudgetManagementPage />)

    const disabledMember = screen.getByRole('row', { name: /文彪/ })
    expect(within(disabledMember).getAllByText('账号已禁用')).toHaveLength(2)
    expect(within(disabledMember).queryByText('个人额度不足')).not.toBeInTheDocument()
  })

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

    await user.click(screen.getByRole('button', { name: '关闭个人预算' }))

    expect(screen.getByRole('dialog', { name: '关闭个人预算控制' })).toBeInTheDocument()
    expect(screen.getByText(/当前存在运行中预占/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认关闭' })).toBeDisabled()
    expect(screen.getByText('Credits：5,500')).toBeInTheDocument()
  })
})
