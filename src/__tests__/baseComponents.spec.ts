import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReadonlySwitch from '@/components/ReadonlySwitch.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SummaryStrip from '@/components/SummaryStrip.vue'
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

  it('exposes readonly switch state to assistive technology', async () => {
    const wrapper = mount(ReadonlySwitch, { props: { modelValue: true } })

    expect(wrapper.attributes('role')).toBe('switch')
    expect(wrapper.attributes('aria-checked')).toBe('true')

    await wrapper.setProps({ modelValue: false })
    expect(wrapper.attributes('role')).toBe('switch')
    expect(wrapper.attributes('aria-checked')).toBe('false')
  })

  it('clamps usage percent and normalizes NaN to 0', async () => {
    const wrapper = mount(UsageBar, { props: { label: '5h', percent: 140, amount: '140%' } })
    const fill = wrapper.get('.usage-bar__fill')

    expect(fill.attributes('style')).toContain('width: 100%')

    await wrapper.setProps({ percent: -20 })
    expect(fill.attributes('style')).toContain('width: 0%')

    const nanWrapper = mount(UsageBar, { props: { label: '5h', percent: Number.NaN, amount: 'NaN%' } })
    expect(nanWrapper.get('.usage-bar__fill').element.getAttribute('style')).toContain('width: 0%')
  })

  it('renders summary label and value pairs with duplicate labels', () => {
    const wrapper = mount(SummaryStrip, {
      props: {
        items: [
          { label: 'Tokens', value: '1K' },
          { label: 'Tokens', value: '2K' },
        ],
      },
    })

    expect(wrapper.findAll('.summary-strip__label').map((item) => item.text())).toEqual(['Tokens', 'Tokens'])
    expect(wrapper.findAll('.summary-strip__value').map((item) => item.text())).toEqual(['1K', '2K'])
  })
})
