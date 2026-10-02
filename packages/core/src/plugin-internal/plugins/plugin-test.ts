import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "src/plugin-internal/internal-plugin"
import { EditaleTableTestTab } from "src/ui/components/editable-table-test"
import { BarSlashSuggest, FooSlashSuggest } from "src/ui/editor/suggestion/suggest-test"
import { setupTestFloatingView } from "src/ui/layout/floating/index-test"
import { setupTestSidedockView } from "src/ui/layout/sidedock/index-test"
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { SettingItemTestTab } from "src/ui/settings/setting-item-test"
import { SettingsModal } from "src/ui/settings/settings-modal"
import { TEST_SELECTION_STATS, TEST_STATS } from "src/ui/statusbar/statistics-test"
import { html } from "src/utils"
import { JSBridge } from "typora"


export const PLUGIN_TEST_ID = 'internal.test'

export class TestPlugin extends InternalPlugin {

  declare manifest: InternalPluginManifest

  constructor() {
    super(PLUGIN_TEST_ID)

    this.manifest = {
      id: PLUGIN_TEST_ID,
      name: 'Test',
      description: 'Test `@typora-community-plugin/core` features in development.',
    }
  }

  onload(app = useService('app')) {

    // Test Ribbon Button
    const ribbon = useService('ribbon')
    this.register(
      ribbon.addButton({
        [BUILT_IN]: true,
        group: 'bottom',
        id: 'core.devtools',
        title: 'Devtools',
        icon: html`<div><i class="fa fa-wrench"></i></div>`,
        onclick() {
          JSBridge.invoke("window.toggleDevTools")
        }
      }))

    // Test SettingTab
    const modal = app.workspace.getViewByType(SettingsModal)!
    setTimeout(() => this.register(modal.addGroupedTab(2, new SettingItemTestTab())))
    setTimeout(() => this.register(modal.addGroupedTab(2, new EditaleTableTestTab())))

    // Test Statistic
    this.register(
      app.features.statistics.registerStatistic(TEST_STATS))
    this.register(
      app.features.statistics.registerSelectionStatistic(TEST_SELECTION_STATS))

    // Test Suggest
    this.register(
      app.features.markdownEditor.suggestion.register(new FooSlashSuggest()))
    this.register(
      app.features.markdownEditor.suggestion.register(new BarSlashSuggest()))

    // Test Right SidedockView
    this.register(setupTestSidedockView())

    // Test FloatingView
    this.register(setupTestFloatingView())
  }

  onunload() {
  }
}
