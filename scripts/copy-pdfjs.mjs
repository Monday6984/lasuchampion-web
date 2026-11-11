// Copies the pdf.js helper files (image decoders, fonts, character maps, colour profiles)
// into public/pdfjs so the magazine reader can draw every page exactly as designed.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.dirname(require.resolve('pdfjs-dist/package.json'))
const out = path.resolve('public/pdfjs')
mkdirSync(out, { recursive: true })
for (const dir of ['wasm', 'standard_fonts', 'cmaps', 'iccs']) {
  const from = path.join(root, dir)
  if (existsSync(from)) cpSync(from, path.join(out, dir), { recursive: true })
}
console.log('pdf.js assets copied to public/pdfjs')
