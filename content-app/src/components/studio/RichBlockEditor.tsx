'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Node, mergeAttributes } from '@tiptap/core'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Highlighter, Hash, Heading1, Heading2, Heading3, Type, Minus, Flag,
} from 'lucide-react'
import { markersToDoc, docToMarkers, type PMNode } from '@/lib/script-format'

// ─── Custom Footnote node — small superscript chip, stored as [N] ──
const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { num: { default: 1 } }
  },
  parseHTML() {
    return [{ tag: 'span[data-footnote]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-footnote': '',
      class: 'align-super mx-0.5 rounded-[3px] bg-muted px-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer',
    }), String(node.attrs.num)]
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.setAttribute('data-footnote', '')
      dom.className = 'align-super mx-0.5 rounded-[3px] bg-muted px-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer'
      dom.textContent = String(node.attrs.num)
      return { dom }
    }
  },
})

function nextFootnoteNum(editor: Editor): number {
  const text = docToMarkers(editor.getJSON() as PMNode)
  let max = 0
  const re = /\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) max = Math.max(max, parseInt(m[1]))
  return max + 1
}

// ─── Slash command definitions ──────────────────────────────────
interface SlashItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  run: (editor: Editor) => void
  needsBeat?: boolean
}

const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', label: 'Heading 1', icon: Heading1, run: (e) => e.chain().focus().setNode('heading', { level: 1 }).run() },
  { id: 'h2', label: 'Heading 2', icon: Heading2, run: (e) => e.chain().focus().setNode('heading', { level: 2 }).run() },
  { id: 'h3', label: 'Heading 3', icon: Heading3, run: (e) => e.chain().focus().setNode('heading', { level: 3 }).run() },
  { id: 'text', label: 'Text', icon: Type, run: (e) => e.chain().focus().setParagraph().run() },
  { id: 'footnote', label: 'Footnote', icon: Hash, run: (e) => e.chain().focus().insertContent({ type: 'footnote', attrs: { num: nextFootnoteNum(e) } }).run() },
  { id: 'divider', label: 'Divider', icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
  { id: 'beat', label: 'New beat', icon: Flag, run: () => {}, needsBeat: true },
]

interface SlashState {
  query: string
  from: number
  to: number
  top: number
  left: number
}

function detectSlash(editor: Editor): { query: string; from: number; to: number } | null {
  const sel = editor.state.selection
  if (!sel.empty) return null
  const $from = sel.$from
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
  const m = /(?:^|\s)\/([a-zA-Z0-9]*)$/.exec(textBefore)
  if (!m) return null
  const query = m[1]
  const to = sel.from
  const from = to - (query.length + 1)
  return { query, from, to }
}

