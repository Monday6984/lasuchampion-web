/** Turns plain text (blank-line separated paragraphs) into the rich-text editor's format. */
export function plainTextToLexical(text: string) {
  const paragraphs = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((p) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: p.split('\n').flatMap((line, i) => [
          ...(i > 0 ? [{ type: 'linebreak', version: 1 }] : []),
          { type: 'text', text: line, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
        ]),
      })),
    },
  }
}
