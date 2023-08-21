import { editor } from "typora"


export class Notification {

  /**
   * Show notification on top of editing area.
   *
   * @deprecated Use `Notice` instead.
   * @param msg Message. Can be a string with HTML.
   */
  show(msg: string) {
    editor.EditHelper.showNotification(msg)
  }
}
