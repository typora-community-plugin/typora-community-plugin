import 'src/setup-test-env'
import { describe, it, expect, jest } from '@jest/globals'
import { SettingItem } from './setting-item'


describe('SettingItem.addBadge', () => {
  it('auto-creates a name when none exists', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)

    expect(() => setting.addBadge('v1.0.0')).not.toThrow()

    const name = setting.info.querySelector('.typ-setting-name')! as HTMLElement
    expect(name.textContent).toContain('v1.0.0')
  })

  it('appends a badge to the existing name', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)

    setting.addName('Plugin')
    setting.addBadge('local')

    expect([...setting.info.querySelectorAll('.typ-setting-name')]).toHaveLength(1)
    expect(setting.info.querySelector('.typ-setting-name')!.textContent).toContain('local')
  })
})

describe('SettingItem.addSidebarLayout', () => {
  const getItems = (el: HTMLElement) => [...el.querySelectorAll('.typ-nav__item')]

  function setup(items: string[], initialActive?: string) {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    const onSelect = jest.fn()
    const layout = setting.addSidebarLayout({ items, initialActive }, ctx => onSelect(ctx))
    return { setting, layout, sidebarEl: setting.info.querySelector('.typ-setting-sidebar')! as HTMLElement, panelEl: setting.info.querySelector('.typ-setting-panel')! as HTMLElement, onSelect }
  }

  it('renders initial items', () => {
    const { setting, sidebarEl } = setup(['a', 'b', 'c'])
    expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a', 'b', 'c'])
  })

  it('panel.addSetting() composes rows into the panel', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    let captured: any
    setting.addSidebarLayout({ items: ['a'] }, ctx => captured = ctx)
    expect(captured.panel).toBeDefined()

    captured.panel.addSetting(item => item.addName("Row 1"))
    captured.panel.addSetting(item => item.addDescription("desc 2"))

    const panelEl = setting.info.querySelector('.typ-setting-panel')! as HTMLElement
    expect(panelEl.childElementCount).toBe(2)
    const names = [...panelEl.querySelectorAll('.typ-setting-name')]
    expect(names.map(el => el.textContent)).toEqual(['Row 1 '])
    expect([...panelEl.querySelectorAll('.typ-setting-description')].map(el => el.textContent)).toEqual(['desc 2'])
  })

  it('re-selecting replaces the previous panel content', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    const ctxs: any[] = []
    setting.addSidebarLayout({ items: ['a', 'b'] }, ctx => {
      ctxs.push(ctx)
      ctx.panel.addSetting(item => item.addName(`Row ${ctx.item}`))
    })

    // initial selection of 'a' happened; now click 'b' in the sidebar
    const sidebarEl = setting.info.querySelector('.typ-setting-sidebar')! as HTMLElement
    ;(getItems(sidebarEl)[1] as HTMLElement).click()

    expect(ctxs.map(c => c.item)).toEqual(['a', 'b'])
    // 'a''s panel was removed from the DOM, only 'b''s remains
    const names = [...setting.info.querySelectorAll('.typ-setting-panel .typ-setting-name')]
    expect(names.map(el => el.textContent)).toEqual(['Row b '])
  })

  describe('addItem()', () => {
    it('appends a new item to the sidebar', () => {
      const { setting, layout, sidebarEl } = setup(['a'])
      layout.addItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a', 'b'])
    })

    it('does not add duplicate items', () => {
      const { setting, layout, sidebarEl } = setup(['a'])
      layout.addItem('a')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })
  })

  describe('removeItem()', () => {
    it('removes a non-active item and keeps the active one', () => {
      const { setting, layout, sidebarEl } = setup(['a', 'b'], 'a')
      layout.removeItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })

    it('switches to the first item when the active one is removed', () => {
      const { setting, layout, sidebarEl } = setup(['a', 'b'], 'b')
      layout.removeItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
      expect(getItems(sidebarEl)[0].classList.contains('active')).toBe(true)
    })

    it('clears the panel when the last item is removed', () => {
      const { setting, layout, sidebarEl, panelEl } = setup(['a'], 'a')
      layout.removeItem('a')
      expect(getItems(sidebarEl)).toHaveLength(0)
      expect(panelEl.childElementCount).toBe(0)
    })

    it('is a no-op for unknown items', () => {
      const { setting, layout, sidebarEl } = setup(['a'])
      layout.removeItem('zzz')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })
  })

  describe('setItems()', () => {
    it('replaces the item list', () => {
      const { setting, layout, sidebarEl } = setup(['a'])
      layout.setItems(['x', 'y'])
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['x', 'y'])
    })

    it('falls back to the first item when active is missing', () => {
      const { setting, layout, sidebarEl } = setup(['a'], 'a')
      layout.setItems(['b', 'c'])
      expect(getItems(sidebarEl)[0].classList.contains('active')).toBe(true)
    })

    it('clears the sidebar and panel when given an empty list', () => {
      const { setting, layout, sidebarEl, panelEl } = setup(['a'], 'a')
      layout.setItems([])
      expect(getItems(sidebarEl)).toHaveLength(0)
      expect(panelEl.childElementCount).toBe(0)
    })
  })
})
