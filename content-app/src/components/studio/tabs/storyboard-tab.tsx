'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InlineEditor } from '../InlineEditor'
import { NotionTable, type NotionColumn } from '../NotionTable'
import { StyleBible } from '../StyleBible'
import { toast } from 'sonner'
import { Plus, Trash2, Clapperboard } from 'lucide-react'
import { formatRuntime } from '@/lib/studio-utils'
import type { Project, Scene } from '../project-workspace'

const SCENE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'filmed', label: 'Filmed' },
  { value: 'edited', label: 'Edited' },
  { value: 'locked', label: 'Locked' },
]

type View = 'table' | 'board' | 'gallery'

// Aesthetic / Visual style / Presenter are stored as inline tags inside the
// scene description so we avoid a schema change. ponytail: tag-in-description,
// add real columns when the Scene model gains the fields.
function readTag(scene: Scene, key: string): string {
  const m = (scene.description || '').match(new RegExp(`\\[${key}:([^\\]]*)\\]`, 'i'))
  return m ? m[1].trim() : ''
}
function writeTag(scene: Scene, key: string, value: string): string {
  const desc = scene.description || ''
  const re = new RegExp(`\\s*\\[${key}:[^\\]]*\\]`, 'i')
  const cleaned = desc.replace(re, '').trim()
  return value ? `${cleaned} [${key}:${value}]`.trim() : cleaned
}

