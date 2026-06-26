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
  Plus, Pencil, Trash2, Clapperboard, MapPin, Clock,
  ArrowUp, ArrowDown, Film, Camera, Video, Archive, Plane,
  Sparkles, Loader2, Image as ImageIcon, Wand2, Download,
} from 'lucide-react'
import { formatRuntime } from '@/lib/studio-utils'
import type { Project, Scene } from '../project-workspace'

const SHOT_TYPES = [
  { value: 'A-roll', label: 'A-roll', icon: Video },
  { value: 'B-roll', label: 'B-roll', icon: Film },
  { value: 'Interview', label: 'Interview', icon: Camera },
  { value: 'Archival', label: 'Archival', icon: Archive },
  { value: 'Animation', label: 'Animation', icon: Film },
  { value: 'Drone', label: 'Drone', icon: Plane },
]

const SCENE_STATUSES = [
  { value: 'planned', label: 'Planned', color: 'bg-muted text-muted-foreground' },
  { value: 'filmed', label: 'Filmed', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { value: 'edited', label: 'Edited', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { value: 'locked', label: 'Locked', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
]

function shotIcon(shotType: string) {
  const match = SHOT_TYPES.find(s => s.value === shotType)
  if (!match) return Film
  return match.icon
}

export function StoryboardTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [editing, setEditing] = useState<Scene | null>(null)
  const [creating, setCreating] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [visualScene, setVisualScene] = useState<Scene | null>(null)

  const scenes = useMemo(
    () => [...project.scenes].sort((a, b) => a.order - b.order),
    [project.scenes]
  )

  const totalSeconds = scenes.reduce((s, sc) => s + sc.duration, 0)
  const totalMinutes = totalSeconds / 60

  return (
    <div className="space-y-5">
      <Card className="p-5 border-border/60">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scenes</div>
            <div className="font-editorial text-3xl font-bold tabular-nums">{scenes.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total storyboard runtime</div>
            <div className="font-editorial text-3xl font-bold tabular-nums flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              {formatRuntime(totalMinutes)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">vs. script target</div>
            <div className="font-editorial text-3xl font-bold tabular-nums">
              {formatRuntime(project.targetRuntime)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">target {project.targetRuntime}m</div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-editorial text-lg font-semibold">Scene breakdown</h3>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setSuggestOpen(true)}>
                  <Wand2 className="w-4 h-4 mr-1.5" /> Suggest scenes with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI reads your script and suggests additional scenes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add scene
          </Button>
        </div>
      </div>

      {scenes.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Clapperboard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No scenes yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Plan every scene — A-roll, B-roll, interviews, archival, animation, drone. Track shot type, location, narration, duration, and status.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add first scene
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {scenes.map((sc, i) => (
            <SceneCard
              key={sc.id}
              scene={sc}
              index={i}
              total={scenes.length}
              canMoveUp={i > 0}
              canMoveDown={i < scenes.length - 1}
              onEdit={() => setEditing(sc)}
              onGenerateVisual={() => setVisualScene(sc)}
              onChange={onChange}
              onReorder={async (dir: 'up' | 'down') => {
                const swapWith = dir === 'up' ? scenes[i - 1] : scenes[i + 1]
                if (!swapWith) return
                await fetch(`/api/projects/${project.id}/scenes/${sc.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order: swapWith.order }),
                })
                await fetch(`/api/projects/${project.id}/scenes/${swapWith.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order: sc.order }),
                })
                onChange()
              }}
            />
          ))}
        </div>
      )}

      <SceneDialog
        open={creating || !!editing}
        scene={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null) } }}
        projectId={project.id}
        onSaved={() => { setCreating(false); setEditing(null); onChange() }}
      />

      <SuggestScenesDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        projectId={project.id}
        onSuggested={onChange}
      />

      <VisualDialog
        open={!!visualScene}
        scene={visualScene}
        onOpenChange={(v) => { if (!v) setVisualScene(null) }}
        projectId={project.id}
      />
    </div>
  )
}

