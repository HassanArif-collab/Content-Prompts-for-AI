// Conversion between the stored marker format and a ProseMirror/Tiptap doc.
//
// Storage stays plain text with [HIGHLIGHT]…[/HIGHLIGHT] for spoken lines and
// [N] for footnotes (no DB schema change). These functions are pure and have
// no React/Tiptap dependency so the round-trip can be unit-tested in isolation
// — important, because a bad round-trip would corrupt script text.
//
// Model: each newline-separated line maps to one paragraph. Highlighted runs
// are text nodes carrying a `highlight` mark; footnotes are atomic inline
// `footnote` nodes with a `num` attr.

export interface ParsedSegment {
  type: 'text' | 'highlight' | 'footnote'
  content: string
  footnoteNum?: number
}

export function parseScriptContent(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const regex = /\[HIGHLIGHT\]([\s\S]*?)\[\/HIGHLIGHT\]|\[(\d+)\]/gi
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

export function markersToDoc(text: string): PMNode {
  const lines = (text ?? '').split('\n')
  const content: PMNode[] = lines.map((line) => {
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

function paragraphToText(node: PMNode): string {
  const text = (node.content ?? []).map(inlineToText).join('')
  // Merge runs that ended up as adjacent highlight spans.
  return text.replace(/\[\/HIGHLIGHT\]\[HIGHLIGHT\]/g, '')
}

export function docToMarkers(doc: PMNode | null | undefined): string {
  const paras = doc?.content ?? []
  return paras.map(paragraphToText).join('\n')
}
