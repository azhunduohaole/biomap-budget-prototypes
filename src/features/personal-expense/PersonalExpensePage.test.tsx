import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import personalExpenseCss from '../../styles/personal-expense.css?inline'
import { PersonalExpensePage } from './PersonalExpensePage'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/deduction-records')
})

describe('PersonalExpensePage', () => {
  it('uses the BioMap OS user-facing browser title', () => {
    render(<PersonalExpensePage />)

    expect(document.title).toBe('Biomap OS')
  })

  it('explains executable capacity without exposing tenant finances', () => {
    render(<PersonalExpensePage />)

    expect(screen.getByRole('heading', { name: 'BioMap OS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '扣减记录' })).toBeInTheDocument()

    const croOverview = screen.getByRole('region', { name: 'CRO币个人额度' })
    expect(within(croOverview).getByText('1,500')).toBeInTheDocument()
    expect(within(croOverview).getByText('当前可执行额度')).toBeInTheDocument()
    expect(within(croOverview).getByText('0')).toBeInTheDocument()
    expect(within(croOverview).getByText('租户支付能力不足')).toBeInTheDocument()
    expect(screen.getByText(/个人预算不会扣除/)).toBeInTheDocument()

    expect(screen.queryByText('租户账面余额')).not.toBeInTheDocument()
    expect(screen.queryByText('租户未分配额度')).not.toBeInTheDocument()
  })

  it('shows unavailable values instead of cached values or zero', () => {
    window.history.replaceState({}, '', '/deduction-records?budgetService=unavailable')
    render(<PersonalExpensePage />)

    expect(screen.getAllByText('--')).toHaveLength(8)
    expect(screen.getAllByText('暂无法获取')).toHaveLength(2)
    expect(screen.queryByText('8,200')).not.toBeInTheDocument()
    expect(screen.queryByText('1,500')).not.toBeInTheDocument()
  })

  it('filters by task name and resets the applied conditions', async () => {
    const user = userEvent.setup()
    render(<PersonalExpensePage />)

    await user.type(screen.getByLabelText('任务名称'), '抗体')
    await user.click(screen.getByRole('button', { name: '查询' }))

    expect(screen.getByText('抗体亲和力预测')).toBeInTheDocument()
    expect(screen.queryByText('Agent 任务')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重置' }))
    expect(screen.getByText('Agent 任务')).toBeInTheDocument()
    expect(screen.getByLabelText('任务名称')).toHaveValue('')
  })

  it('shows an explicit empty state when no expense record matches', async () => {
    const user = userEvent.setup()
    render(<PersonalExpensePage />)

    await user.type(screen.getByLabelText('任务名称'), '不存在的任务')
    await user.click(screen.getByRole('button', { name: '查询' }))

    expect(screen.getByText('暂无匹配的扣减记录')).toBeInTheDocument()
  })

  it('opens a read-only detail drawer and closes it with Escape', async () => {
    const user = userEvent.setup()
    render(<PersonalExpensePage />)

    await user.click(screen.getByRole('button', { name: '查看抗体亲和力预测费用详情' }))

    const drawer = screen.getByRole('dialog', { name: '费用详情' })
    expect(drawer).toBeInTheDocument()
    expect(within(drawer).getByText('task_ab_20260826_0041')).toBeInTheDocument()
    expect(within(drawer).getByText('ledger-personal-002')).toBeInTheDocument()
    expect(within(drawer).getByText('抗体亲和力预测')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: '费用详情' })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('applies the BioMap panel treatment to personal budget cards', () => {
    render(<PersonalExpensePage />)

    expect(personalExpenseCss).toContain('.personal-budget-card')
    expect(personalExpenseCss).toContain('border: 1px solid var(--color-border-default)')
    expect(personalExpenseCss).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(screen.getByRole('table', { name: '个人扣减记录' })).toHaveClass('personal-expense-table')
  })
})
