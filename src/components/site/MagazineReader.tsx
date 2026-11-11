'use client'

import { PageFlip, type Orientation } from 'page-flip'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pdfjs } from 'react-pdf'

import { DownloadIcon, FullscreenIcon, SoundOffIcon, SoundOnIcon } from './Icons'
import { track } from './TrackView'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()

// Helper files copied to /public/pdfjs at build time (scripts/copy-pdfjs.mjs).
// Without them some images (JPEG 2000, JBIG2), colour profiles and built-in fonts don't render.
const PDF_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  iccUrl: '/pdfjs/iccs/',
}

export type ReaderProps = {
  issueId: string
  pdfUrl: string
  title: string
  contents: { section: string; page: number }[]
  allowDownload: boolean
}

type PDFDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>

/** One side of a sheet in the flip book: a whole PDF page, or one half of a two-page spread. */
type Leaf = { page: number; half?: 'left' | 'right' }

const ZOOMS = [1, 1.5, 2]
const WIDE = 700 // narrower than this, the book shows one page at a time
const AHEAD = 4 // pages prepared ahead of the reader
const MAX_PX = 2600 // largest image drawn for one page
const SOUND_KEY = 'lc-reader-sound'

/**
 * PDFs often come from the designer with two pages on one wide sheet. When the cover is a normal
 * portrait page, wide pages are cut into their left and right halves so every page turns on its own.
 */
async function buildLeaves(doc: PDFDoc) {
  const sizes = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) => {
      const vp = (await doc.getPage(i + 1)).getViewport({ scale: 1 })
      return { w: vp.width, h: vp.height }
    }),
  )
  const cover = sizes[0]
  const coverPortrait = cover.w <= cover.h
  const leaves: Leaf[] = []
  sizes.forEach((s, i) => {
    const page = i + 1
    if (coverPortrait && page > 1 && s.w > s.h * 1.2) leaves.push({ page, half: 'left' }, { page, half: 'right' })
    else leaves.push({ page })
  })
  return { leaves, ratio: cover.w / cover.h }
}

