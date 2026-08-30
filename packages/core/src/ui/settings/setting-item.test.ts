import 'src/setup-test-env'
import { describe, it, expect, jest } from '@jest/globals'
import { SettingItem } from './setting-item'


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
