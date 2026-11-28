import 'src/setup-test-env'
import { SettingTab } from 'src/ui/settings/setting-tab'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'


function stubTab(name: string) {
  return class extends SettingTab {
    get name() { return name }
  }
}

vi.mock('src/ui/settings/tabs/file-link-setting-tab', () => ({ FileLinkSettingTab: stubTab('File & Link') }))
vi.mock('src/ui/settings/tabs/appearance-setting-tab', () => ({ AppearanceSettingTab: stubTab('Appearance') }))
vi.mock('src/ui/settings/tabs/hotkey-setting-tab', () => ({ HotkeySettingTab: stubTab('Hotkey') }))
vi.mock('src/ui/settings/tabs/internal-plugin-manager-setting-tab', () => ({ InternalPluginsManagerSettingTab: stubTab('Core Plugins') }))
vi.mock('src/ui/settings/tabs/plugin-marketplace-setting-tab', () => ({ PluginMarketplaceSettingTab: stubTab('Plugin Marketplace') }))
vi.mock('src/ui/settings/tabs/plugin-manager-setting-tab', () => ({ PluginManagerSettingTab: stubTab('Installed Plugins') }))
vi.mock('src/ui/settings/tabs/about-tab', () => ({ AboutTab: stubTab('About') }))

const { SettingsModal } = await import('src/ui/settings/settings-modal')


const i18n = {
  t: {
    settingModal: {
      commandOpen: 'Open Plugin Settings Modal',
      filterPlaceholder: 'Filter settings...',
      titleGlobal: 'Global Settings',
      titleVault: 'Vault Settings',
      groupCore: 'Core',
      groupInternalPlugins: 'Core Plugins',
      groupPlugins: 'Community Plugins',
      navLabel: 'Settings pages',
    },
  },
}

let modal: InstanceType<typeof SettingsModal>
let sidebar: HTMLElement

beforeAll(() => {
  modal = new SettingsModal(
    { isUsingGlobalConfig: true, on: vi.fn() } as any,
    i18n as any,
    { register: vi.fn(() => vi.fn()) } as any,
  )
  modal.load()
  sidebar = document.querySelector('.typ-settings-modal .typ-sidebar') as HTMLElement
  // The modal starts hidden, and hidden elements cannot take focus.
  ;(sidebar.closest('.typ-modal__wrapper') as HTMLElement).style.display = ''
})

beforeEach(() => {
  const filter = sidebar.querySelector('.typ-nav__filter') as HTMLInputElement
  filter.value = ''
  filter.dispatchEvent(new Event('input'))
})

function items() {
  return Array.from(sidebar.querySelectorAll<HTMLElement>('.typ-nav__item'))
}

function item(name: string) {
  return items().find(el => el.dataset.name === name)!
}

function press(el: HTMLElement, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  el.dispatchEvent(event)
  return event
}


describe('SettingsModal navigation accessibility', () => {

  it('names the sidebar as navigation and labels each group by its title', () => {
    expect(sidebar.getAttribute('role')).toBe('navigation')
    expect(sidebar.getAttribute('aria-label')).toBe('Settings pages')

    const groups = Array.from(sidebar.querySelectorAll<HTMLElement>('.typ-nav__group'))
    expect(groups.map(group => group.getAttribute('role'))).toEqual(['group', 'group', 'group'])
    const title = groups[0].querySelector('.typ-nav__group-title')!
    expect(title.id).not.toBe('')
    expect(groups[0].getAttribute('aria-labelledby')).toBe(title.id)
  })

  it('gives the filter box an accessible name, not only a placeholder', () => {
    const filter = sidebar.querySelector('.typ-nav__filter')!
    expect(filter.getAttribute('aria-label')).toBe('Filter settings...')
  })

  it('makes every item a focusable button and keeps the existing class and data-name hooks', () => {
    for (const el of items()) {
      expect(el.classList.contains('typ-nav__item')).toBe(true)
      expect(el.dataset.name).toBeTruthy()
      expect(el.getAttribute('role')).toBe('button')
      expect(el.tabIndex).toBe(0)
    }
  })

  it('marks only the open page with aria-current', () => {
    item('Hotkey').click()

    expect(item('Hotkey').getAttribute('aria-current')).toBe('page')
    expect(item('Hotkey').classList.contains('active')).toBe(true)
    expect(items().filter(el => el.hasAttribute('aria-current'))).toHaveLength(1)

    item('About').click()

    expect(item('Hotkey').hasAttribute('aria-current')).toBe(false)
    expect(item('About').getAttribute('aria-current')).toBe('page')
  })

  it('opens a page with Enter or Space', () => {
    expect(press(item('Appearance'), 'Enter').defaultPrevented).toBe(true)
    expect(modal.activeTab.name).toBe('Appearance')

    expect(press(item('Plugin Marketplace'), ' ').defaultPrevented).toBe(true)
    expect(modal.activeTab.name).toBe('Plugin Marketplace')
  })

  it('moves focus with the arrow keys, Home and End', () => {
    const all = items()
    all[0].focus()

    press(all[0], 'ArrowDown')
    expect(document.activeElement).toBe(all[1])

    press(all[1], 'ArrowUp')
    expect(document.activeElement).toBe(all[0])

    press(all[0], 'End')
    expect(document.activeElement).toBe(all[all.length - 1])

    press(all[all.length - 1], 'Home')
    expect(document.activeElement).toBe(all[0])
  })

  it('skips items the sidebar filter has hidden', () => {
    const filter = sidebar.querySelector('.typ-nav__filter') as HTMLInputElement
    filter.value = 'plugin'
    filter.dispatchEvent(new Event('input'))

    const visible = items().filter(el => el.style.display !== 'none')
    expect(visible.map(el => el.dataset.name)).toEqual(['Core Plugins', 'Plugin Marketplace', 'Installed Plugins'])

    visible[0].focus()
    press(visible[0], 'ArrowDown')
    expect(document.activeElement).toBe(visible[1])

    press(visible[1], 'End')
    expect(document.activeElement).toBe(visible[visible.length - 1])
  })

  it('moves from the filter box to the first visible item with ArrowDown', () => {
    const filter = sidebar.querySelector('.typ-nav__filter') as HTMLInputElement
    filter.value = 'about'
    filter.dispatchEvent(new Event('input'))
    filter.focus()

    expect(press(filter, 'ArrowDown').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(item('About'))
  })

  it('gives items added later the same semantics', () => {
    const PluginTab = stubTab('Zeta Plugin')
    modal.addGroupedTab(2, new PluginTab())

    const added = item('Zeta Plugin')
    expect(added.getAttribute('role')).toBe('button')
    expect(added.tabIndex).toBe(0)
  })
})