/** Which leaves are on screen: one in portrait; in landscape the cover alone, then pairs. */
const visibleLeaves = (index: number, orientation: Orientation, count: number) => {
  if (orientation === 'portrait' || index === 0) return [index]
  const start = index % 2 === 1 ? index : index - 1
  return start + 1 < count ? [start, start + 1] : [start]
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function MagazineReader({ issueId, pdfUrl, title, contents, allowDownload }: ReaderProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<PageFlip | null>(null)
  const imgRefs = useRef<HTMLImageElement[]>([])
  const cache = useRef(new Map<number, { url: string; px: number }>())
  const queue = useRef({ running: false, alive: true })
  const audio = useRef<HTMLAudioElement | null>(null)
  const counted = useRef(false)

  const [doc, setDoc] = useState<PDFDoc | null>(null)
  const [leaves, setLeaves] = useState<Leaf[]>([])
  const [ratio, setRatio] = useState(0.707)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [zoom, setZoom] = useState(1)
  const [stage, setStage] = useState({ w: 900, h: 700 })
  const [sound, setSound] = useState(true)
  const [, setRendered] = useState(0) // bumped when a page image is ready (for the zoomed view)
  const [still] = useState(reducedMotion)

  // Latest values for the event handlers and the render queue.
  const live = useRef({ index, orientation, zoom, sound, leaves, pageW: 400 })
  live.current = { ...live.current, index, orientation, zoom, sound, leaves }

  /* ---------- Loading the PDF ---------- */

  useEffect(() => {
    let cancelled = false
    const task = pdfjs.getDocument({ url: pdfUrl, ...PDF_OPTIONS })
    task.promise
      .then(async (d) => {
        const built = await buildLeaves(d)
        if (cancelled) return
        setDoc(d)
        setRatio(built.ratio)
        setLeaves(built.leaves)
      })
      .catch(() => !cancelled && setError(true))
    const urls = cache.current
    const q = queue.current
    q.alive = true
    return () => {
      cancelled = true
      q.alive = false
      task.destroy()
      urls.forEach((v) => URL.revokeObjectURL(v.url))
      urls.clear()
    }
  }, [pdfUrl])

  /* ---------- Sound ---------- */

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === 'off') setSound(false)
    } catch {
      // storage blocked: sound stays on
    }
    const a = new Audio('/sounds/page-flip.mp3')
    a.preload = 'auto'
    a.volume = 0.7
    audio.current = a
  }, [])

  const playFlip = useCallback(() => {
    const a = audio.current
    if (!a || !live.current.sound) return
    a.currentTime = 0
    a.play().catch(() => {})
  }, [])

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    } catch {
      // not remembered, but still applies now
    }
  }

  /* ---------- Size: fit the book to the space available ---------- */

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const full = document.fullscreenElement === shellRef.current
      const h = full ? window.innerHeight - 190 : Math.min(window.innerHeight * 0.82, 980)
      setStage({ w: el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) * 2, h: Math.max(240, h) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    document.addEventListener('fullscreenchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      document.removeEventListener('fullscreenchange', measure)
    }
  }, [])

  const wide = stage.w >= WIDE
  const bookW = Math.floor(Math.min(stage.w, stage.h * ratio * (wide ? 2 : 1)))
  const pageW = wide ? bookW / 2 : bookW
  live.current.pageW = pageW

  /* ---------- Drawing pages as images, a few ahead of the reader ---------- */

  const wantedPx = useCallback((i: number, onScreen: boolean) => {
    const { zoom: z, pageW: w } = live.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    return Math.min(MAX_PX, Math.ceil(w * dpr * (onScreen ? z : 1)))
  }, [])

  const renderLeaf = useCallback(
    async (i: number, px: number) => {
      const leaf = live.current.leaves[i]
      if (!doc || !leaf) return
      const page = await doc.getPage(leaf.page)
      const base = page.getViewport({ scale: 1 })
      const fullPx = leaf.half ? px * 2 : px
      const viewport = page.getViewport({ scale: fullPx / base.width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, viewport }).promise
      let out = canvas
      if (leaf.half) {
        out = document.createElement('canvas')
        out.width = Math.ceil(canvas.width / 2)
        out.height = canvas.height
        out.getContext('2d')?.drawImage(canvas, leaf.half === 'left' ? 0 : -out.width, 0)
      }
      const blob = await new Promise<Blob | null>((ok) => out.toBlob(ok, 'image/jpeg', 0.9))
      if (!blob || !queue.current.alive) return
      const url = URL.createObjectURL(blob)
      const old = cache.current.get(i)
      cache.current.set(i, { url, px })
      const img = imgRefs.current[i]
      if (img) {
        img.src = url
        img.dataset.ready = 'true'
      }
      if (old) setTimeout(() => URL.revokeObjectURL(old.url), 1500)
      setRendered((n) => n + 1)
    },
    [doc],
  )

  const pump = useCallback(async () => {
    const q = queue.current
    if (q.running) return
    q.running = true
    try {
      while (q.alive) {
        const { index: at, orientation: o, leaves: all } = live.current
        const shown = visibleLeaves(at, o, all.length)
        const order = [
          ...shown,
          ...Array.from({ length: AHEAD }, (_, k) => shown[shown.length - 1] + k + 1),
          ...[shown[0] - 1, shown[0] - 2],
        ].filter((i, k, arr) => i >= 0 && i < all.length && arr.indexOf(i) === k)
        const next = order.find((i) => (cache.current.get(i)?.px ?? 0) < wantedPx(i, shown.includes(i)) * 0.9)
        if (next === undefined) break
        try {
          await renderLeaf(next, wantedPx(next, shown.includes(next)))
        } catch {
          // a page that fails to draw keeps its blank placeholder
          cache.current.set(next, { url: '', px: Infinity })
        }
      }
    } finally {
      q.running = false
    }
  }, [renderLeaf, wantedPx])

  useEffect(() => {
    if (doc && leaves.length) void pump()
  }, [doc, leaves, index, orientation, zoom, pageW, pump])

  /* ---------- The flip book ---------- */

  useEffect(() => {
    const host = hostRef.current
    if (!host || !leaves.length) return
    // StPageFlip moves and removes the elements it is given, so they are made here, outside React.
    const book = document.createElement('div')
    host.appendChild(book)
    imgRefs.current = []
    const items = leaves.map((_, i) => {
      const el = document.createElement('div')
      el.className = 'flip-page'
      const img = document.createElement('img')
      img.alt = `Page ${i + 1}`
      img.draggable = false
      const cached = cache.current.get(i)
      if (cached?.url) {
        img.src = cached.url
        img.dataset.ready = 'true'
      }
      el.appendChild(img)
      imgRefs.current[i] = img
      return el
    })

    const pf = new PageFlip(book, {
      width: 1000,
      height: Math.round(1000 / ratio),
      size: 'stretch',
      minWidth: 1,
      maxWidth: 4000,
      minHeight: 1,
      maxHeight: 6000,
      showCover: true,
      usePortrait: true,
      flippingTime: 750,
      maxShadowOpacity: 0.45,
      mobileScrollSupport: true,
      useMouseEvents: !still,
      startPage: Math.min(live.current.index, leaves.length - 1),
    })
    book.style.minWidth = '0'
    book.style.minHeight = '0'
    pf.on('flip', (e) => setIndex(e.data))
    pf.on('changeOrientation', (e) => setOrientation(e.data))
    pf.on('changeState', (e) => {
      if (e.data === 'flipping') playFlip()
    })
    pf.loadFromHTML(items)
    flipRef.current = pf
    return () => {
      flipRef.current = null
      pf.destroy()
      book.remove()
    }
  }, [leaves, ratio, still, playFlip])

  // One page or two side by side, decided by the reader's width.
  useEffect(() => {
    const pf = flipRef.current
    if (!pf || zoom > 1) return
    const s = pf.getSettings()
    s.usePortrait = !wide
    s.minWidth = wide ? 1 : 100000 // the library goes to one page when the book is narrower than 2 × minWidth
    const id = requestAnimationFrame(() => {
      pf.update()
      setOrientation(pf.getOrientation())
    })
    return () => cancelAnimationFrame(id)
  }, [wide, bookW, zoom, leaves])

  /* ---------- Turning pages ---------- */

  const count = leaves.length
  const shown = visibleLeaves(Math.min(index, Math.max(0, count - 1)), orientation, count)
  const atStart = shown[0] === 0
  const atEnd = !count || shown[shown.length - 1] >= count - 1

  /** Without animation: while zoomed, or for readers who asked their device to reduce motion. */
  const jump = useCallback(
    (to: () => void) => {
      const pf = flipRef.current
      if (!pf) return
      to()
      setIndex(pf.getCurrentPageIndex())
      // A gentle fade instead of the page curl.
      const host = hostRef.current
      if (host) {
        host.classList.remove('fade-in')
        void host.offsetWidth
        host.classList.add('fade-in')
      }
      playFlip()
      stageRef.current?.scrollTo({ top: 0, left: 0 })
    },
    [playFlip],
  )

  const next = useCallback(() => {
    const pf = flipRef.current
    if (!pf || atEnd) return
    if (still || zoom > 1) jump(() => pf.turnToNextPage())
    else pf.flipNext()
  }, [atEnd, still, zoom, jump])

  const prev = useCallback(() => {
    const pf = flipRef.current
    if (!pf || atStart) return
    if (still || zoom > 1) jump(() => pf.turnToPrevPage())
    else pf.flipPrev()
  }, [atStart, still, zoom, jump])

  // Contents entries use the magazine's printed page numbers: page n is leaf n − 1.
  const goToPage = (page: number) => {
    const pf = flipRef.current
    const target = page - 1
    if (!pf || target < 0 || target >= count || shown.includes(target)) return
    if (still || zoom > 1) jump(() => pf.turnToPage(target))
    else pf.flip(target)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  // Leaving zoom: the book is shown again and re-measured.
  useEffect(() => {
    if (zoom === 1) requestAnimationFrame(() => flipRef.current?.update())
  }, [zoom])

  // A read is counted once the visitor turns past the cover.
  useEffect(() => {
    if (counted.current || index === 0) return
    counted.current = true
    try {
      const key = `lc-read-${issueId}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // storage blocked — the server cookie still prevents double counting
    }
    track('issue', issueId)
  }, [index, issueId])

  /* ---------- Labels ---------- */

  // Printed page numbers: when spreads are cut in two, PDF sheet 2 holds pages 2 and 3, and so on.
  const shownPages = shown.map((i) => i + 1)
  const label = shownPages.length > 1 ? `Pages ${shownPages[0]}–${shownPages[shownPages.length - 1]}` : `Page ${shownPages[0] ?? 1}`
  const progress = count ? ((shown[shown.length - 1] + 1) / count) * 100 : 0
  const zoomIndex = ZOOMS.indexOf(zoom)
  const zoomed = zoom > 1

  return (
    <div className="reader-shell" ref={shellRef}>
      <section aria-label={`Reader: ${title}`} className="reader">
        <div className="reader-stage" ref={stageRef} data-zoomed={zoomed ? 'true' : undefined}>
          {error ? (
            <p style={{ color: '#D5DCE6', textAlign: 'center' }}>
              This issue couldn&apos;t load in the reader.{' '}
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Open the PDF instead
              </a>
              .
            </p>
          ) : (
            <>
              {!count && <p style={{ color: '#D5DCE6' }}>Loading the magazine…</p>}
              <div
                ref={hostRef}
                className="flip-host"
                style={{ width: bookW, display: zoomed ? 'none' : undefined }}
              />
              {zoomed && (
                <div className="zoom-view" style={{ width: pageW * zoom * shown.length }}>
                  {shown.map((i) => {
                    const url = cache.current.get(i)?.url
                    return (
                      <div key={i} className="zoom-page" style={{ width: pageW * zoom, aspectRatio: String(ratio) }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url && <img src={url} alt={`Page ${i + 1}`} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="reader-controls">
          <button type="button" className="ctl" onClick={prev} disabled={!count || atStart}>
            ← Prev
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '1 1 200px' }}>
            <span role="status" style={{ fontSize: 15, color: '#D5DCE6' }}>
              {count ? `${label} of ${count}` : 'Loading…'}
            </span>
            <div className="progress" aria-hidden="true">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button type="button" className="ctl" onClick={next} disabled={!count || atEnd}>
            Next →
          </button>
        </div>

        <div className="reader-tools">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div role="group" aria-label="Zoom" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" className="ctl" aria-label="Zoom out" disabled={zoomIndex <= 0} onClick={() => setZoom(ZOOMS[zoomIndex - 1] ?? 1)}>
                −
              </button>
              <span style={{ minWidth: 52, textAlign: 'center', color: '#D5DCE6', fontSize: 14 }}>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="ctl"
                aria-label="Zoom in"
                disabled={zoomIndex >= ZOOMS.length - 1}
                onClick={() => setZoom(ZOOMS[zoomIndex + 1] ?? zoom)}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="ctl"
              aria-pressed={sound}
              aria-label={sound ? 'Page-turn sound on' : 'Page-turn sound off'}
              title={sound ? 'Turn the page sound off' : 'Turn the page sound on'}
              onClick={toggleSound}
            >
              {sound ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ctl"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen?.()
                else shellRef.current?.requestFullscreen?.()
              }}
            >
              <FullscreenIcon /> Full screen
            </button>
            {allowDownload && (
              <a className="ctl" href={pdfUrl} target="_blank" rel="noreferrer" download>
                <DownloadIcon /> Download PDF
              </a>
            )}
          </div>
        </div>
      </section>

      {contents.length > 0 && (
        <nav aria-labelledby="toc-h" className="toc">
          <h2 id="toc-h" className="h-m" style={{ fontSize: 20 }}>
            In this issue
          </h2>
          <div className="toc-list">
            {contents.map((c) => (
              <button key={`${c.section}-${c.page}`} type="button" aria-current={shownPages.includes(c.page)} onClick={() => goToPage(c.page)}>
                <span>{c.section}</span>
                <span style={{ fontSize: 13, opacity: 0.75 }}>p. {c.page}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
