import { Component } from "src/common/component"


/**
 * @deprecated compatible with old api (<=2.2.22)
 */
export abstract class ViewLegacy extends Component {

  containerEl: HTMLElement

  show() {
    this.containerEl.style.display = 'block'
  }

  hide() {
    this.containerEl.style.display = 'none'
  }
}
