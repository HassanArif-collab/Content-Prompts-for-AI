'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Pin, PinOff, Pencil, Trash2, Search, FileText, Sparkles, Loader2,
  ExternalLink, Globe, ChevronRight, ChevronDown, Folder, Link2,
} from 'lucide-react'
import type { Project, ResearchNote } from '../project-workspace'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground' },
  { value: 'interview', label: 'Interview', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { value: 'archival', label: 'Archival', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { value: 'context', label: 'Context', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { value: 'fact-check', label: 'Fact-check', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
]

export function ResearchTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ResearchNote | null>(null)
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null)
  const [researchOpen, setResearchOpen] = useState(false)

  // Build tree: top-level notes (parentId null) with children grouped under them
  const allNotes = project.researchNotes
  const topLevel = allNotes.filter(n => !n.parentId)
  const childrenOf = (parentId: string) => allNotes.filter(n => n.parentId === parentId)

  // Filter: match against query (title, content, tags, url) — if a parent matches, show all its children
  const matches = (n: ResearchNote) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.toLowerCase().includes(q) ||
      n.url.toLowerCase().includes(q)
  }
  const filteredTopLevel = topLevel.filter(n => {
    if (matches(n)) return true
    // show parent if any child matches
    return childrenOf(n.id).some(matches)
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search notes, links, tags…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setResearchOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Research a topic
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI does web search + synthesizes structured notes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setCreating({ parentId: null })}>
            <Plus className="w-4 h-4 mr-1.5" /> New topic
          </Button>
        </div>
      </div>

      {/* Tree view */}
      {filteredTopLevel.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">
            {allNotes.length === 0 ? 'No research topics yet' : 'No topics match your search'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Create a topic (e.g. "China Education"), then add links and notes under it. Build a hierarchical research vault like Notion.
          </p>
          <Button onClick={() => setCreating({ parentId: null })}>
            <Plus className="w-4 h-4 mr-1.5" /> Add your first topic
          </Button>
        </Card>
      ) : (
        <div className="space-y-1">
          {filteredTopLevel.map(note => (
            <TopicNode
              key={note.id}
              note={note}
              childNotes={childrenOf(note.id)}
              matches={matches}
              onEdit={() => setEditing(note)}
              onAddChild={() => setCreating({ parentId: note.id })}
              onChange={onChange}
            />
          ))}
        </div>
      )}

      <NoteDialog
        open={!!creating || !!editing}
        note={editing}
        parentId={creating?.parentId ?? null}
        onOpenChange={(v) => { if (!v) { setCreating(null); setEditing(null) } }}
        projectId={project.id}
        onSaved={() => { setCreating(null); setEditing(null); onChange() }}
      />

      <AiResearchDialog
        open={researchOpen}
        onOpenChange={setResearchOpen}
        projectId={project.id}
        onResearched={onChange}
      />
    </div>
  )
}

// ─── Topic node (parent) ──────────────────────────────────────────────────────

