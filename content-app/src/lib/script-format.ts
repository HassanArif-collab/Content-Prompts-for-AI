// Conversion between the stored marker format and a ProseMirror/Tiptap doc.
//
// Storage stays plain text (no DB schema change):
//   - [HIGHLIGHT]…[/HIGHLIGHT]  spoken lines
//   - [N]                        footnotes
//   - leading #, ##, ###         heading levels 1/2/3 (markdown-style)
//
// Pure, no React/Tiptap dependency, so the round-trip is unit-tested in
// isolation — a bad round-trip would corrupt script text.

export interface ParsedSegment {
  type: 'text' | 'highlight' | 'footnote'
  content: string
  footnoteNum?: number
}

// Map superscript footnote digits (the v5 prompt writes "[¹]") to a number, so
// the app links footnotes whether the AI emits "[1]" (ascii) or "[¹]".
const SUPERSCRIPT: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
}
function superToNum(s: string): number {
  return parseInt([...s].map((c) => SUPERSCRIPT[c] ?? '').join(''), 10)
}

export function parseScriptContent(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const regex = /\[HIGHLIGHT\]([\s\S]*?)\[\/HIGHLIGHT\]|\[(\d+)\]|\[([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\]/gi
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'highlight', content: match[1] })
    } else if (match[2] !== undefined) {
      segments.push({ type: 'footnote', content: match[0], footnoteNum: parseInt(match[2]) })
    } else if (match[3] !== undefined) {
      segments.push({ type: 'footnote', content: match[0], footnoteNum: superToNum(match[3]) })
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return segments
}

export interface PMNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string }[]
  content?: PMNode[]
}

function lineToInline(line: string): PMNode[] {
  const inline: PMNode[] = []
  for (const seg of parseScriptContent(line)) {
    if (seg.type === 'footnote' && seg.footnoteNum != null) {
      inline.push({ type: 'footnote', attrs: { num: seg.footnoteNum } })
    } else if (seg.type === 'highlight') {
      if (seg.content) inline.push({ type: 'text', text: seg.content, marks: [{ type: 'highlight' }] })
    } else if (seg.content) {
      inline.push({ type: 'text', text: seg.content })
    }
  }
  return inline
}

export function markersToDoc(text: string): PMNode {
  const lines = (text ?? '').split('\n')
  const content: PMNode[] = lines.map((line) => {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const inline = lineToInline(heading[2])
      return inline.length
        ? { type: 'heading', attrs: { level }, content: inline }
        : { type: 'heading', attrs: { level } }
    }
    const inline = lineToInline(line)
    return inline.length ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
  })
  return { type: 'doc', content }
}

function inlineToText(node: PMNode): string {
  if (node.type === 'footnote') return `[${node.attrs?.num ?? ''}]`
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'text') {
    const highlighted = (node.marks ?? []).some((m) => m.type === 'highlight')
    const t = node.text ?? ''
    return highlighted ? `[HIGHLIGHT]${t}[/HIGHLIGHT]` : t
  }
  return node.text ?? ''
}

function blockToText(node: PMNode): string {
  const inner = (node.content ?? []).map(inlineToText).join('').replace(/\[\/HIGHLIGHT\]\[HIGHLIGHT\]/g, '')
  if (node.type === 'heading') {
    const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)))
    return `${'#'.repeat(level)} ${inner}`
  }
  if (node.type === 'horizontalRule') return '---'
  return inner
}

export function docToMarkers(doc: PMNode | null | undefined): string {
  const blocks = doc?.content ?? []
  return blocks.map(blockToText).join('\n')
}
