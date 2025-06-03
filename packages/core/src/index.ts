import type { App } from './app'
export type { App } from './app'
export declare const app: App

export { Component } from './common/component'
export { Events } from './common/events'

export { I18n } from './locales/i18n'

export type { PluginManifest } from './plugin/plugin-manifest'
export { PluginSettings } from './plugin/plugin-settings'
export { Plugin } from './plugin/plugin'

/** @deprecated */
export { ViewLegacy as View } from './ui/common/view-legacy'

export { Modal } from './ui/components/modal'
export { Notice } from './ui/components/notice'
export { openInputBox } from './ui/components/quick-open'
export { openQuickPick } from './ui/components/quick-open'

export { SettingTab } from './ui/settings/setting-tab'
export { SettingItem } from './ui/settings/setting-item'

export { PostProcessor } from './ui/editor/postprocessor/postprocessor'
export { HtmlPostProcessor } from './ui/editor/postprocessor/html-postprocessor'
export { CodeblockPostProcessor } from './ui/editor/postprocessor/codeblock-postprocessor'

export { EditorSuggest } from './ui/editor/suggestion/suggest'
export { TextSuggest } from './ui/editor/suggestion/text-suggest'

export { ExportProcessor, HtmlExportProcessor, CodeblockExportProcessor } from './export-manager'

/** @deprecated */
export { WorkspaceRibbon } from './ui/ribbon/workspace-ribbon'

/** @deprecated */
export { Sidebar } from './ui/sidebar/sidebar'

export { SidebarPanel } from './ui/sidebar/sidebar-panel'

export { default as fs } from 'src/io/fs/filesystem'
export { default as path } from 'src/path'

export { debounce } from './utils/schedule/debounce'
export { format } from './utils/string/format'
export { html } from './utils/html'
export { until } from './utils/until'
export { default as decorate } from '@plylrnsdy/decorate.js'
