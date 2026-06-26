'use client'

import { useState, useMemo } from 'react'
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
  Plus, Pencil, Trash2, Search, Quote, ExternalLink, Copy, Star,
  Book, FileText, Video, Mic, Globe, Archive, FileCheck,
  Sparkles, Loader2, Link as LinkIcon,
} from 'lucide-react'
import type { Project, Source } from '../project-workspace'

const SOURCE_TYPES = [
  { value: 'book', label: 'Book', icon: Book },
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'paper', label: 'Academic paper', icon: FileCheck },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'interview', label: 'Interview', icon: Mic },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'archival', label: 'Archival', icon: Archive },
]

function typeIcon(type: string) {
  return SOURCE_TYPES.find(t => t.value === type)?.icon ?? FileText
}

function credibilityStars(n: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-3 h-3 ${i < n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
  ))
}

export function SourcesTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [editing, setEditing] = useState<Source | null>(null)
  const [creating, setCreating] = useState(false)
  const [urlImportOpen, setUrlImportOpen] = useState(false)

  const filtered = useMemo(() => project.sources.filter(s => {
    const q = query.toLowerCase()
    const matchQ = !q || s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q) || s.publisher.toLowerCase().includes(q)
    const matchT = filterType === 'all' || s.type === filterType
    return matchQ && matchT
  }), [project.sources, query, filterType])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search sources…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {SOURCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setUrlImportOpen(true)}>
                  <LinkIcon className="w-4 h-4 mr-1.5" /> Auto-fill from URL
                </Button>
              </TooltipTrigger>
              <TooltipContent>Paste a URL — AI reads the page and drafts a citation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add source
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Quote className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">
            {project.sources.length === 0 ? 'No sources yet' : 'No sources match your filter'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Build a citation library — books, papers, interviews, archival material. Track credibility and auto-generate citations.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add first source
          </Button>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <div className="divide-y divide-border/60">
            {filtered.map(s => (
              <SourceRow key={s.id} source={s} onEdit={() => setEditing(s)} onChange={onChange} />
            ))}
          </div>
        </Card>
      )}

      <SourceDialog
        open={creating || !!editing}
        source={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null) } }}
        projectId={project.id}
        onSaved={() => { setCreating(false); setEditing(null); onChange() }}
      />

      <UrlImportDialog
        open={urlImportOpen}
        onOpenChange={setUrlImportOpen}
        projectId={project.id}
        onImported={onChange}
      />
    </div>
  )
}

