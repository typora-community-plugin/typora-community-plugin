import type { DisposeFunc } from "src/utils/types"
import type { WorkspaceLeaf } from "./layout/workspace-leaf"
import { WorkspaceView } from "./layout/workspace-view"


export interface ViewState {
  /** Reistered type in `app.viewManager` */
  type: string
  state?: Record<string, any>
}

type ViewFactory = (leaf: WorkspaceLeaf, state?: ViewState) => WorkspaceView

export class ViewManager {

  private viewByType: Record<string, ViewFactory> = {}
  private typeByExtension: Record<string, string> = {}

  registerViewWithExtensions(extensions: string[], type: string, viewFactory: ViewFactory): DisposeFunc {
    this.registerExtensions(extensions, type)
    this.registerView(type, viewFactory)
    return () => {
      this.unregisterExtensions(extensions)
      this.unregisterView(type)
    }
  }

  registerExtensions(extensions: string[], type: string): DisposeFunc {
    extensions.forEach(ext => {
      this.registerExtension(ext, type)
    })
    return () => this.unregisterExtensions(extensions)
  }

  registerExtension(extension: string, type: string): DisposeFunc {
    this.typeByExtension[extension] = type
    return () => this.unregisterExtension(extension)
  }

  unregisterExtensions(extensions: string[]) {
    extensions.forEach(ext => {
      this.unregisterExtension(ext)
    })
  }

  unregisterExtension(extension: string) {
    delete this.typeByExtension[extension]
  }

  isExtensionRegistered(extension: string) {
    return !!this.getTypeByExtension(extension)
  }

  registerView(type: string, viewFactory: ViewFactory): DisposeFunc {
    this.viewByType[type] = viewFactory
    return () => this.unregisterView(type)
  }

  unregisterView(type: string) {
    delete this.viewByType[type]
  }

  getTypeByExtension(extension: string): string {
    return this.typeByExtension[extension]
  }

  getViewCreatorByType(type: string): ViewFactory {
    return this.viewByType[type]
  }
}
