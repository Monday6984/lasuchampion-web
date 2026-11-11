// Minimal types for StPageFlip (https://github.com/Nodlik/StPageFlip), which ships without its own.
declare module 'page-flip' {
  export type Orientation = 'portrait' | 'landscape'
  export type FlipState = 'user_fold' | 'fold_corner' | 'flipping' | 'read'

  export interface FlipSettings {
    startPage: number
    size: 'fixed' | 'stretch'
    width: number
    height: number
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
    drawShadow: boolean
    flippingTime: number
    usePortrait: boolean
    startZIndex: number
    autoSize: boolean
    maxShadowOpacity: number
    showCover: boolean
    mobileScrollSupport: boolean
    swipeDistance: number
    clickEventForward: boolean
    useMouseEvents: boolean
    showPageCorners: boolean
    disableFlipByClick: boolean
  }

  type Events = {
    flip: number
    changeState: FlipState
    changeOrientation: Orientation
    init: { page: number; mode: Orientation }
    update: { page: number; mode: Orientation }
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: Partial<FlipSettings>)
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void
    on<K extends keyof Events>(event: K, cb: (e: { data: Events[K]; object: PageFlip }) => void): PageFlip
    off(event: keyof Events): void
    destroy(): void
    update(): void
    flipNext(corner?: 'top' | 'bottom'): void
    flipPrev(corner?: 'top' | 'bottom'): void
    flip(page: number, corner?: 'top' | 'bottom'): void
    turnToNextPage(): void
    turnToPrevPage(): void
    turnToPage(page: number): void
    getPageCount(): number
    getCurrentPageIndex(): number
    getOrientation(): Orientation
    getState(): FlipState
    getSettings(): FlipSettings
    getBoundsRect(): { left: number; top: number; width: number; height: number; pageWidth: number }
  }
}
