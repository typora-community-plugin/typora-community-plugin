import 'src/setup-test-env'
import { SettingItem } from 'src/ui/settings/setting-item'
import { describe, expect, it, vi } from 'vitest'


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

  it('accepts a builder for custom badge content', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)

    setting.addBadge(el => {
      el.classList.add('custom-badge')
      el.textContent = 'custom'
    })

    const badge = setting.info.querySelector('.typ-setting-name code.custom-badge')!
    expect(badge.textContent).toBe('custom')
  })
})

describe('SettingItem builders', () => {
  function create() {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    return setting
  }

  it('onunload removes the container', () => {
    const setting = create()

    setting.onunload()

    expect(setting.containerEl.isConnected).toBe(false)
  })

  it('addTitle accepts a string or a builder', () => {
    const setting = create()

    setting.addTitle('Title')
    setting.addTitle(el => { el.textContent = 'Built title' })

    const titles = [...setting.info.querySelectorAll('.typ-setting-title')]
    expect(titles.map(el => el.textContent)).toEqual(['Title', 'Built title'])
  })

  it('addName accepts a string or a builder', () => {
    const setting = create()

    setting.addName('Name')
    expect(setting.name!.textContent).toBe('Name ')
    expect(setting.info.querySelector('.typ-setting-name')).toBe(setting.name)

    setting.addName(el => { el.textContent = 'Built name' })
    expect(setting.name!.textContent).toBe('Built name')
  })

  it('addDescription accepts a string or a builder', () => {
    const setting = create()

    setting.addDescription('plain')
    setting.addDescription(el => { el.append('built') })

    const descriptions = [...setting.info.querySelectorAll('.typ-setting-description')]
    expect(descriptions.map(el => el.textContent)).toEqual(['plain', 'built'])
  })

  it('addCheckbox binds to a settings key', () => {
    const setting = create()
    const settings = {
      get: vi.fn(() => true),
      set: vi.fn(),
    }

    setting.addCheckbox({ settings: settings as any, bindingKey: 'feature' })

    const input = setting.controlsPrefix.querySelector('input')! as HTMLInputElement
    expect(settings.get).toHaveBeenCalledWith('feature')
    expect(input.checked).toBe(true)

    input.checked = false
    input.click()
    expect(settings.set).toHaveBeenCalledWith('feature', true)
  })

  it('addCheckbox accepts a builder', () => {
    const setting = create()
    const build = vi.fn((input: HTMLInputElement) => { input.checked = true })

    setting.addCheckbox(build)

    const input = setting.controlsPrefix.querySelector('input')!
    expect(build).toHaveBeenCalledWith(input)
    expect((input as HTMLInputElement).checked).toBe(true)
  })

  it('addButton builds a button in the controls area', () => {
    const setting = create()

    setting.addButton(button => { button.textContent = 'Run' })

    const button = setting.controls.querySelector('button.typ-button')!
    expect(button.textContent).toBe('Run')
  })

  it('addInput/addText/addTextArea add their controls', () => {
    const setting = create()

    setting.addInput('number', input => { input.value = '42' })
    setting.addText(input => { input.placeholder = 'name' })
    setting.addTextArea(textarea => { textarea.value = 'notes' })

    const [number, text] = setting.controls.querySelectorAll('input')
    expect((number as HTMLInputElement).type).toBe('number')
    expect((number as HTMLInputElement).value).toBe('42')
    expect((text as HTMLInputElement).type).toBe('text')
    expect((text as HTMLInputElement).placeholder).toBe('name')
    expect((setting.info.querySelector('textarea') as HTMLTextAreaElement).value).toBe('notes')
  })

  it('addSelect renders options and wires onchange', () => {
    const setting = create()
    const onchange = vi.fn()

    setting.addSelect({ options: ['a', 'b'], selected: 'b', onchange })

    const select = setting.controls.querySelector('select')! as HTMLSelectElement
    expect([...select.options].map(o => o.value)).toEqual(['a', 'b'])
    expect(select.options[1].selected).toBe(true)

    select.onchange!(new Event('change'))
    expect(onchange).toHaveBeenCalledTimes(1)
  })

  it('addSelect accepts a builder', () => {
    const setting = create()

    setting.addSelect(select => {
      select.append(new Option('x', 'x'))
    })

    expect(setting.controls.querySelector('select')!.options).toHaveLength(1)
  })

  it('addTag prepends a tag and runs the builder', () => {
    const setting = create()

    setting.addTag('alpha', el => el.classList.add('first'))
    setting.addTag('beta')

    const tags = [...setting.controls.querySelectorAll('.typ-tag')]
    expect(tags.map(el => el.textContent?.trim())).toEqual(['beta', 'alpha'])
    expect(tags[1].classList.contains('first')).toBe(true)
  })

  it('addRemovableTag removes the tag and calls onClose', () => {
    const setting = create()

    setting.addRemovableTag('alpha')
    const removable = setting.controls.querySelector('.typ-tag.removable')!
    ;(removable.querySelector('.typ-close') as HTMLElement).click()
    expect(removable.isConnected).toBe(false)

    const onClose = vi.fn()
    setting.addRemovableTag('beta', onClose)
    ;(setting.controls.querySelector('.typ-tag.removable .typ-close') as HTMLElement).click()
    expect(onClose).toHaveBeenCalled()
  })

  it('addTable builds an editable table into the container', () => {
    const setting = create()

    setting.addTable(table => {
      expect(table.containerEl.classList.contains('typ-editable-table')).toBe(true)
    })

    expect(setting.containerEl.querySelector('table.typ-editable-table')).not.toBeNull()
  })
})

