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

      <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--base-border);" />

      <div style="font-weight: 500; margin-bottom: 8px;">API Reference</div>
      <pre style="font-size: 11px; white-space: pre-wrap; color: var(--text-muted); line-height: 1.6;">
app.workspace.rightSplit.expand()
app.workspace.rightSplit.collapse()
app.workspace.rightSplit.toggle()
app.commands.run('core.workspace.right-split:ensure-leaf', [path])
      </pre>
    </div>`

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  /** @override */
  onOpen() {
    this.updateStateInfo()
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

class TestSidedockView2 extends TestSidedockView {
  static type = 'TestSidedockView2'
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
  commands = useService('command-manager'),
  viewManager = useService('view-manager'),
) {
  viewManager.registerView(
    TestSidedockView.type,
    (leaf) => new TestSidedockView(leaf),
  )

  commands.run('core.workspace.right-split:ensure-leaf', [`typ://${TestSidedockView.type}/Test`])

  viewManager.registerView(
    TestSidedockView2.type,
    (leaf) => new TestSidedockView2(leaf),
  )
  commands.run('core.workspace.right-split:ensure-leaf', [`typ://${TestSidedockView2.type}/Test2`])
}