function TopicNode({ note, childNotes, matches, onEdit, onAddChild, onChange }: {
  note: ResearchNote
  childNotes: ResearchNote[]
  matches: (n: ResearchNote) => boolean
  onEdit: () => void
  onAddChild: () => void
  onChange: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isLink = !!note.url
  const cat = CATEGORIES.find(c => c.value === note.category) ?? CATEGORIES[0]

  async function togglePin() {
    await fetch(`/api/projects/${note.projectId}/research/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !note.pinned }),
    })
    onChange()
  }

  async function deleteNote() {
    await fetch(`/api/projects/${note.projectId}/research/${note.id}`, { method: 'DELETE' })
    toast.success(note.pinned ? 'Topic and its children deleted' : 'Deleted')
    onChange()
  }

  return (
    <div className="group">
      {/* Topic row */}
      <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-muted/40">
        {/* Expand chevron (only if has children) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`p-0.5 text-muted-foreground hover:text-foreground ${childNotes.length === 0 ? 'opacity-30 cursor-default' : ''}`}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          disabled={childNotes.length === 0}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Icon: folder for topic, link for link */}
        {isLink ? (
          <a
            href={note.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-0.5 text-muted-foreground hover:text-sky-500"
            title={note.url}
          >
            <Link2 className="w-4 h-4" />
          </a>
        ) : (
          <Folder className="w-4 h-4 text-amber-500/80 shrink-0" />
        )}

        {/* Title */}
        {isLink ? (
          <a
            href={note.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:text-sky-600 dark:hover:text-sky-400 hover:underline truncate flex-1 min-w-0"
          >
            {note.title}
          </a>
        ) : (
          <button onClick={onEdit} className="text-sm font-medium text-left truncate flex-1 min-w-0 hover:text-amber-600 dark:hover:text-amber-400">
            {note.title}
          </button>
        )}

        {/* Pinned indicator */}
        {note.pinned && (
          <Pin className="w-3 h-3 text-amber-500 shrink-0" />
        )}

        {/* Category badge */}
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider hidden sm:inline-flex ${cat.color}`}>
          {cat.label}
        </Badge>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={togglePin} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Pin">
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={deleteNote} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && (
        <div className="ml-5 border-l border-border/40 pl-2">
          {childNotes.length > 0 && (
            <div className="space-y-0.5">
              {childNotes.filter(matches).map(child => (
                <ChildRow key={child.id} note={child} onEdit={() => onEdit()} onChange={onChange} />
              ))}
            </div>
          )}
          {/* Add sub-item button */}
          <button
            onClick={onAddChild}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/40"
          >
            <Plus className="w-3 h-3" /> New sub-item
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Child row (link/note under a topic) ─────────────────────────────────────

function ChildRow({ note, onEdit, onChange }: {
  note: ResearchNote
  onEdit: () => void
  onChange: () => void
}) {
  const isLink = !!note.url

  async function deleteNote() {
    await fetch(`/api/projects/${note.projectId}/research/${note.id}`, { method: 'DELETE' })
    toast.success('Deleted')
    onChange()
  }

  return (
    <div className="group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-muted/40">
      {isLink ? (
        <a
          href={note.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-0.5 text-muted-foreground hover:text-sky-500"
          title={note.url}
        >
          <Link2 className="w-3.5 h-3.5" />
        </a>
      ) : (
        <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
      )}

      {isLink ? (
        <a
          href={note.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-foreground/80 hover:text-sky-600 dark:hover:text-sky-400 hover:underline truncate flex-1 min-w-0"
        >
          {note.title}
        </a>
      ) : (
        <button onClick={onEdit} className="text-sm text-foreground/80 hover:text-foreground text-left truncate flex-1 min-w-0">
          {note.title}
        </button>
      )}

      {note.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={deleteNote} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Note dialog (create / edit) ─────────────────────────────────────────────

function NoteDialog({ open, note, parentId, onOpenChange, projectId, onSaved }: {
  open: boolean
  note: ResearchNote | null
  parentId: string | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('general')
  const [tags, setTags] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset state when the dialog opens or note/parentId changes
  const noteId = note?.id ?? `new-${parentId ?? 'root'}`
  const [lastKey, setLastKey] = useState(noteId)
  if (noteId !== lastKey) {
    setLastKey(noteId)
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setUrl(note?.url ?? '')
    setCategory(note?.category ?? 'general')
    setTags(note?.tags ?? '')
    setPinned(note?.pinned ?? false)
  }

  async function save() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = { title, content, url, category, tags, pinned, parentId: note ? note.parentId : parentId }
      if (note) {
        await fetch(`/api/projects/${projectId}/research/${note.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/projects/${projectId}/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast.success(note ? 'Updated' : 'Created')
      onSaved()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isLink = !!url || (!note && parentId !== null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-editorial">
            {note ? 'Edit' : parentId ? 'New sub-item' : 'New topic'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto studio-scroll pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={parentId ? "e.g. A brief introduction to the Chinese education system | OpenLearn" : "e.g. China Education"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-url">URL <span className="text-xs text-muted-foreground">(optional — turns this into a clickable link)</span></Label>
            <Input id="note-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-tags">Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
              <Input id="note-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="interview, primary-source" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Notes / content</Label>
            <Textarea id="note-content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="What's important about this source? Key quotes, dates, claims, follow-ups." />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded" />
            Pin to top (important leads, interviews, thesis)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── AI Research Dialog (unchanged from before, kept for the AI button) ───────

function AiResearchDialog({ open, onOpenChange, projectId, onResearched }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  onResearched: () => void
}) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    notes: Array<{ title: string; content: string; category: string; tags: string; url?: string }>
    sources: Array<{ title: string; url: string; snippet: string }>
  } | null>(null)
  const [importing, setImporting] = useState(false)

  async function research() {
    if (!topic.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/generate-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setResult(data)
      toast.success(`AI generated ${data.notes?.length ?? 0} notes from ${data.sources?.length ?? 0} sources`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function importAll() {
    if (!result?.notes?.length) return
    setImporting(true)
    try {
      for (const note of result.notes) {
        await fetch(`/api/projects/${projectId}/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...note, parentId: null }),
        })
      }
      toast.success(`Imported ${result.notes.length} notes`)
      setTopic(''); setResult(null)
      onOpenChange(false)
      onResearched()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading && !importing) { onOpenChange(v); if (!v) { setTopic(''); setResult(null) } } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-500" />
            AI research assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto studio-scroll flex-1 pr-1">
          <div className="flex items-center gap-2">
            <Input
              placeholder="e.g. Pakistan textile exports decline 2024"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') research() }}
              disabled={loading}
            />
            <Button onClick={research} disabled={loading || !topic.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            AI runs a web search, synthesizes 3–5 structured notes with citations, and imports them as top-level topics you can organize.
          </p>

          {loading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
              Searching the web and synthesizing notes…
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.notes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Generated notes ({result.notes.length})</h4>
                    <Button size="sm" onClick={importAll} disabled={importing} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                      {importing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      Import all as topics
                    </Button>
                  </div>
                  {result.notes.map((note, i) => (
                    <div key={i} className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase">{note.category}</Badge>
                        <span className="text-sm font-semibold">{note.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.sources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Web sources found ({result.sources.length})</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto studio-scroll">
                    {result.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded hover:bg-muted/40 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <ExternalLink className="w-3 h-3" /> {s.title || s.url}
                        </div>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5">{s.snippet}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