export function StoryboardTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [view, setView] = useState<View>('table')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [styleBible, setStyleBible] = useState({
    palette: '',
    typography: '',
    motion: '',
    references: '',
    mood: '',
  })

  const scenes = useMemo(
    () => [...project.scenes].sort((a, b) => a.order - b.order),
    [project.scenes]
  )

  // Join: presenter/aesthetic come from the linked visual-plan shots (v7 sets
  // linkedSceneId), falling back to the inline description tag when unlinked.
  const [sceneShots, setSceneShots] = useState<Record<string, { presenterAppears: boolean; aesthetic: string }[]>>({})
  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${project.id}/visual-plans`)
      .then(r => r.json())
      .then((plans) => {
        if (cancelled) return
        const map: Record<string, { presenterAppears: boolean; aesthetic: string }[]> = {}
        for (const plan of plans ?? []) {
          let shots: Array<Record<string, unknown>> = []
          try { shots = JSON.parse((plan.shotsJson as string) || '[]') } catch {}
          for (const sh of shots) {
            const sid = sh.linkedSceneId as string
            if (!sid) continue
            const presenter = sh.presenter as { appears?: boolean } | undefined
            ;(map[sid] ??= []).push({ presenterAppears: !!presenter?.appears, aesthetic: (sh.aesthetic as string) || '' })
          }
        }
        setSceneShots(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [project.id])

  const columns: NotionColumn[] = [
    { key: 'title', label: 'Scene', width: '200px' },
    { key: 'aesthetic', label: 'Aesthetic', width: '130px' },
    { key: 'visualStyle', label: 'Visual style', width: '130px' },
    { key: 'presenter', label: 'Presenter', width: '110px' },
    { key: 'duration', label: 'Duration', width: '80px', editable: false },
    { key: 'status', label: 'Status', width: '90px', editable: false },
  ]

  function getCellValue(scene: Scene, key: string): string {
    switch (key) {
      case 'title': return scene.title
      case 'aesthetic': {
        const fromShot = sceneShots[scene.id]?.find(s => s.aesthetic)?.aesthetic
        return fromShot || readTag(scene, 'aesthetic')
      }
      case 'visualStyle': return scene.shotType || ''
      case 'presenter': {
        const linked = sceneShots[scene.id]
        if (linked && linked.length) return linked.some(s => s.presenterAppears) ? 'On camera' : 'VO only'
        return readTag(scene, 'presenter')
      }
      case 'duration': return formatRuntime(scene.duration / 60)
      case 'status': return SCENE_STATUSES.find(s => s.value === scene.status)?.label || scene.status
      default: return ''
    }
  }

  async function patchScene(sceneId: string, patch: Record<string, string | number>) {
    await fetch(`/api/projects/${project.id}/scenes/${sceneId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    onChange()
  }

  async function handleCellEdit(rowId: string, key: string, value: string) {
    const scene = scenes.find(s => s.id === rowId)
    if (!scene) return
    if (key === 'title') return patchScene(rowId, { title: value })
    if (key === 'visualStyle') return patchScene(rowId, { shotType: value })
    if (key === 'aesthetic' || key === 'presenter') {
      return patchScene(rowId, { description: writeTag(scene, key, value) })
    }
  }

  async function addScene() {
    const order = scenes.length
    await fetch(`/api/projects/${project.id}/scenes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New scene', shotType: 'B-roll', order, duration: 60, status: 'planned' }),
    })
    toast.success('Scene added')
    onChange()
  }

  async function deleteScene(sceneId: string) {
    await fetch(`/api/projects/${project.id}/scenes/${sceneId}`, { method: 'DELETE' })
    toast.success('Scene deleted')
    onChange()
  }

  async function cycleStatus(sceneId: string, currentStatus: string) {
    const idx = SCENE_STATUSES.findIndex(s => s.value === currentStatus)
    const next = SCENE_STATUSES[(idx + 1) % SCENE_STATUSES.length]
    await patchScene(sceneId, { status: next.value })
  }

  async function setStatus(sceneId: string, value: string) {
    await patchScene(sceneId, { status: value })
  }

  function saveStyleBible(field: string, value: string) {
    setStyleBible(prev => ({ ...prev, [field]: value }))
    // ponytail: local-only for now; persist via research API when wired.
  }

  const renderExpanded = (scene: Scene) => (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
          <InlineEditor
            value={scene.description || ''}
            onSave={(v) => patchScene(scene.id, { description: v })}
            multiline
            className="text-sm"
            placeholder="What happens in this scene..."
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Narration</label>
          <InlineEditor
            value={scene.narration || ''}
            onSave={(v) => patchScene(scene.id, { narration: v })}
            multiline
            className="text-sm"
            placeholder="What the narrator says during this scene..."
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Location</label>
          <InlineEditor
            value={scene.location || ''}
            onSave={(v) => patchScene(scene.id, { location: v })}
            className="text-sm"
            placeholder="Where this scene takes place..."
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">B-roll notes</label>
          <InlineEditor
            value={scene.brollNotes || ''}
            onSave={(v) => patchScene(scene.id, { brollNotes: v })}
            multiline
            className="text-sm"
            placeholder="Camera, lens, lighting, sound design notes..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={() => cycleStatus(scene.id, scene.status)}>
          Status: {SCENE_STATUSES.find(s => s.value === scene.status)?.label || scene.status}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => deleteScene(scene.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Style Bible — pinned on top */}
      <StyleBible
        palette={styleBible.palette}
        typography={styleBible.typography}
        motion={styleBible.motion}
        references={styleBible.references}
        mood={styleBible.mood}
        onSave={saveStyleBible}
      />

      {/* Toolbar: stats + view switcher */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{scenes.length} scenes</span>
          <span>{formatRuntime(scenes.reduce((s, sc) => s + sc.duration, 0) / 60)} total</span>
        </div>
        <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
          {(['table', 'board', 'gallery'] as View[]).map(v => (
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
      </div>

      {scenes.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Clapperboard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No scenes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add scenes to build your storyboard. Each scene maps to script lines and visual plan shots.</p>
          <Button onClick={addScene}><Plus className="w-4 h-4 mr-1.5" /> Add first scene</Button>
        </Card>
      ) : view === 'table' ? (
        <NotionTable
          columns={columns}
          rows={scenes}
          getRowId={(s) => s.id}
          getCellValue={getCellValue}
          onCellEdit={handleCellEdit}
          onRowExpand={setExpandedRowId}
          expandedRowId={expandedRowId}
          onAddRow={addScene}
          addLabel="Add scene"
          renderExpanded={renderExpanded}
        />
      ) : view === 'board' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SCENE_STATUSES.map(col => {
            const colScenes = scenes.filter(s => s.status === col.value)
            return (
              <div key={col.value} className="rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-medium text-foreground">{col.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{colScenes.length}</span>
                </div>
                <div className="p-2 space-y-2">
                  {colScenes.map(scene => (
                    <div key={scene.id} className="rounded-md border border-border bg-card p-2.5">
                      <InlineEditor
                        value={scene.title}
                        onSave={(v) => patchScene(scene.id, { title: v })}
                        className="text-sm font-medium"
                        placeholder="Untitled scene"
                      />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {scene.shotType || '—'} · {formatRuntime(scene.duration / 60)}
                      </div>
                      <button
                        onClick={() => cycleStatus(scene.id, scene.status)}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Move →
                      </button>
                    </div>
                  ))}
                  {colScenes.length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground/60">No scenes</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((scene, i) => (
            <div key={scene.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="aspect-video flex items-center justify-center bg-muted/30 border-b border-border">
                <Clapperboard className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <select
                    value={scene.status}
                    onChange={(e) => setStatus(scene.id, e.target.value)}
                    className="text-xs bg-transparent text-muted-foreground border border-border rounded px-1.5 py-0.5"
                  >
                    {SCENE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <InlineEditor
                  value={scene.title}
                  onSave={(v) => patchScene(scene.id, { title: v })}
                  className="text-sm font-medium"
                  placeholder="Untitled scene"
                />
                <div className="text-xs text-muted-foreground">
                  {scene.shotType || '—'} · {formatRuntime(scene.duration / 60)}
                </div>
                {scene.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