function UrlImportDialog({ open, onOpenChange, projectId, onImported }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  onImported: () => void
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{
    page?: { title: string; url: string; text: string }
    sourceDraft?: Record<string, string>
  } | null>(null)

  async function fetchUrl() {
    if (!url.trim()) return
    setLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/ai/read-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, draftSource: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to read URL')
      setPreview(data)
      toast.success('Page read — review the draft below')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function saveSource() {
    if (!preview?.sourceDraft) return
    const d = preview.sourceDraft
    await fetch(`/api/projects/${projectId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'article',
        title: d.title || preview.page?.title || 'Untitled',
        author: d.author || '',
        url: preview.page?.url || url,
        publisher: d.publisher || '',
        publicationDate: d.publicationDate || '',
        citation: d.citation || '',
        notes: d.summary || '',
        credibility: 3,
      }),
    })
    toast.success('Source added to library')
    setUrl(''); setPreview(null)
    onOpenChange(false)
    onImported()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) { setUrl(''); setPreview(null) } } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Auto-fill source from URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto studio-scroll flex-1 pr-1">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchUrl() }}
              disabled={loading}
            />
            <Button onClick={fetchUrl} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>

          {loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Reading page and drafting citation…
            </div>
          )}

          {preview?.sourceDraft && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">AI-drafted source</div>
                <div className="font-semibold text-sm mb-1">{preview.sourceDraft.title}</div>
                {preview.sourceDraft.author && <div className="text-xs text-muted-foreground">by {preview.sourceDraft.author}</div>}
                {preview.sourceDraft.publisher && <div className="text-xs text-muted-foreground">{preview.sourceDraft.publisher} · {preview.sourceDraft.publicationDate || 'no date'}</div>}
                {preview.sourceDraft.summary && <p className="text-xs text-muted-foreground mt-2 italic">{preview.sourceDraft.summary}</p>}
                {preview.sourceDraft.citation && (
                  <div className="mt-2 p-2 rounded bg-muted/40 font-mono text-xs">{preview.sourceDraft.citation}</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                You can edit this source after saving. The AI's draft is a starting point — always verify citations against your style guide.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {preview?.sourceDraft && (
            <Button onClick={saveSource} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              Save to library
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SourceRow({ source, onEdit, onChange }: {
  source: Source
  onEdit: () => void
  onChange: () => void
}) {
  const typeMeta = SOURCE_TYPES.find(t => t.value === source.type) ?? SOURCE_TYPES[1]
  const TypeIcon = typeMeta.icon
  const typeLabel = typeMeta.label

  async function copyCitation() {
    if (!source.citation) { toast.error('No citation to copy'); return }
    await navigator.clipboard.writeText(source.citation)
    toast.success('Citation copied to clipboard')
  }

  async function handleDelete() {
    await fetch(`/api/projects/${source.projectId}/sources/${source.id}`, { method: 'DELETE' })
    toast.success('Source deleted')
    onChange()
  }

  return (
    <div className="p-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <TypeIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{typeLabel}</Badge>
                {source.publicationDate && (
                  <span className="text-xs text-muted-foreground">{source.publicationDate}</span>
                )}
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="w-3 h-3" /> link
                  </a>
                )}
              </div>
              <h4 className="font-semibold text-sm leading-tight">{source.title}</h4>
              {source.author && (
                <p className="text-xs text-muted-foreground mt-0.5">by {source.author}{source.publisher ? `, ${source.publisher}` : ''}</p>
              )}
              {source.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{source.notes}</p>
              )}
              {source.citation && (
                <div className="mt-2 flex items-start gap-2">
                  <p className="text-xs text-muted-foreground italic flex-1 font-mono bg-muted/30 px-2 py-1 rounded">
                    {source.citation}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={copyCitation} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0" aria-label="Copy citation">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy citation</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5">{credibilityStars(source.credibility)}</div>
                  </TooltipTrigger>
                  <TooltipContent>Credibility: {source.credibility}/5</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-0.5">
                <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceDialog({ open, source, onOpenChange, projectId, onSaved }: {
  open: boolean
  source: Source | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onSaved: () => void
}) {
  const [type, setType] = useState(source?.type ?? 'article')
  const [title, setTitle] = useState(source?.title ?? '')
  const [author, setAuthor] = useState(source?.author ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const [publisher, setPublisher] = useState(source?.publisher ?? '')
  const [publicationDate, setPublicationDate] = useState(source?.publicationDate ?? '')
  const [citation, setCitation] = useState(source?.citation ?? '')
  const [notes, setNotes] = useState(source?.notes ?? '')
  const [credibility, setCredibility] = useState(source?.credibility ?? 3)
  const [saving, setSaving] = useState(false)

  const sourceId = source?.id ?? 'new'
  const [lastId, setLastId] = useState(sourceId)
  if (sourceId !== lastId) {
    setLastId(sourceId)
    setType(source?.type ?? 'article')
    setTitle(source?.title ?? '')
    setAuthor(source?.author ?? '')
    setUrl(source?.url ?? '')
    setPublisher(source?.publisher ?? '')
    setPublicationDate(source?.publicationDate ?? '')
    setCitation(source?.citation ?? '')
    setNotes(source?.notes ?? '')
    setCredibility(source?.credibility ?? 3)
  }

  function autoGenerateCitation() {
    const parts: string[] = []
    if (author) parts.push(author + '.')
    if (publicationDate) parts.push(`(${publicationDate}).`)
    parts.push(title + '.')
    if (publisher) parts.push(publisher + '.')
    if (url) parts.push(url)
    setCitation(parts.join(' '))
    toast.success('Citation draft generated — review and edit')
  }

  async function save() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = { type, title, author, url, publisher, publicationDate, citation, notes, credibility }
      if (source) {
        await fetch(`/api/projects/${projectId}/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/projects/${projectId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast.success(source ? 'Source updated' : 'Source added')
      onSaved()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto studio-scroll">
        <DialogHeader>
          <DialogTitle className="font-editorial">{source ? 'Edit source' : 'Add source'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="src-title">Title</Label>
              <Input id="src-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lines in the Snow: Wartime Cartography" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="src-author">Author</Label>
              <Input id="src-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Last, F." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-publisher">Publisher / journal</Label>
              <Input id="src-publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Helsinki University Press" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-date">Publication date / year</Label>
              <Input id="src-date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} placeholder="1998 or 2024-05-12" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-url">URL <span className="text-xs text-muted-foreground">(if online)</span></Label>
              <Input id="src-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="src-citation">Citation</Label>
              <Button variant="ghost" size="sm" onClick={autoGenerateCitation} className="h-7 text-xs">Auto-generate draft</Button>
            </div>
            <Textarea id="src-citation" value={citation} onChange={(e) => setCitation(e.target.value)} rows={2} className="font-mono text-sm" placeholder="Aaltonen, M. (1998). Lines in the Snow. Helsinki University Press." />
          </div>
          <div className="space-y-1.5">
            <Label>Credibility: {credibility}/5</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setCredibility(n)} className="p-0.5">
                  <Star className={`w-5 h-5 ${n <= credibility ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {credibility <= 2 ? 'Weak — verify with primary' : credibility === 3 ? 'Moderate' : 'Strong / primary'}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-notes">Notes</Label>
            <Textarea id="src-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why this source matters. Key chapters. Caveats." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save source'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
