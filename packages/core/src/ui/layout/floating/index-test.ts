import { useService } from "src/common/service"
import { html } from "src/utils"
import type { WorkspaceLeaf } from "../workspace-leaf"
import { WorkspaceView } from "../workspace-view"
import { createLeaf } from "../workspace-utils"
import type { WorkspaceTabs } from "../tabs"
import { defautTheme } from "./defaut-theme"
import { resizeable } from "./resizeable"
import { draggable } from "./draggable"


/**
 * Test floating view: rendered independently by `workspace.floatingSplit`,
 * outside the main layout (rootSplit).
 *
 * The floating layer manages child DOM independently, so this view appends
 * its panel to `document.body` instead of relying on the layout tree for mounting.
 */
export class TestFloatingView extends WorkspaceView {

  static type = 'core.test-floating'

  containerEl = html`
    <div class="typ-test-floating-view">
      <div style="font-weight: 600; margin-bottom: 8px;">Floating Test View</div>
      <div style="margin-bottom: 8px;">This view lives in <code>workspace.floatingSplit</code>.</div>
      <button type="button" class="typ-test-floating-close">Close</button>
    </div>`

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  /** @override */
  onload() {
    // Floating layer manages DOM independently: append directly to document.body
    document.body.appendChild(this.containerEl)

    defautTheme(this.containerEl)
    this.register(resizeable(this.containerEl))
    this.register(draggable(this.containerEl))

    this.registerDomEvent(
      this.containerEl.querySelector('.typ-test-floating-close')!,
      'click',
      () => this.leaf.detach(),
    )
  }

  /** @override */
  onunload() {
    this.containerEl.remove()
  }
}


/**
 * Register the test floating view (dev-only, invoked by `devtools.ts`).
 *
 * - Registers {@link TestFloatingView} in the `viewManager`;
 * - Adds a button to the status bar (`footer.ty-footer`) that toggles the floating view;
 * - Open: creates a leaf under `WorkspaceTabs`, then appends it to `workspace.floatingSplit`;
 * - Close: iterates over `floatingSplit` and detaches all leaves (empty tabs cascade-removes).
 */
export function registerTestFloatingView(
  workspace = useService('workspace'),
  viewManager = useService('view-manager'),
) {
  viewManager.registerView(
    TestFloatingView.type,
    (leaf) => new TestFloatingView(leaf),
  )

  let floatingTabs: WorkspaceTabs | null = null

  $('<div class="footer-item footer-item-right footer-btn" style="padding: 0 8px;" ty-hint="Toggle floating test view" aria-label="Toggle floating test view">')
    .on('click', toggle)
    .html('<i class="fa fa-external-link"></i>')
    .appendTo($('footer.ty-footer'))

  function toggle() {
    floatingTabs ? closeFloatingView() : openFloatingView()
  }

  function openFloatingView() {
    if (floatingTabs) return

    const leaf = createLeaf({
      type: TestFloatingView.type,
      state: { path: 'typ://core.test-floating/test' },
    })

    const tabs = useService('workspace-tabs')
    tabs.appendChild(leaf)
    workspace.floatingSplit.appendChild(tabs)

    floatingTabs = tabs
  }

  function closeFloatingView() {
    if (!floatingTabs) return

    // Detach all leaves in the floating container (empty tabs cascade-removes)
    workspace.floatingSplit.eachLeaves(leaf => leaf.detach())

    floatingTabs = null
  }
}
