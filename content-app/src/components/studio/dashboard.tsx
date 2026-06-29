'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStudio } from '@/store/studio'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus, Film, Clock, FileText, Quote, Clapperboard, ListTodo,
  Search, Sparkles, Trash2, ArrowRight,
} from 'lucide-react'
import { statusLabel } from '@/lib/studio-utils'
import { formatDistanceToNow } from 'date-fns'

interface ProjectWithCounts {
  id: string
  title: string
  logline: string | null
  description: string | null
  status: string
  targetRuntime: number
  narrationWpm: number
  coverColor: string
  createdAt: string
  updatedAt: string
  _count: {
    researchNotes: number
    sources: number
    scenes: number
    scriptSections: number
    tasks: number
  }
}

const COLOR_OPTIONS = ['amber', 'emerald', 'rose', 'violet', 'sky', 'orange']

type View = 'gallery' | 'list'

export function Dashboard() {
  const openProject = useStudio((s) => s.openProject)
  const [projects, setProjects] = useState<ProjectWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [view, setView] = useState<View>('gallery')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = projects.filter(p => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return p.title.toLowerCase().includes(q) || (p.logline ?? '').toLowerCase().includes(q)
  })

  const totals = projects.reduce((acc, p) => ({
    notes: acc.notes + p._count.researchNotes,
    sources: acc.sources + p._count.sources,
    scenes: acc.scenes + p._count.scenes,
    tasks: acc.tasks + p._count.tasks,
    runtime: acc.runtime + p.targetRuntime,
  }), { notes: 0, sources: 0, scenes: 0, tasks: 0, runtime: 0 })

  async function handleSeed() {
    setSeedLoading(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (!res.ok) throw new Error('seed failed')
      toast.success('Sample documentary project loaded', {
        description: '"The Forgotten Cartographers" is ready to explore.',
      })
      await load()
    } catch {
      toast.error('Could not load sample data')
    } finally {
      setSeedLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background studio-grain">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-editorial text-lg font-semibold leading-tight">Documentary Studio</h1>
              <p className="text-xs text-muted-foreground">Research · Script · Storyboard · Production</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projects.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={seedLoading}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {seedLoading ? 'Loading sample…' : 'Load sample documentary'}
              </Button>
            )}
            <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => load()} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero stats */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight">
                Your documentaries
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-xl">
                A single workspace for the slow craft of long-form documentary — research vault, scene-by-scene script, source library, and production board, all in one place.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={<Film className="w-4 h-4" />} label="Projects" value={projects.length} />
            <StatCard icon={<FileText className="w-4 h-4" />} label="Research notes" value={totals.notes} />
            <StatCard icon={<Quote className="w-4 h-4" />} label="Sources" value={totals.sources} />
            <StatCard icon={<Clapperboard className="w-4 h-4" />} label="Scenes" value={totals.scenes} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Target runtime" value={`${totals.runtime}m`} />
          </div>
        </section>

        {/* View switcher */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
          </h3>
          <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
            <button
              onClick={() => setView('gallery')}
              className={view === 'gallery'
                ? 'bg-background text-foreground shadow-sm rounded-md px-2.5 py-1 text-xs'
                : 'text-muted-foreground px-2.5 py-1 text-xs'}
            >
              Gallery
            </button>
            <button
              onClick={() => setView('list')}
              className={view === 'list'
                ? 'bg-background text-foreground shadow-sm rounded-md px-2.5 py-1 text-xs'
                : 'text-muted-foreground px-2.5 py-1 text-xs'}
            >
              List
            </button>
          </div>
        </div>

        {/* Projects */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/40 border-border/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onSeed={handleSeed} seedLoading={seedLoading} />
        ) : view === 'gallery' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={() => openProject(p.id)} onDelete={() => load()} />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} onOpen={() => openProject(p.id)} />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
          <span>Built for long-form documentary creators.</span>
          <span>Documentary Studio · {new Date().getFullYear()}</span>
        </footer>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4 border-border/60 bg-card/50">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold font-editorial">{value}</div>
    </Card>
  )
}

