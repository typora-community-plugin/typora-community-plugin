import { Component } from "../component"


export abstract class View extends Component {

  containerEl: HTMLElement

  show() {
    this.containerEl.style.display = 'block'
  }

  hide() {
    this.containerEl.style.display = 'none'
  }
}
