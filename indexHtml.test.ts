import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('production HTML entry', () => {
  it('does not commit Vite development client injections', () => {
    const indexHtml = readFileSync('index.html', 'utf8')

    expect(indexHtml).not.toContain('/@vite/client')
    expect(indexHtml).not.toContain('/@react-refresh')
  })
})
