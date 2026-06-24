import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusBadge from '@/components/StatusBadge.vue'
import UsageBar from '@/components/UsageBar.vue'

describe('base dashboard components', () => {
  it('renders status tone class', () => {
    const wrapper = mount(StatusBadge, { props: { label: '正常', tone: 'success' } })
    expect(wrapper.text()).toContain('正常')
    expect(wrapper.classes()).toContain('status-badge--success')
  })

  it('renders usage width from percent', () => {
    const wrapper = mount(UsageBar, { props: { label: '5h', percent: 42, amount: '42%' } })
    const fill = wrapper.get('.usage-bar__fill')
    expect(fill.attributes('style')).toContain('width: 42%')
  })
})
