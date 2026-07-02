import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import App from '@/App.vue'

const refreshAll = vi.fn()

vi.mock('@/composables/useDashboardData', () => ({
  useDashboardData: () => ({
    loading: ref(false),
    error: ref(null),
    subscriptions: ref([]),
    accounts: ref([]),
    accountUsages: ref({}),
    summary: ref({ subscriptions: 0, accounts: 0 }),
    refreshAll,
  }),
}))

describe('app chrome', () => {
  beforeEach(() => {
    refreshAll.mockClear()
  })

  it('renders the compact header without redundant operation copy', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('sub2api Dashboard')
    expect(wrapper.text()).toContain('只读运维面板')
    expect(wrapper.text()).not.toContain('运维浏览')
    expect(wrapper.text()).not.toContain('订阅与账号状态')
    expect(wrapper.text()).not.toContain('查看订阅用量、账号容量、调度状态和账号用量。')
  })
})
