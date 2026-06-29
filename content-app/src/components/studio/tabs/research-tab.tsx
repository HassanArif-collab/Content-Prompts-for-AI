'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus, Pin, PinOff, Trash2, Search, FileText, Sparkles, Loader2,
  ExternalLink, ChevronRight, X,
} from 'lucide-react'
import { InlineEditor } from '../InlineEditor'
import type { Project, ResearchNote } from '../project-workspace'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'interview', label: 'Interview' },
  { value: 'archival', label: 'Archival' },
  { value: 'context', label: 'Context' },
  { value: 'fact-check', label: 'Fact-check' },
]
const categoryLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v

type View = 'tree' | 'board' | 'table'

export function ResearchTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('tree')
  const [addingParent, setAddingParent] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [researchOpen, setResearchOpen] = useState(false)
  // Collapsed topic ids (default expanded)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allNotes = project.researchNotes
  const topLevel = allNotes.filter(n => !n.parentId)
  const childrenOf = (parentId: string) => allNotes.filter(n => n.parentId === parentId)

  const matches = (n: ResearchNote) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.toLowerCase().includes(q) || n.url.toLowerCase().includes(q)
  }
  const filteredTopLevel = topLevel.filter(n => matches(n) || childrenOf(n.id).some(matches))

  async function addTopic() {
    if (!newTitle.trim()) return
    await fetch(`/api/projects/${project.id}/research`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: null, title: newTitle, content: '', category: newCategory, tags: '' }),
    })
    setNewTitle(''); setAddingParent(false)
    toast.success('Topic added')
    onChange()
  }

  async function addChild(parentId: string, title: string, url: string) {
    await fetch(`/api/projects/${project.id}/research`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, title, url, content: '', category: 'fact-check' }),
    })
    toast.success('Link added')
    onChange()
  }

  async function saveField(noteId: string, field: string, value: string) {
    await fetch(`/api/projects/${project.id}/research/${noteId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    onChange()
  }

  async function togglePin(note: ResearchNote) {
    await fetch(`/api/projects/${project.id}/research/${note.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !note.pinned }),
    })
    onChange()
  }

  async function deleteNote(note: ResearchNote) {
    await fetch(`/api/projects/${project.id}/research/${note.id}`, { method: 'DELETE' })
    toast.success('Deleted')
    onChange()
  }

  const views: { value: View; label: string }[] = [
    { value: 'tree', label: 'Tree' },
    { value: 'board', label: 'Board' },
    { value: 'table', label: 'Table' },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search notes, links, tags..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          {/* Local segmented view switcher */}
          <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
            {views.map(v => (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                className={view === v.value
                  ? 'bg-background text-foreground shadow-sm rounded-md px-2.5 py-1 text-xs'
                  : 'text-muted-foreground px-2.5 py-1 text-xs'}
              >
                {v.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setResearchOpen(o => !o)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Research a topic
          </Button>
          <Button onClick={() => setAddingParent(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New topic
          </Button>
        </div>
      </div>

      {/* AI research — inline neutral panel */}
      {researchOpen && (
        <AiResearchInline projectId={project.id} onResearched={onChange} onClose={() => setResearchOpen(false)} />
      )}

      {/* Add topic inline */}
      {addingParent && (
        <div className="flex items-center gap-3 border border-dashed border-border rounded-md p-3 bg-muted/40">
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTopic(); if (e.key === 'Escape') setAddingParent(false) }} placeholder="Topic title..." className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background" autoFocus />
          <Button onClick={addTopic} size="sm">Add</Button>
          <Button onClick={() => setAddingParent(false)} size="sm" variant="ghost">Cancel</Button>
        </div>
      )}

      {/* Empty state */}
      {filteredTopLevel.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">{allNotes.length === 0 ? 'No research topics yet' : 'No topics match your search'}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Create a topic, then add links and notes under it. Click any text to edit inline.</p>
          <Button onClick={() => setAddingParent(true)}><Plus className="w-4 h-4 mr-1.5" /> Add your first topic</Button>
        </div>
      ) : view === 'tree' ? (
        <div className="divide-y divide-border border-y border-border">
          {filteredTopLevel.map(note => (
            <TopicNode
              key={note.id}
              note={note}
              childNotes={childrenOf(note.id).filter(matches)}
              collapsed={collapsed.has(note.id)}
              onToggle={() => toggle(note.id)}
              onAddChild={addChild}
              onSaveField={saveField}
              onTogglePin={togglePin}
              onDelete={deleteNote}
            />
          ))}
        </div>
      ) : view === 'board' ? (
        <BoardView
          topics={filteredTopLevel}
          childrenOf={childrenOf}
          onSaveField={saveField}
          onDelete={deleteNote}
        />
      ) : (
        <TableView
          notes={filteredTopLevel}
          onSaveField={saveField}
          onTogglePin={togglePin}
          onDelete={deleteNote}
        />
      )}
    </div>
  )
}

// ─── Tree: Topic node (parent) ───────────────────────────────────

function TopicNode({ note, childNotes, collapsed, onToggle, onAddChild, onSaveField, onTogglePin, onDelete }: {
  note: ResearchNote
  childNotes: ResearchNote[]
  collapsed: boolean
  onToggle: () => void
  onAddChild: (parentId: string, title: string, url: string) => void
  onSaveField: (noteId: string, field: string, value: string) => void
  onTogglePin: (note: ResearchNote) => void
  onDelete: (note: ResearchNote) => void
}) {
  const [addingChild, setAddingChild] = useState(false)
  const [childTitle, setChildTitle] = useState('')
  const [childUrl, setChildUrl] = useState('')
  const hasChildren = childNotes.length > 0
  const expanded = !collapsed

  function submitChild() {
    if (!childTitle.trim()) return
    onAddChild(note.id, childTitle, childUrl)
    setChildTitle(''); setChildUrl(''); setAddingChild(false)
  }

  return (
    <div className="group py-1.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggle}
          className={`p-0.5 text-muted-foreground hover:text-foreground ${hasChildren ? '' : 'opacity-30 cursor-default'}`}
          disabled={!hasChildren}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded && hasChildren ? 'rotate-90' : ''}`} />
        </button>
        <div className="flex-1 min-w-0">
          <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm font-medium" placeholder="Topic title..." />
        </div>
        {note.url && <UrlChip url={note.url} />}
        {note.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:inline shrink-0">{categoryLabel(note.category)}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setAddingChild(true)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Add sub-item">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onTogglePin(note)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Pin">
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(note)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-5 border-l border-border pl-3 mt-1">
          {note.content && (
            <div className="py-1">
              <InlineEditor value={note.content} onSave={(v) => onSaveField(note.id, 'content', v)} multiline className="text-xs text-muted-foreground" placeholder="Add notes..." />
            </div>
          )}
          {childNotes.map(child => (
            <ChildRow key={child.id} note={child} onSaveField={onSaveField} onDelete={onDelete} />
          ))}
          {addingChild ? (
            <div className="py-1.5 flex items-center gap-2">
              <input type="text" value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="Title..." className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') submitChild(); if (e.key === 'Escape') setAddingChild(false) }} />
              <input type="text" value={childUrl} onChange={(e) => setChildUrl(e.target.value)} placeholder="URL (optional)..." className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background" onKeyDown={(e) => { if (e.key === 'Enter') submitChild() }} />
              <Button onClick={submitChild} size="sm" className="h-7 text-xs">Add</Button>
              <Button onClick={() => setAddingChild(false)} size="sm" variant="ghost" className="h-7 text-xs">Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setAddingChild(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1.5">
              <Plus className="w-3 h-3" /> New sub-item
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ChildRow({ note, onSaveField, onDelete }: {
  note: ResearchNote
  onSaveField: (noteId: string, field: string, value: string) => void
  onDelete: (note: ResearchNote) => void
}) {
  return (
    <div className="group flex items-center gap-1.5 py-1">
      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm text-foreground" placeholder="Title..." />
      </div>
      {note.url && <UrlChip url={note.url} />}
      {note.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onDelete(note)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// Muted URL chip with external-link icon
function UrlChip({ url }: { url: string }) {
  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep raw */ }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 max-w-[160px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
      title={url}
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      <span className="truncate">{host}</span>
    </a>
  )
}

// ─── Board: parent topics grouped into columns by category ───────

function BoardView({ topics, childrenOf, onSaveField, onDelete }: {
  topics: ResearchNote[]
  childrenOf: (parentId: string) => ResearchNote[]
  onSaveField: (noteId: string, field: string, value: string) => void
  onDelete: (note: ResearchNote) => void
}) {
  // Only show columns that have topics
  const columns = CATEGORIES.filter(c => topics.some(t => t.category === c.value))
  // Catch any topics with an unknown category
  const known = new Set(CATEGORIES.map(c => c.value))
  const otherTopics = topics.filter(t => !known.has(t.category))

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 studio-scroll">
      {columns.map(col => {
        const items = topics.filter(t => t.category === col.value)
        return <BoardColumn key={col.value} label={col.label} items={items} childrenOf={childrenOf} onSaveField={onSaveField} onDelete={onDelete} />
      })}
      {otherTopics.length > 0 && (
        <BoardColumn label="Uncategorized" items={otherTopics} childrenOf={childrenOf} onSaveField={onSaveField} onDelete={onDelete} />
      )}
    </div>
  )
}

function BoardColumn({ label, items, childrenOf, onSaveField, onDelete }: {
  label: string
  items: ResearchNote[]
  childrenOf: (parentId: string) => ResearchNote[]
  onSaveField: (noteId: string, field: string, value: string) => void
  onDelete: (note: ResearchNote) => void
}) {
  return (
    <div className="w-64 shrink-0">
      <div className="flex items-center gap-1.5 px-1 pb-2 text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="tabular-nums">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map(note => {
          const childCount = childrenOf(note.id).length
          return (
            <div key={note.id} className="group rounded-md border border-border bg-card p-2.5">
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm font-medium" placeholder="Topic title..." />
                </div>
                {note.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />}
                <button onClick={() => onDelete(note)} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {note.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{note.content}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {note.url && <UrlChip url={note.url} />}
                {childCount > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">{childCount} {childCount === 1 ? 'link' : 'links'}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Table: flat rows (title · category · url · pinned) ──────────

function TableView({ notes, onSaveField, onTogglePin, onDelete }: {
  notes: ResearchNote[]
  onSaveField: (noteId: string, field: string, value: string) => void
  onTogglePin: (note: ResearchNote) => void
  onDelete: (note: ResearchNote) => void
}) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_160px_auto] items-center gap-3 px-3 py-2 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/40">
        <span>Title</span>
        <span>Category</span>
        <span>URL</span>
        <span className="text-right">Pinned</span>
      </div>
      <div className="divide-y divide-border">
        {notes.map(note => (
          <div key={note.id} className="group grid grid-cols-[1fr_120px_160px_auto] items-center gap-3 px-3 py-2">
            <div className="min-w-0">
              <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm" placeholder="Title..." />
            </div>
            <span className="text-xs text-muted-foreground truncate">{categoryLabel(note.category)}</span>
            <div className="min-w-0">
              {note.url ? <UrlChip url={note.url} /> : <span className="text-xs text-muted-foreground/50">—</span>}
            </div>
            <div className="flex items-center justify-end gap-0.5">
              <button onClick={() => onTogglePin(note)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title={note.pinned ? 'Unpin' : 'Pin'}>
                {note.pinned ? <Pin className="w-3.5 h-3.5 text-foreground" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => onDelete(note)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Research — inline neutral panel ──────────────────────────

function AiResearchInline({ projectId, onResearched, onClose }: {
  projectId: string
  onResearched: () => void
  onClose: () => void
}) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ notes: Array<Record<string, string>>; sources: Array<Record<string, string>> } | null>(null)

  async function research() {
    if (!topic.trim()) return
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/ai/generate-research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  async function importAll() {
    if (!result?.notes?.length) return
    for (const note of result.notes) {
      await fetch(`/api/projects/${projectId}/research`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, parentId: null }),
      })
    }
    toast.success(`Imported ${result.notes.length} notes`)
    setResult(null); setTopic('')
    onClose(); onResearched()
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-muted-foreground" /> Research a topic</h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">AI does a web search and synthesizes notes you can import as topics.</p>
      <div className="flex items-center gap-2">
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') research() }} placeholder="e.g. Pakistan textile exports decline 2024" className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background" disabled={loading} />
        <Button onClick={research} disabled={loading || !topic.trim()} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
      </div>
      {result && result.notes.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Generated notes ({result.notes.length})</span>
            <Button size="sm" onClick={importAll} className="h-7 text-xs">Import all</Button>
          </div>
          {result.notes.map((note, i) => (
            <div key={i} className="rounded border border-border bg-background p-2 text-xs">
              <span className="font-medium">{note.title}</span>
              <p className="text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
