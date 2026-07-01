import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import UpdatePanel from '@/components/UpdatePanel.vue'

describe('UpdatePanel', () => {
  it('checks for updates with the entered key', async () => {
    const api = {
      checkUpdates: vi.fn().mockResolvedValue({
        current_version: 'v0.1.1',
        latest_version: 'v0.1.2',
        has_update: true,
        release_info: { name: 'v0.1.2', body: 'more data', published_at: '2026-07-01T00:00:00Z', html_url: 'https://example.com' },
      }),
      update: vi.fn(),
      restart: vi.fn(),
      rollback: vi.fn(),
    }
    const wrapper = mount(UpdatePanel, { props: { api } })

    await wrapper.get('input').setValue('update-secret')
    await wrapper.get('[data-test="check-update"]').trigger('click')

    expect(api.checkUpdates).toHaveBeenCalledWith(true)
    expect(wrapper.text()).toContain('发现新版本 v0.1.2')
  })
})