function ProjectCard({ project, onOpen, onDelete }: {
  project: ProjectWithCounts
  onOpen: () => void
  onDelete: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const updated = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })

  async function handleDelete() {
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    toast.success('Project deleted')
    setConfirmOpen(false)
    onDelete()
  }

  return (
    <Card className="group relative overflow-hidden border-border hover:bg-accent/40 transition-colors">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium bg-muted text-muted-foreground border-border">
          {statusLabel(project.status)}
        </Badge>
      </div>

      <button onClick={onOpen} className="relative z-0 w-full text-left p-5 h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Documentary</span>
          </div>
          <h3 className="font-editorial text-xl font-semibold leading-tight mb-2 line-clamp-2">
            {project.title}
          </h3>
          {project.logline && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {project.logline}
            </p>
          )}

          <div className="mt-auto grid grid-cols-4 gap-2 text-xs">
            <CountPill icon={<FileText className="w-3 h-3" />} value={project._count.researchNotes} label="notes" />
            <CountPill icon={<Clapperboard className="w-3 h-3" />} value={project._count.scenes} label="scenes" />
            <CountPill icon={<Quote className="w-3 h-3" />} value={project._count.sources} label="src" />
            <CountPill icon={<ListTodo className="w-3 h-3" />} value={project._count.tasks} label="tasks" />
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Updated {updated}</span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground flex items-center gap-1">
              Open <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </button>

      <button
        onClick={() => setConfirmOpen(true)}
        className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
        aria-label="Delete project"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{project.title}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes the project and all its research notes, sources, scenes, script sections, and tasks.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CountPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-muted/40">
      <div className="flex items-center gap-1 text-foreground/80">{icon}<span className="font-medium">{value}</span></div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function ProjectRow({ project, onOpen }: { project: ProjectWithCounts; onOpen: () => void }) {
  const updated = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })
  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-4 px-4 py-2.5 hover:bg-accent/40 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
      <span className="font-medium text-sm truncate flex-1 min-w-0">{project.title}</span>
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium bg-muted text-muted-foreground border-border shrink-0">
        {statusLabel(project.status)}
      </Badge>
      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right shrink-0">{project.targetRuntime}m</span>
      <span className="text-xs text-muted-foreground w-32 text-right shrink-0 hidden sm:inline">{updated}</span>
    </button>
  )
}

function EmptyState({ onSeed, seedLoading }: { onSeed: () => void; seedLoading: boolean }) {
  return (
    <Card className="border-dashed border-border/60 p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Film className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-editorial text-xl font-semibold mb-1.5">No projects yet</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Start your first documentary, or load a sample project ("The Forgotten Cartographers") to see the full workflow in action.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" onClick={onSeed} disabled={seedLoading}>
          <Sparkles className="w-4 h-4 mr-1.5" />
          {seedLoading ? 'Loading…' : 'Load sample documentary'}
        </Button>
      </div>
    </Card>
  )
}

function CreateProjectDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [description, setDescription] = useState('')
  const [targetRuntime, setTargetRuntime] = useState(30)
  const [coverColor, setCoverColor] = useState('amber')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, logline, description, targetRuntime, coverColor, narrationWpm: 150 }),
      })
      if (!res.ok) throw new Error('create failed')
      toast.success('Project created')
      setTitle(''); setLogline(''); setDescription(''); setTargetRuntime(30); setCoverColor('amber')
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Could not create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New documentary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-editorial">Start a new documentary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Silent Engineers of Apollo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logline">Logline <span className="text-muted-foreground text-xs">(one-sentence pitch)</span></Label>
            <Textarea id="logline" value={logline} onChange={(e) => setLogline(e.target.value)} rows={2} placeholder="A 40-min film about the engineers who built the Apollo guidance computer on a wire-rope budget." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Longer synopsis, thesis, intended audience, etc." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="runtime">Target runtime (minutes)</Label>
              <Input id="runtime" type="number" value={targetRuntime} onChange={(e) => setTargetRuntime(parseInt(e.target.value) || 0)} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Select value={coverColor} onValueChange={setCoverColor}>
                <SelectTrigger id="label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>{statusLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
