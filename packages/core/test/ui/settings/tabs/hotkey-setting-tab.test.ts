import 'src/setup-test-env'
import type { Command } from 'src/command/command-manager'
import { HotkeySettingTab } from 'src/ui/settings/tabs/hotkey-setting-tab'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'


const t = {
  name: 'Hotkey',
  searchHotkey: 'Search commands',
  coreCommands: 'Core commands',
  pluginCommands: 'Plugin commands',
  addHotkey: 'Add hotkey',
  waitHotkey: 'Press hotkey...',
}

function command(id: string, title: string, extra: Partial<Command> = {}): Command {
  return { id, title, scope: 'global', showInCommandPanel: true, callback: () => { }, ...extra }
}

let commandMap: Record<string, Command>
let manifests: Record<string, unknown>

beforeEach(() => {
  vi.useFakeTimers()
  commandMap = {}
  manifests = { 'acme-outline': {}, 'acme': {} }
  for (const cmd of [
    command('settings:open', 'Open Plugin Settings Modal', { hotkey: 'Ctrl+.' }),
    command('acme-outline:toggle', 'Acme Outline: Toggle outline'),
    command('internal.metadata:rebuild', 'Metadata: Rebuild index'),
    command('acme:run', 'Acme: Run'),
    command('workspace:hidden', 'Hidden command', { showInCommandPanel: false }),
  ]) commandMap[cmd.id] = cmd
})

afterEach(() => vi.useRealTimers())

function createTab() {
  const tab = new HotkeySettingTab(
    { on: vi.fn() } as any,
    { once: (_event: string, listener: () => void) => listener() } as any,
    { t: { settingTabs: { hotkey: t } } } as any,
    { commandMap, setCommandHotkey: vi.fn() } as any,
    { manifests } as any,
  )
  document.body.append(tab.containerEl)
  return tab
}

/** Group titles and the command names under each, in display order. */
function layout(tab: HotkeySettingTab) {
  const groups: Array<[string, string[]]> = []
  for (const row of tab.containerEl.querySelectorAll<HTMLElement>('.typ-hotkey-group, .typ-hotkey-item')) {
    if (row.classList.contains('typ-hotkey-group')) groups.push([row.textContent!.trim(), []])
    else groups[groups.length - 1][1].push(row.querySelector('.typ-setting-name')!.textContent!.trim())
  }
  return groups
}

function search(tab: HotkeySettingTab, query: string) {
  const input = tab.containerEl.querySelector('input')!
  input.value = query
  input.dispatchEvent(new Event('input'))
  vi.advanceTimersByTime(300)
}


describe('HotkeySettingTab command groups', () => {

  it('lists core commands first, then plugin commands by installed plugin id prefix', () => {
    const tab = createTab()

    expect(layout(tab)).toEqual([
      ['Core commands', ['Open Plugin Settings Modal', 'Metadata: Rebuild index']],
      ['Plugin commands', ['Acme Outline: Toggle outline', 'Acme: Run']],
    ])
  })

  it('matches the whole plugin id, not a shared prefix', () => {
    delete manifests.acme
    const tab = createTab()

    expect(layout(tab)).toEqual([
      ['Core commands', ['Open Plugin Settings Modal', 'Metadata: Rebuild index', 'Acme: Run']],
      ['Plugin commands', ['Acme Outline: Toggle outline']],
    ])
  })

  it('still hides commands that are not shown in the command panel', () => {
    const tab = createTab()

    expect(layout(tab).flatMap(([, names]) => names)).not.toContain('Hidden command')
  })

  it('hides a group that the search leaves empty', () => {
    const tab = createTab()

    search(tab, 'outline')

    expect(layout(tab)).toEqual([
      ['Plugin commands', ['Acme Outline: Toggle outline']],
    ])

    search(tab, 'zzz')

    expect(layout(tab)).toEqual([])
  })

  it('shows commands registered since the last visit when the tab is shown again', () => {
    const tab = createTab()
    search(tab, 'acme')

    commandMap['acme:stop'] = command('acme:stop', 'Acme: Stop')
    tab.show()

    expect(layout(tab)).toEqual([
      ['Plugin commands', ['Acme Outline: Toggle outline', 'Acme: Run', 'Acme: Stop']],
    ])
  })

  it('keeps the search box first when the page is shown before the app has loaded', () => {
    let onLoad = () => { }
    const tab = new HotkeySettingTab(
      { on: vi.fn() } as any,
      { once: (_event: string, listener: () => void) => { onLoad = listener } } as any,
      { t: { settingTabs: { hotkey: t } } } as any,
      { commandMap, setCommandHotkey: vi.fn() } as any,
      { manifests } as any,
    )

    tab.show()
    expect(tab.containerEl.childElementCount).toBe(0)

    onLoad()
    expect(tab.containerEl.firstElementChild!.querySelector('input')).not.toBeNull()
    expect(layout(tab)).toHaveLength(2)
  })

  it('names the add-hotkey button, which shows only an icon', () => {
    const tab = createTab()

    const buttons = tab.containerEl.querySelectorAll<HTMLButtonElement>('.typ-hotkey-item button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.getAttribute('aria-label')).toBe('Add hotkey')
      expect(button.title).toBe('Add hotkey')
    }
  })
})
