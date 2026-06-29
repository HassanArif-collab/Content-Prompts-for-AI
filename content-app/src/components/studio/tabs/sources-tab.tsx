'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Trash2, Search, Quote, ExternalLink, Copy, Star,
  Sparkles, Link as LinkIcon,
} from 'lucide-react'
import { InlineEditor } from '../InlineEditor'
import type { Project, Source } from '../project-workspace'

const SOURCE_TYPES = [
  { value: 'book', label: 'Book' },
  { value: 'article', label: 'Article' },
  { value: 'paper', label: 'Paper' },
  { value: 'video', label: 'Video' },
  { value: 'interview', label: 'Interview' },
  { value: 'website', label: 'Website' },
  { value: 'archival', label: 'Archival' },
]

type View = 'list' | 'table'

export function SourcesTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [view, setView] = useState<View>('list')
  const [query, setQuery] = useState('')
  const [urlImportOpen, setUrlImportOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')

  const filtered = useMemo(() => project.sources.filter(s => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q) || s.publisher.toLowerCase().includes(q)
  }), [project.sources, query])

  async function saveField(sourceId: string, field: string, value: string | number) {
    await fetch(`/api/projects/${project.id}/sources/${sourceId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    onChange()
  }

  async function addSource() {
    await fetch(`/api/projects/${project.id}/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'article', title: 'New source' }),
    })
    toast.success('Source added')
    onChange()
  }

  async function deleteSource(sourceId: string) {
    await fetch(`/api/projects/${project.id}/sources/${sourceId}`, { method: 'DELETE' })
    toast.success('Source deleted')
    onChange()
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return
    setUrlImportOpen(false)
    try {
      const res = await fetch('/api/ai/read-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl, draftSource: true }),
      })
      const data = await res.json()
      if (data.sourceDraft) {
        const d = data.sourceDraft
        await fetch(`/api/projects/${project.id}/sources`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'article', title: d.title || '', author: d.author || '',
            url: importUrl, publisher: d.publisher || '',
            publicationDate: d.publicationDate || '', citation: d.citation || '',
            notes: d.summary || '', credibility: 3,
          }),
        })
        toast.success('Source imported from URL')
        setImportUrl('')
        onChange()
      }
    } catch { toast.error('Import failed') }
  }

  function Stars({ source }: { source: Source }) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => saveField(source.id, 'credibility', n)} className="p-0.5">
            <Star className={`w-3 h-3 ${n <= source.credibility ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
          </button>
        ))}
      </div>
    )
  }

  function TypeSelect({ source }: { source: Source }) {
    return (
      <select
        value={source.type}
        onChange={(e) => saveField(source.id, 'type', e.target.value)}
        className="h-7 text-xs bg-transparent text-foreground border border-border rounded-md px-1.5"
      >
        {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sources..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
          {(['list', 'table'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={view === v
                ? 'bg-background text-foreground shadow-sm rounded-md px-2.5 py-1 text-xs capitalize'
                : 'text-muted-foreground px-2.5 py-1 text-xs capitalize'}
            >
              {v}
            </button>
          ))}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setUrlImportOpen(!urlImportOpen)}>
                <LinkIcon className="w-4 h-4 mr-1.5" /> Auto-fill from URL
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste a URL — AI reads the page and drafts a citation</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button size="sm" onClick={addSource}><Plus className="w-4 h-4 mr-1.5" /> Add source</Button>
      </div>

      {/* URL import inline */}
      {urlImportOpen && (
        <Card className="p-4 border-dashed border-border">
          <div className="flex items-center gap-2">
            <Input placeholder="https://..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') importFromUrl() }} className="flex-1" />
            <Button onClick={importFromUrl} size="sm"><Sparkles className="w-4 h-4 mr-1" /> Import</Button>
            <Button onClick={() => setUrlImportOpen(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Quote className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No sources yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Build a citation library. Click any text to edit inline.</p>
          <Button onClick={addSource}><Plus className="w-4 h-4 mr-1.5" /> Add first source</Button>
        </Card>
      ) : view === 'list' ? (
        /* List view — rich inline rows */
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center border-b border-border bg-muted/30 px-3 py-2">
            <div className="w-8 text-xs text-muted-foreground">#</div>
            <div className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title / author</div>
            <div className="w-32 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</div>
            <div className="w-24 text-xs font-medium text-muted-foreground uppercase tracking-wider">Credibility</div>
            <div className="w-8" />
          </div>
          {filtered.map((s, i) => (
            <div key={s.id} className="group flex items-start border-b border-border/40 hover:bg-accent/20 px-3 py-2.5">
              <div className="w-8 text-xs text-muted-foreground tabular-nums pt-1">{i + 1}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <InlineEditor value={s.title} onSave={(v) => saveField(s.id, 'title', v)} className="text-sm font-medium" placeholder="Source title..." />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <InlineEditor value={s.author} onSave={(v) => saveField(s.id, 'author', v)} className="text-xs" placeholder="Author..." />
                  <span>·</span>
                  <InlineEditor value={s.publisher} onSave={(v) => saveField(s.id, 'publisher', v)} className="text-xs" placeholder="Publisher..." />
                  <span>·</span>
                  <InlineEditor value={s.publicationDate} onSave={(v) => saveField(s.id, 'publicationDate', v)} className="text-xs" placeholder="Date..." />
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-foreground hover:underline">
                    <ExternalLink className="w-3 h-3" /> {s.url.length > 50 ? s.url.slice(0, 50) + '...' : s.url}
                  </a>
                )}
                {s.citation && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <p className="text-xs font-mono text-muted-foreground flex-1 bg-muted/30 px-2 py-1 rounded">{s.citation}</p>
                    <button onClick={async () => { await navigator.clipboard.writeText(s.citation); toast.success('Citation copied') }} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Copy citation">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
              </div>
              <div className="w-32 pt-1"><TypeSelect source={s} /></div>
              <div className="w-24 pt-1"><Stars source={s} /></div>
              <div className="w-8 pt-1">
                <button onClick={() => deleteSource(s.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table view — citation · author · credibility · url */
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center border-b border-border bg-muted/30 px-3 py-2">
            <div className="w-8 text-xs text-muted-foreground">#</div>
            <div className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Citation</div>
            <div className="w-40 text-xs font-medium text-muted-foreground uppercase tracking-wider">Author</div>
            <div className="w-24 text-xs font-medium text-muted-foreground uppercase tracking-wider">Credibility</div>
            <div className="w-40 text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</div>
            <div className="w-8" />
          </div>
          {filtered.map((s, i) => (
            <div key={s.id} className="group flex items-center border-b border-border/40 hover:bg-accent/20 px-3 py-2">
              <div className="w-8 text-xs text-muted-foreground tabular-nums">{i + 1}</div>
              <div className="flex-1 min-w-0 pr-3">
                <InlineEditor value={s.citation} onSave={(v) => saveField(s.id, 'citation', v)} className="text-sm" placeholder="Citation..." />
              </div>
              <div className="w-40 pr-3">
                <InlineEditor value={s.author} onSave={(v) => saveField(s.id, 'author', v)} className="text-xs text-muted-foreground" placeholder="Author..." />
              </div>
              <div className="w-24"><Stars source={s} /></div>
              <div className="w-40 min-w-0 pr-3">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-foreground hover:underline truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{s.url}</span>
                  </a>
                ) : (
                  <InlineEditor value={s.url} onSave={(v) => saveField(s.id, 'url', v)} className="text-xs text-muted-foreground" placeholder="URL..." />
                )}
              </div>
              <div className="w-8">
                <button onClick={() => deleteSource(s.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
