import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('tenant admin shell', () => {
  it('places budget management in the existing header navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'BioMap 门户' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '用户中心' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '额度管理' }))

    expect(screen.getByRole('heading', { name: '额度管理' })).toBeInTheDocument()
    expect(screen.getByText('成员额度')).toBeInTheDocument()
  })

  it('returns to the UserCenter replica without reloading', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '额度管理' }))
    await user.click(screen.getByRole('button', { name: '用户中心' }))

    expect(screen.getByText('注册用户审核')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增用户' })).toBeInTheDocument()
  })

  it('opens the personal expense page from the GitHub Pages subpath', () => {
    window.history.replaceState(
      {},
      '',
      '/biomap-budget-prototypes/deduction-records/',
    )

    render(<App />)

    expect(screen.getByRole('heading', { name: '扣减记录' })).toBeInTheDocument()
  })
})
