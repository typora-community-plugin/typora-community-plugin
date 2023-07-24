import { editor } from "typora"


export class Notification {

  /**
   * Show notification on top of editing area.
   *
   * @param msg Message. Can be a string with HTML.
   */
  show(msg: string) {
    editor.EditHelper.showNotification(msg)
  }
}
