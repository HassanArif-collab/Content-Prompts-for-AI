'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Highlighter, Hash, Loader2 } from 'lucide-react'

// Storage stays plain text with [HIGHLIGHT]…[/HIGHLIGHT] and [N] markers
// (no schema change). This editor renders that text cleanly by default and
// only exposes the raw markers while a block is being edited.

export interface ParsedSegment {
  type: 'text' | 'highlight' | 'footnote'
  content: string
  footnoteNum?: number
}

export function parseScriptContent(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  // [\s\S] so a highlighted span can wrap across line breaks.
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

export function renderScriptContent(text: string, onFootnoteClick: (num: number) => void) {
  return parseScriptContent(text).map((seg, i) => {
    if (seg.type === 'highlight') {
      return (
        <span key={i} className="bg-highlight text-highlight-foreground rounded-[2px] px-0.5">
          {seg.content}
        </span>
      )
    }
    if (seg.type === 'footnote' && seg.footnoteNum) {
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); onFootnoteClick(seg.footnoteNum!) }}
          className="align-super mx-0.5 rounded-[3px] bg-muted px-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          title={`Source ${seg.footnoteNum}`}
        >
          {seg.footnoteNum}
        </button>
      )
    }
    return <span key={i}>{seg.content}</span>
  })
}

interface BlockEditorProps {
  value: string
  onSave: (value: string) => Promise<void> | void
  onFootnoteClick: (num: number) => void
  placeholder?: string
  /** Suggested number for a newly inserted footnote */
  nextFootnote?: number
}

export function BlockEditor({
  value,
  onSave,
  onFootnoteClick,
  placeholder = 'Write narration… select text and hit Highlight to mark spoken lines.',
  nextFootnote = 1,
}: BlockEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const autosize = useCallback(() => {
    const el = ref.current
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  }, [])

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      autosize()
    }
  }, [editing, autosize])

  async function commit() {
    const next = draft.replace(/[ \t]+$/g, '')
    if (next === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(next) } finally { setSaving(false); setEditing(false) }
  }

  function wrapSelection(before: string, after: string) {
    const el = ref.current
    if (!el) return
    const s = el.selectionStart
    const e = el.selectionEnd
    setDraft(draft.slice(0, s) + before + draft.slice(s, e) + after + draft.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, e + before.length)
      autosize()
    })
  }

  function insertAtCaret(text: string) {
    const el = ref.current
    if (!el) return
    const s = el.selectionStart
    setDraft(draft.slice(0, s) + text + draft.slice(s))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + text.length, s + text.length)
      autosize()
    })
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="min-h-[1.75rem] cursor-text whitespace-pre-wrap rounded px-1 -mx-1 text-sm leading-relaxed hover:bg-accent/40"
        title="Click to edit"
      >
        {value
          ? renderScriptContent(value, onFootnoteClick)
          : <span className="italic text-muted-foreground/50">{placeholder}</span>}
        {saving && <Loader2 className="ml-2 inline-block h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center gap-1" onMouseDown={(e) => e.preventDefault()}>
        <button
          type="button"
          onClick={() => wrapSelection('[HIGHLIGHT]', '[/HIGHLIGHT]')}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Highlighter className="h-3 w-3" /> Highlight spoken
        </button>
        <button
          type="button"
          onClick={() => insertAtCaret(`[${nextFootnote}]`)}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Hash className="h-3 w-3" /> Footnote
        </button>
        <span className="ml-1 text-[11px] text-muted-foreground/60">Esc cancels · click away to save</span>
      </div>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); autosize() }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); setDraft(value); setEditing(false) }
        }}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded bg-transparent px-1 -mx-1 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  )
}
