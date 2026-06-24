// @vitest-environment node

import { describe, expect, it } from 'vitest'
import config from '../../vite.config'

describe('vite config', () => {
  it('builds assets for the standalone root dashboard server', () => {
    expect(config.base).toBe('/')
  })
})
