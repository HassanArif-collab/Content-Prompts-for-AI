'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Pin, PinOff, Trash2, Search, FileText, Sparkles, Loader2,
  ExternalLink, Globe, ChevronRight, ChevronDown, Folder, Link2,
} from 'lucide-react'
import { InlineEditor } from '../InlineEditor'
import type { Project, ResearchNote } from '../project-workspace'

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground' },
  { value: 'interview', label: 'Interview', color: 'bg-muted text-muted-foreground' },
  { value: 'archival', label: 'Archival', color: 'bg-muted text-muted-foreground' },
  { value: 'context', label: 'Context', color: 'bg-muted text-muted-foreground' },
  { value: 'fact-check', label: 'Fact-check', color: 'bg-muted text-muted-foreground' },
]

export function ResearchTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [query, setQuery] = useState('')
  const [addingParent, setAddingParent] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [researchOpen, setResearchOpen] = useState(false)

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search notes, links, tags..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setResearchOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Research a topic
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI does web search + synthesizes notes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setAddingParent(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New topic
          </Button>
        </div>
      </div>

      {/* Add topic inline */}
      {addingParent && (
        <Card className="p-4 border-dashed border-border bg-muted/40">
          <div className="flex items-center gap-3">
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
        </Card>
      )}

      {/* Tree view */}
      {filteredTopLevel.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">{allNotes.length === 0 ? 'No research topics yet' : 'No topics match your search'}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Create a topic, then add links and notes under it. Click any text to edit inline.</p>
          <Button onClick={() => setAddingParent(true)}><Plus className="w-4 h-4 mr-1.5" /> Add your first topic</Button>
        </Card>
      ) : (
        <div className="space-y-0.5">
          {filteredTopLevel.map(note => (
            <TopicNode key={note.id} note={note} childNotes={childrenOf(note.id).filter(matches)} matches={matches} projectId={project.id} onChange={onChange} onAddChild={addChild} onSaveField={saveField} onTogglePin={togglePin} onDelete={deleteNote} />
          ))}
        </div>
      )}

      {/* AI Research Dialog kept for now (will be converted to inline later) */}
      {researchOpen && (
        <AiResearchInline projectId={project.id} onResearched={onChange} onClose={() => setResearchOpen(false)} />
      )}
    </div>
  )
}

// ─── Topic Node (parent) ─────────────────────────────────────────

function TopicNode({ note, childNotes, matches, projectId, onChange, onAddChild, onSaveField, onTogglePin, onDelete }: {
  note: ResearchNote
  childNotes: ResearchNote[]
  matches: (n: ResearchNote) => boolean
  projectId: string
  onChange: () => void
  onAddChild: (parentId: string, title: string, url: string) => void
  onSaveField: (noteId: string, field: string, value: string) => void
  onTogglePin: (note: ResearchNote) => void
  onDelete: (note: ResearchNote) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [addingChild, setAddingChild] = useState(false)
  const [childTitle, setChildTitle] = useState('')
  const [childUrl, setChildUrl] = useState('')
  const isLink = !!note.url
  const cat = CATEGORIES.find(c => c.value === note.category) ?? CATEGORIES[0]

  function submitChild() {
    if (!childTitle.trim()) return
    onAddChild(note.id, childTitle, childUrl)
    setChildTitle(''); setChildUrl(''); setAddingChild(false)
  }

  return (
    <div className="group">
      <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-muted/40">
        <button onClick={() => setExpanded(!expanded)} className={`p-0.5 text-muted-foreground hover:text-foreground ${childNotes.length === 0 ? 'opacity-30 cursor-default' : ''}`} disabled={childNotes.length === 0}>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {isLink ? (
          <a href={note.url} target="_blank" rel="noopener noreferrer" className="p-0.5 text-muted-foreground hover:text-foreground" title={note.url}>
            <Link2 className="w-4 h-4" />
          </a>
        ) : (
          <Folder className="w-4 h-4 text-muted-foreground/80 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm font-medium" placeholder="Topic title..." />
        </div>
        {note.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
        <Badge variant="outline" className={`text-[10px] uppercase hidden sm:inline-flex ${cat.color}`}>{cat.label}</Badge>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setAddingChild(true)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Add sub-item">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onTogglePin(note)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Pin">
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(note)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content + children */}
      {expanded && (
        <div className="ml-5 border-l border-border/40 pl-2">
          {/* Inline content editor for parent topics */}
          {!isLink && note.content && (
            <div className="py-1 px-2">
              <InlineEditor value={note.content} onSave={(v) => onSaveField(note.id, 'content', v)} multiline className="text-xs text-muted-foreground" placeholder="Add notes..." />
            </div>
          )}
          {/* Children */}
          {childNotes.map(child => (
            <ChildRow key={child.id} note={child} onSaveField={onSaveField} onDelete={onDelete} />
          ))}
          {/* Add child inline */}
          {addingChild ? (
            <div className="py-1.5 px-2 flex items-center gap-2">
              <input type="text" value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="Title..." className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') submitChild(); if (e.key === 'Escape') setAddingChild(false) }} />
              <input type="text" value={childUrl} onChange={(e) => setChildUrl(e.target.value)} placeholder="URL (optional)..." className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background" onKeyDown={(e) => { if (e.key === 'Enter') submitChild() }} />
              <Button onClick={submitChild} size="sm" className="h-7 text-xs">Add</Button>
              <Button onClick={() => setAddingChild(false)} size="sm" variant="ghost" className="h-7 text-xs">Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setAddingChild(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/40">
              <Plus className="w-3 h-3" /> New sub-item
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Child Row ───────────────────────────────────────────────────

function ChildRow({ note, onSaveField, onDelete }: {
  note: ResearchNote
  onSaveField: (noteId: string, field: string, value: string) => void
  onDelete: (note: ResearchNote) => void
}) {
  const isLink = !!note.url
  return (
    <div className="group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-muted/40">
      {isLink ? (
        <a href={note.url} target="_blank" rel="noopener noreferrer" className="p-0.5 text-muted-foreground hover:text-foreground" title={note.url}>
          <Link2 className="w-3.5 h-3.5" />
        </a>
      ) : (
        <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <InlineEditor value={note.title} onSave={(v) => onSaveField(note.id, 'title', v)} className="text-sm text-foreground/80" placeholder="Title..." />
      </div>
      {note.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onDelete(note)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── AI Research Inline Panel ────────────────────────────────────

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
    <Card className="p-4 border-border bg-muted/40">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> AI Research</h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><span className="text-xs">Close</span></button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') research() }} placeholder="e.g. Pakistan textile exports decline 2024" className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background" disabled={loading} />
        <Button onClick={research} disabled={loading || !topic.trim()} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
      </div>
      {result && (
        <div className="space-y-2">
          {result.notes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Generated notes ({result.notes.length})</span>
                <Button size="sm" onClick={importAll} className="h-7 text-xs">Import all</Button>
              </div>
              {result.notes.map((note, i) => (
                <div key={i} className="p-2 rounded border border-border bg-muted/40 text-xs">
                  <span className="font-semibold">{note.title}</span>
                  <p className="text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
