/**
 * State of an in-progress pointer drag session.
 */
export interface DragInfo {
  /** pointer position (viewport coords) when the drag started */
  startX: number
  startY: number
  /** latest pointer position (viewport coords) */
  x: number
  y: number
  /** offset from the start position */
  dx: number
  dy: number
  /** true once the pointer has moved at least `threshold` pixels away from the start */
  moved: boolean
}

export interface DragOptions {
  /**
   * Pointer travel (in px, on either axis) required before the drag is
   * considered active. `onMove` only fires after the threshold is exceeded,
   * and `moved` is only set then. Defaults to `0` (drag starts immediately).
   */
  threshold?: number
  /**
   * Called on every pointer move (after the threshold is exceeded).
   * Return `false` to end the session early (e.g. auto-collapse).
   */
  onMove: (e: MouseEvent, info: DragInfo) => void | false
  /**
   * Called exactly once when the session ends — on release, pointer cancel,
   * early completion via `onMove` returning `false`, or the pointer leaving
   * the document. `canceled` is `true` for every path except a normal release.
   */
  onEnd?: (e: MouseEvent | null, info: DragInfo, canceled: boolean) => void
}

/**
 * Pointer Events are unavailable in Safari < 13, i.e. the WKWebView shipped
 * with macOS 10.13/10.14 (Typora on macOS is native + WKWebView, the minimum
 * supported version is 10.13). Fall back to mouse events when they are missing.
 *
 * Note: detect via `window`, not `globalThis` — the `globalThis` identifier
 * itself does not exist on Safari < 12.1 and would throw a ReferenceError.
 */
const supportsPointerEvents = () => 'PointerEvent' in window

/**
 * Begin a pointer-drag session from a `mousedown`/`pointerdown` event.
 *
 * This is the single shared drag loop for the whole codebase: it guards
 * non-left clicks, prevents default (text selection / native drag), tracks
 * the pointer on `document`, computes deltas from the start position, and
 * cleans all listeners up on any termination path. Uses Pointer Events when
 * available, mouse events otherwise (same deltas; no `pointercancel` —
 * there is no mouse equivalent).
 *
 * Callers supply the semantics: move a window, resize a pane, reorder a
 * list, highlight a drop target...
 */
export function beginDrag(e: MouseEvent, options: DragOptions): void {
  const { threshold = 0, onMove, onEnd } = options
  if (e.button !== 0) return
  e.preventDefault()

  const usePointer = supportsPointerEvents()
  const MOVE_EVENT = usePointer ? 'pointermove' : 'mousemove'
  const UP_EVENT = usePointer ? 'pointerup' : 'mouseup'
  const CANCEL_EVENT = usePointer ? 'pointercancel' : null

  const startX = e.clientX
  const startY = e.clientY
  const info: DragInfo = {
    startX, startY,
    x: startX, y: startY,
    dx: 0, dy: 0,
    moved: threshold <= 0,
  }

  let done = false

  function finish(e: MouseEvent | null, canceled: boolean) {
    if (done) return
    done = true
    document.removeEventListener(MOVE_EVENT, onMoveEvent as EventListener)
    document.removeEventListener(UP_EVENT, onUpEvent as EventListener)
    if (CANCEL_EVENT) document.removeEventListener(CANCEL_EVENT, onCancelEvent as EventListener)
    onEnd?.(e, info, canceled)
  }

  function onMoveEvent(e: MouseEvent) {
    info.x = e.clientX
    info.y = e.clientY
    info.dx = e.clientX - startX
    info.dy = e.clientY - startY
    if (!info.moved) {
      if (Math.abs(info.dx) < threshold && Math.abs(info.dy) < threshold) return
      info.moved = true
    }
    if (onMove(e, info) === false) finish(e, true)
  }

  function onUpEvent(e: MouseEvent) {
    // releasing a secondary button must not end an active left-button drag
    if (e.button !== 0) return
    finish(e, false)
  }

  function onCancelEvent(e: MouseEvent) {
    finish(e, true)
  }

  document.addEventListener(MOVE_EVENT, onMoveEvent as EventListener)
  document.addEventListener(UP_EVENT, onUpEvent as EventListener)
  if (CANCEL_EVENT) document.addEventListener(CANCEL_EVENT, onCancelEvent as EventListener)
}