// ─── Floating selection toolbar (highlight / footnote) ───────────
function FloatingToolbar({ editor }: { editor: Editor | null }) {
  if (!editor || !editor.isEditable) return null
  const { from, to, empty } = editor.state.selection
  if (empty) return null
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)
  const top = start.bottom + 6
  const left = (start.left + end.left) / 2

  return (
    <div
      style={{ position: 'fixed', top, left, transform: 'translateX(-50%)', zIndex: 50 }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover shadow-md px-1 py-1"
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent ${editor.isActive('highlight') ? 'bg-highlight text-highlight-foreground' : 'text-muted-foreground'}`}
        title="Highlight spoken line"
      >
        <Highlighter className="w-3 h-3" /> <span>Highlight</span>
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().insertContent({ type: 'footnote', attrs: { num: nextFootnoteNum(editor) } }).run()}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent"
        title="Insert footnote"
      >
        <Hash className="w-3 h-3" /> <span>Footnote</span>
      </button>
    </div>
  )
}

// ─── RichBlockEditor ────────────────────────────────────────────
export function RichBlockEditor({
  content,
  onSave,
  onFootnoteClick,
  onNewBeat,
}: {
  content: string
  onSave: (value: string) => Promise<void> | void
  onFootnoteClick: (num: number) => void
  onNewBeat?: () => void
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExternal = useRef(false)
  const editorRef = useRef<Editor | null>(null)
  const slashRef = useRef<SlashState | null>(null)
  const selectedRef = useRef(0)

  const [slash, setSlashState] = useState<SlashState | null>(null)
  const [selected, setSelected] = useState(0)
  const [isEmpty, setIsEmpty] = useState(!content)

  const items = SLASH_ITEMS.filter((it) => !it.needsBeat || !!onNewBeat)
  const filtered = slash ? items.filter((it) => it.label.toLowerCase().includes(slash.query.toLowerCase())) : []

  const closeSlash = useCallback(() => {
    slashRef.current = null
    selectedRef.current = 0
    setSlashState(null)
    setSelected(0)
  }, [])

  const runItem = useCallback((item: SlashItem) => {
    const editor = editorRef.current
    const s = slashRef.current
    if (!editor || !s) return
    editor.chain().focus().deleteRange({ from: s.from, to: s.to }).run()
    closeSlash()
    if (item.id === 'beat') { onNewBeat?.(); return }
    item.run(editor)
  }, [closeSlash, onNewBeat])

  const refreshSlash = useCallback((editor: Editor) => {
    const d = detectSlash(editor)
    if (d) {
      const c = editor.view.coordsAtPos(d.to)
      const next = { ...d, top: c.bottom + 4, left: c.left }
      slashRef.current = next
      setSlashState(next)
    } else if (slashRef.current) {
      closeSlash()
    }
  }, [closeSlash])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bold: false, italic: false, strike: false, code: false, codeBlock: false,
        bulletList: false, orderedList: false, blockquote: false,
      }),
      Highlight,
      Footnote,
    ],
    content: markersToDoc(content),
    editorProps: {
      attributes: { class: 'script-editor focus:outline-none min-h-[2.5rem]' },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current
        if (!s) return false
        const list = items.filter((it) => it.label.toLowerCase().includes(s.query.toLowerCase()))
        if (event.key === 'ArrowDown') {
          selectedRef.current = Math.min(selectedRef.current + 1, Math.max(0, list.length - 1))
          setSelected(selectedRef.current); return true
        }
        if (event.key === 'ArrowUp') {
          selectedRef.current = Math.max(selectedRef.current - 1, 0)
          setSelected(selectedRef.current); return true
        }
        if (event.key === 'Enter') {
          const it = list[selectedRef.current]
          if (it) { runItem(it); return true }
        }
        if (event.key === 'Escape') { closeSlash(); return true }
        return false
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement
        if (target?.hasAttribute('data-footnote')) {
          const num = parseInt(target.textContent || '0')
          if (num) onFootnoteClick(num)
        }
      },
    },
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty)
      refreshSlash(editor)
      if (isExternal.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onSave(docToMarkers(editor.getJSON() as PMNode))
      }, 800)
    },
    onSelectionUpdate: ({ editor }) => refreshSlash(editor),
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  // Sync external content (e.g. AI push) without clobbering an in-progress edit
  useEffect(() => {
    if (!editor) return
    const current = docToMarkers(editor.getJSON() as PMNode)
    if (current !== content) {
      isExternal.current = true
      editor.commands.setContent(markersToDoc(content) as unknown as Record<string, unknown>)
      setIsEmpty(editor.isEmpty)
      isExternal.current = false
    }
  }, [content, editor])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="relative">
      <FloatingToolbar editor={editor} />
      {isEmpty && (
        <div className="pointer-events-none absolute left-1 top-1 text-sm text-muted-foreground/40">
          Type ‘/’ for commands, or just start writing…
        </div>
      )}
      <EditorContent editor={editor} />

      {slash && filtered.length > 0 && (
        <div
          style={{ position: 'fixed', top: slash.top, left: slash.left, zIndex: 50 }}
          className="w-56 rounded-lg border border-border bg-popover shadow-md py-1"
        >
          <div className="px-2 pb-1 pt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Blocks</div>
          {filtered.map((it, i) => {
            const Icon = it.icon
            return (
              <button
                key={it.id}
                onMouseDown={(e) => { e.preventDefault(); runItem(it) }}
                onMouseEnter={() => { selectedRef.current = i; setSelected(i) }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-sm ${i === selected ? 'bg-accent text-foreground' : 'text-foreground/80'}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{it.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