function SceneCard({ scene, index, canMoveUp, canMoveDown, onEdit, onGenerateVisual, onChange, onReorder }: {
  scene: Scene
  index: number
  total: number
  canMoveUp: boolean
  canMoveDown: boolean
  onEdit: () => void
  onGenerateVisual: () => void
  onChange: () => void
  onReorder: (dir: 'up' | 'down') => void
}) {
  const shotMeta = SHOT_TYPES.find(s => s.value === scene.shotType) ?? SHOT_TYPES[1]
  const ShotIcon = shotMeta.icon
  const status = SCENE_STATUSES.find(s => s.value === scene.status) ?? SCENE_STATUSES[0]

  async function handleDelete() {
    await fetch(`/api/projects/${scene.projectId}/scenes/${scene.id}`, { method: 'DELETE' })
    toast.success('Scene deleted')
    onChange()
  }

  async function cycleStatus() {
    const idx = SCENE_STATUSES.findIndex(s => s.value === scene.status)
    const next = SCENE_STATUSES[(idx + 1) % SCENE_STATUSES.length]
    await fetch(`/api/projects/${scene.projectId}/scenes/${scene.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next.value }),
    })
    onChange()
  }

  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 pt-1">
          <button onClick={() => onReorder('up')} disabled={!canMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
            <ArrowUp className="w-3 h-3" />
          </button>
          <button onClick={() => onReorder('down')} disabled={!canMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
          <ShotIcon className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground tabular-nums">SCENE {String(index + 1).padStart(2, '0')}</span>
                <Badge variant="outline" className="text-[10px] uppercase">{scene.shotType}</Badge>
                <button onClick={cycleStatus} title="Click to cycle status">
                  <Badge variant="outline" className={`text-[10px] uppercase cursor-pointer ${status.color}`}>{status.label}</Badge>
                </button>
              </div>
              <h4 className="font-editorial text-base font-semibold">{scene.title}</h4>
              {scene.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" /> {scene.location}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="font-editorial text-lg font-semibold tabular-nums">{formatRuntime(scene.duration / 60)}</div>
                <div className="text-[10px] text-muted-foreground">{scene.duration}s</div>
              </div>
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={onGenerateVisual} className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" aria-label="Generate visual">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Generate visual concept with AI</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button onClick={handleDelete} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {scene.description && (
            <p className="text-sm text-foreground/80 mb-2 leading-relaxed">{scene.description}</p>
          )}
          {scene.narration && (
            <blockquote className="text-sm text-muted-foreground italic border-l-2 border-amber-500/40 pl-3 my-2 leading-relaxed">
              {scene.narration}
            </blockquote>
          )}
          {scene.brollNotes && (
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60">
              <span className="font-medium">B-roll notes: </span>{scene.brollNotes}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function SceneDialog({ open, scene, onOpenChange, projectId, onSaved }: {
  open: boolean
  scene: Scene | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onSaved: () => void
}) {
  const [title, setTitle] = useState(scene?.title ?? '')
  const [shotType, setShotType] = useState(scene?.shotType ?? 'B-roll')
  const [location, setLocation] = useState(scene?.location ?? '')
  const [description, setDescription] = useState(scene?.description ?? '')
  const [narration, setNarration] = useState(scene?.narration ?? '')
  const [duration, setDuration] = useState(scene?.duration ?? 60)
  const [brollNotes, setBrollNotes] = useState(scene?.brollNotes ?? '')
  const [status, setStatus] = useState(scene?.status ?? 'planned')
  const [saving, setSaving] = useState(false)

  const sceneId = scene?.id ?? 'new'
  const [lastId, setLastId] = useState(sceneId)
  if (sceneId !== lastId) {
    setLastId(sceneId)
    setTitle(scene?.title ?? '')
    setShotType(scene?.shotType ?? 'B-roll')
    setLocation(scene?.location ?? '')
    setDescription(scene?.description ?? '')
    setNarration(scene?.narration ?? '')
    setDuration(scene?.duration ?? 60)
    setBrollNotes(scene?.brollNotes ?? '')
    setStatus(scene?.status ?? 'planned')
  }

  async function save() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = { title, shotType, location, description, narration, duration, brollNotes, status }
      if (scene) {
        await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/projects/${projectId}/scenes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast.success(scene ? 'Scene updated' : 'Scene added')
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
          <DialogTitle className="font-editorial">{scene ? 'Edit scene' : 'Add scene'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="scene-title">Scene title</Label>
            <Input id="scene-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cold open: Sheet 47-B" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Shot type</Label>
              <Select value={shotType} onValueChange={setShotType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHOT_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scene-duration">Duration (seconds)</Label>
              <Input id="scene-duration" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} min={1} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scene-location">Location</Label>
            <Input id="scene-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. National Archives reading room" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scene-desc">Description</Label>
            <Textarea id="scene-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What the audience sees on screen. Camera moves, action, mood." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scene-narration">Narration (voiceover)</Label>
            <Textarea id="scene-narration" value={narration} onChange={(e) => setNarration(e.target.value)} rows={3} placeholder="What the narrator says during this scene." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scene-broll">B-roll notes</Label>
            <Textarea id="scene-broll" value={brollNotes} onChange={(e) => setBrollNotes(e.target.value)} rows={2} placeholder="Camera, lens, lighting, sound design notes." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save scene'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuggestScenesDialog({ open, onOpenChange, projectId, onSuggested }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  onSuggested: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<Record<string, unknown>>>([])
  const [importing, setImporting] = useState(false)

  async function suggest() {
    setLoading(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/ai/suggest-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setSuggestions(data.suggestions || [])
      toast.success(`AI suggested ${data.suggestions?.length ?? 0} scenes`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function importOne(s: Record<string, unknown>) {
    setImporting(true)
    try {
      await fetch(`/api/projects/${projectId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(s.title ?? 'Untitled'),
          shotType: String(s.shotType ?? 'B-roll'),
          location: String(s.location ?? ''),
          description: String(s.description ?? ''),
          narration: String(s.narration ?? ''),
          duration: Number(s.duration ?? 60),
          brollNotes: '',
          status: 'planned',
        }),
      })
      toast.success(`Imported: ${s.title}`)
      setSuggestions(prev => prev.filter(x => x !== s))
      onSuggested()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading && !importing) { onOpenChange(v); if (!v) setSuggestions([]) } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-500" />
            AI scene suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto studio-scroll flex-1 pr-1">
          <p className="text-sm text-muted-foreground">
            AI reads your script outline, existing scenes, and research notes, then suggests additional scenes that would strengthen the narrative arc.
          </p>

          {suggestions.length === 0 && !loading && (
            <Button onClick={suggest} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              <Sparkles className="w-4 h-4 mr-1.5" /> Generate suggestions
            </Button>
          )}

          {loading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
              Analyzing your script and suggesting scenes…
            </div>
          )}

          {suggestions.map((s, i) => (
            <div key={i} className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] uppercase">{String(s.shotType ?? 'B-roll')}</Badge>
                  <span className="text-sm font-semibold">{String(s.title ?? 'Untitled')}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => importOne(s)} disabled={importing}>
                  Import
                </Button>
              </div>
              {s.location ? <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {String(s.location)}</div> : null}
              <p className="text-xs text-foreground/80 mb-1">{String(s.description ?? '')}</p>
              {s.narration ? (
                <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/40 pl-2">{String(s.narration)}</p>
              ) : null}
              <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{String(s.duration ?? 60)}s</div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {suggestions.length > 0 && (
            <Button onClick={suggest} disabled={loading} variant="outline">
              <Sparkles className="w-4 h-4 mr-1.5" /> Regenerate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VisualDialog({ open, scene, onOpenChange, projectId }: {
  open: boolean
  scene: Scene | null
  onOpenChange: (v: boolean) => void
  projectId: string
}) {
  const [loading, setLoading] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')

  async function generate() {
    if (!scene) return
    setLoading(true)
    setImageBase64(null)
    try {
      const res = await fetch('/api/ai/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sceneId: scene.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setImageBase64(data.imageBase64)
      setPrompt(data.prompt)
      toast.success('Visual generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  function download() {
    if (!imageBase64) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${imageBase64}`
    const safeName = (scene?.title ?? 'visual').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    link.download = `${safeName}_concept.png`
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) { setImageBase64(null); setPrompt('') } } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            Visual concept for "{scene?.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!imageBase64 && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                AI will translate this scene's description, narration, and B-roll notes into a cinematic visual concept you can use as a mood reference.
              </p>
              <Button onClick={generate} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                <Sparkles className="w-4 h-4 mr-1.5" /> Generate visual
              </Button>
            </div>
          )}

          {loading && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              Translating scene into a cinematic prompt and generating image…
            </div>
          )}

          {imageBase64 && (
            <>
              <div className="rounded-lg overflow-hidden border border-border/60">
                <img src={`data:image/png;base64,${imageBase64}`} alt={`AI concept for ${scene?.title}`} className="w-full" />
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">View prompt</summary>
                <p className="mt-2 p-2 rounded bg-muted/40 font-mono">{prompt}</p>
              </details>
              <div className="flex items-center justify-between">
                <Button onClick={generate} disabled={loading} variant="outline">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Regenerate
                </Button>
                <Button onClick={download}>
                  <Download className="w-4 h-4 mr-1.5" /> Download PNG
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
