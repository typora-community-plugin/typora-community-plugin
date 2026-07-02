import { jest } from '@jest/globals'
import { useEditingTabs } from './use-editing-tabs'


type MockWorkspaceTabs = { children: MockWorkspaceLeaf[]; id?: string }
type MockWorkspaceLeaf = { state: { path?: string } }

function createMockTabs(childrenCount = 0): MockWorkspaceTabs {
  return {
    children: Array.from({ length: childrenCount }, (_, i) => ({
      state: { path: `file-${i}.md` }
    })) as unknown as MockWorkspaceLeaf[]
  }
}


describe('useEditingTabs', () => {

  // memorize caches the singleton, so we need to handle isolation carefully.
  // Since memorize returns the exact same instance every time with no args,
  // tests that depend on initial/reset state must come first, and stateful tests
  // must account for shared mutable state.

  it('should return null for editingTabs initially', () => {
    const tabs = useEditingTabs()
    expect(tabs.editingTabs()).toBeNull()
  })

  it('setEditingTabs should store the tabs value', () => {
    const mockTab1 = createMockTabs(2)
    const tabs = useEditingTabs()
    tabs.setEditingTabs(mockTab1 as any)
    expect(tabs.editingTabs()).toBe(mockTab1)
  })

  it('isEditingTabs should return true when the same tabs reference is passed', () => {
    const mockTab1 = createMockTabs(2)
    const tabs = useEditingTabs()
    // Note: this test runs after setEditingTabs in previous tests, so editingTabs may already be set.
    // We test against whatever is stored (same identity comparison).
    const current = tabs.editingTabs() as any
    if (current === undefined || current === null) {
      mockTab1 && tabs.setEditingTabs(mockTab1)
    }
    expect(tabs.isEditingTabs(current || mockTab1)).toBe(true)
  })

  it('isEditingTabs should return false for a different reference', () => {
    const sameMockTab = createMockTabs(1)
    const tabs = useEditingTabs()
    // If not yet set, set it first for consistent behavior
    if (!tabs.editingTabs()) {
      tabs.setEditingTabs(sameMockTab as any)
    }
    const mockTab2 = createMockTabs(0)
    expect(tabs.isEditingTabs(mockTab2 as any)).toBe(false)
  })

  it('isEditingSingleChildTabs should return true when editingTabs has exactly one child', () => {
    const mockTab = createMockTabs(1)
    const tabs = useEditingTabs()
    tabs.setEditingTabs(mockTab as any)
    expect(tabs.isEditingSingleChildTabs()).toBe(true)
  })

  it('isEditingSingleChildTabs should return false when editingTabs has zero children', () => {
    const mockTab = createMockTabs(0)
    const tabs = useEditingTabs()
    if (tabs.editingTabs()) {
      tabs.setEditingTabs(null)
    }
    tabs.setEditingTabs(mockTab as any)
    expect(tabs.isEditingSingleChildTabs()).toBe(false)
  })

  it('isEditingSingleChildTabs should return false when editingTabs has multiple children', () => {
    const mockTab = createMockTabs(3)
    const tabs = useEditingTabs()
    // setEditingTabs again is fine, it just updates the reference
    tabs.setEditingTabs(mockTab as any)
    expect(tabs.isEditingSingleChildTabs()).toBe(false)
  })

  it('isEditingSingleChildTabs should return false when editingTabs is null', () => {
    const tabs = useEditingTabs()
    tabs.setEditingTabs(null)
    expect(tabs.isEditingSingleChildTabs()).toBe(false)
  })

  it('should return cached instance because memorize caches results with no args', () => {
    const inst1 = useEditingTabs()
    const inst2 = useEditingTabs()
    expect(inst1).toBe(inst2)
  })
})
