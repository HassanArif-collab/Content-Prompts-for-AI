'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Node, mergeAttributes } from '@tiptap/core'
import { useEffect, useRef, useCallback } from 'react'
import { Highlighter, Hash } from 'lucide-react'
import { markersToDoc, docToMarkers } from '@/lib/script-format'

// ─── Custom Footnote node ───────────────────────────────────────
// Renders as a small superscript chip. Stored as [N] in the doc.
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

// ─── Floating Toolbar ───────────────────────────────────────────
function FloatingToolbar({ editor, onFootnote }: {
  editor: Editor | null
  onFootnote: () => void
}) {
  if (!editor) return null
  if (!editor.isEditable) return null

  const { from, to, empty } = editor.state.selection
  if (empty) return null

  // Position near selection
  const coords = editor.view.coordsAtPos(from)
  const top = coords.bottom + 6
  const left = (coords.left + editor.view.coordsAtPos(to).left) / 2

  return (
    <div
      style={{ position: 'fixed', top: `${top}px`, left: `${left}px`, transform: 'translateX(-50%)', zIndex: 50 }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover shadow-md px-1 py-1"
    >
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-accent ${editor.isActive('highlight') ? 'bg-highlight text-highlight-foreground' : 'text-muted-foreground'}`}
        title="Toggle spoken-line highlight"
      >
        <Highlighter className="w-3 h-3" />
        <span>Highlight</span>
      </button>
      <button
        onClick={onFootnote}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent"
        title="Insert footnote"
      >
        <Hash className="w-3 h-3" />
        <span>Footnote</span>
      </button>
    </div>
  )
}

// ─── RichBlockEditor ────────────────────────────────────────────
// A Tiptap-based editor that shows yellow highlights LIVE as you type.
// Storage stays as [HIGHLIGHT]…[/HIGHLIGHT] and [N] markers (no schema change).
// Round-trip via script-format.ts (tested, safe).

export function RichBlockEditor({
  content,
  onSave,
  onFootnoteClick,
}: {
  content: string
  onSave: (value: string) => Promise<void> | void
  onFootnoteClick: (num: number) => void
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Highlight,
      Footnote,
    ],
    content: markersToDoc(content),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-1 py-0.5 leading-[1.75] text-foreground',
        style: 'font-size: 15px;',
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
      if (isExternalUpdate.current) return
      // Debounce save
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const doc = editor.getJSON()
        const text = docToMarkers(doc as any)
        onSave(text)
      }, 800)
    },
  })

  // Sync external content changes (e.g. AI push) without losing cursor
  useEffect(() => {
    if (!editor) return
    const currentText = docToMarkers(editor.getJSON() as any)
    if (currentText !== content) {
      isExternalUpdate.current = true
      editor.commands.setContent(markersToDoc(content) as any)
      isExternalUpdate.current = false
    }
  }, [content, editor])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const insertFootnote = useCallback(() => {
    if (!editor) return
    // Find next footnote number from current doc text
    const text = docToMarkers(editor.getJSON() as any)
    let max = 0
    const re = /\[(\d+)\]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) max = Math.max(max, parseInt(m[1]))
    const next = max + 1
    editor.chain().focus().insertContent({ type: 'footnote', attrs: { num: next } }).run()
  }, [editor])

  return (
    <div className="relative">
      <FloatingToolbar editor={editor} onFootnote={insertFootnote} />
      <EditorContent editor={editor} />
    </div>
  )
}