describe('SettingItem.addSidebarLayout', () => {
  const getItems = (el: HTMLElement) => [...el.querySelectorAll('.typ-nav__item')]

  function setup(items: string[], initialActive?: string) {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    const onSelect = vi.fn()
    const layout = setting.addSidebarLayout({ items, initialActive }, ctx => onSelect(ctx))
    return { setting, layout, sidebarEl: setting.info.querySelector('.typ-setting-sidebar')! as HTMLElement, panelEl: setting.info.querySelector('.typ-setting-panel')! as HTMLElement, onSelect }
  }

  it('renders initial items', () => {
    const { sidebarEl } = setup(['a', 'b', 'c'])
    expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a', 'b', 'c'])
  })

  it('panel.addSetting() composes rows into the panel', () => {
    const setting = new SettingItem()
    document.body.append(setting.containerEl)
    let captured: any
    setting.addSidebarLayout({ items: ['a'] }, ctx => captured = ctx)
    expect(captured.panel).toBeDefined()

    captured.panel.addSetting((item: any) => item.addName("Row 1"))
    captured.panel.addSetting((item: any) => item.addDescription("desc 2"))

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
      const { layout, sidebarEl } = setup(['a'])
      layout.addItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a', 'b'])
    })

    it('does not add duplicate items', () => {
      const { layout, sidebarEl } = setup(['a'])
      layout.addItem('a')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })
  })

  describe('removeItem()', () => {
    it('removes a non-active item and keeps the active one', () => {
      const { layout, sidebarEl } = setup(['a', 'b'], 'a')
      layout.removeItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })

    it('switches to the first item when the active one is removed', () => {
      const { layout, sidebarEl } = setup(['a', 'b'], 'b')
      layout.removeItem('b')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
      expect(getItems(sidebarEl)[0].classList.contains('active')).toBe(true)
    })

    it('clears the panel when the last item is removed', () => {
      const { layout, sidebarEl, panelEl } = setup(['a'], 'a')
      layout.removeItem('a')
      expect(getItems(sidebarEl)).toHaveLength(0)
      expect(panelEl.childElementCount).toBe(0)
    })

    it('is a no-op for unknown items', () => {
      const { layout, sidebarEl } = setup(['a'])
      layout.removeItem('zzz')
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['a'])
    })
  })

  describe('setItems()', () => {
    it('replaces the item list', () => {
      const { layout, sidebarEl } = setup(['a'])
      layout.setItems(['x', 'y'])
      expect(getItems(sidebarEl).map(el => el.textContent)).toEqual(['x', 'y'])
    })

    it('falls back to the first item when active is missing', () => {
      const { layout, sidebarEl } = setup(['a'], 'a')
      layout.setItems(['b', 'c'])
      expect(getItems(sidebarEl)[0].classList.contains('active')).toBe(true)
    })

    it('clears the sidebar and panel when given an empty list', () => {
      const { layout, sidebarEl, panelEl } = setup(['a'], 'a')
      layout.setItems([])
      expect(getItems(sidebarEl)).toHaveLength(0)
      expect(panelEl.childElementCount).toBe(0)
    })
  })
})
