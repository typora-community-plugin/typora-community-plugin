import { useService } from "src/common/service"
import { html } from "src/utils"
import type { WorkspaceLeaf } from "../workspace-leaf"
import { WorkspaceView } from "../workspace-view"


// ── Test View ───────────────────────────────────────────────────────────

/**
 * A simple test view that lives inside the right side dock.
 */
export class TestSidedockView extends WorkspaceView {

  static type = 'core.test-sidedock'

  containerEl = html`
    <div style="padding: 16px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Side Dock Test View</div>
      <div style="margin-bottom: 12px; color: var(--text-muted); font-size: 13px;">
        This view lives inside <code>workspace.rightSplit</code>.
      </div>

      <details style="margin-bottom: 8px;">
        <summary style="cursor: pointer; font-weight: 500;">State Info</summary>
        <pre id="sidedock-state" style="font-size: 12px; white-space: pre-wrap; margin-top: 4px;"></pre>
      </details>

      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="typ-test-sidedock-collapse">Collapse</button>
        <button type="button" class="typ-test-sidedock-expand">Expand</button>
        <button type="button" class="typ-test-sidedock-toggle">Toggle</button>
      </div>

      <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--base-border);" />

      <div style="font-weight: 500; margin-bottom: 8px;">Tab Operations</div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="typ-test-sidedock-add-tab">Add Tab</button>
        <button type="button" class="typ-test-sidedock-close-all">Close All Tabs</button>
      </div>

      <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--base-border);" />

      <div style="font-weight: 500; margin-bottom: 8px;">API Reference</div>
      <pre style="font-size: 11px; white-space: pre-wrap; color: var(--text-muted); line-height: 1.6;">
app.workspace.rightSplit.expand()
app.workspace.rightSplit.collapse()
app.workspace.rightSplit.toggle()
app.workspace.getRightLeaf(createTabs?)
app.workspace.ensureSideLeaf(type, 'right', opts)
      </pre>
    </div>`

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  /** @override */
  onOpen() {
    this.updateStateInfo()

    const rs = useService('workspace').rightSplit

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-sidedock-collapse')!,
      'click',
      () => rs.collapse(),
    )

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-sidedock-expand')!,
      'click',
      () => rs.expand(),
    )

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-sidedock-toggle')!,
      'click',
      () => rs.toggle(),
    )

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-sidedock-add-tab')!,
      'click',
      () => this.addTab(),
    )

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-sidedock-close-all')!,
      'click',
      () => this.closeAllTabs(),
    )
  }

  /** Add a new tab (leaf) to the dock's tabs container */
  private addTab() {
    const workspace = useService('workspace')
    const tabs = this.leaf.parent
    if (!tabs) return

    const leaf = workspace.createLeaf({
      type: TestSidedockView.type,
      state: { path: `typ://${TestSidedockView.type}/tab-${Date.now()}` },
    })
    tabs.appendChild(leaf)
  }

  /** Close all leaves in the right split (empty tabs cascade-removes) */
  private closeAllTabs() {
    useService('workspace').rightSplit.eachLeaves(leaf => leaf.detach())
  }

  private updateStateInfo() {
    const sidedock = useService('workspace').rightSplit
    const el = this.containerEl.querySelector('#sidedock-state') as HTMLElement
    if (el) {
      el.textContent = JSON.stringify({
        collapsed: sidedock.collapsed,
        size: sidedock.size,
        side: sidedock.side,
        childrenCount: sidedock.children.length,
      }, null, 2)
    }
  }

  /** @override */
  onClose() {
    // DOM is managed by the leaf container — no manual cleanup needed
  }
}


// ── Registration (dev-only) ─────────────────────────────────────────────

/**
 * Register {@link TestSidedockView} in the `viewManager` and open it
 * inside `workspace.rightSplit`.
 *
 * The status-bar button that opens/closes this view is registered by
 * the workspace plugin (`plugin-workspace.ts`).
 */
export function registerTestSidedockView(
  workspace = useService('workspace'),
  viewManager = useService('view-manager'),
) {
  viewManager.registerView(
    TestSidedockView.type,
    (leaf) => new TestSidedockView(leaf),
  )

  const leaf = workspace.createLeaf({
    type: TestSidedockView.type,
    state: { path: `typ://${TestSidedockView.type}/test` },
  })

  const tabs = useService('workspace-tabs')
  tabs.appendChild(leaf)

  workspace.rightSplit.appendChild(tabs)
}
