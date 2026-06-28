'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineEditor } from '../InlineEditor'
import { NotionTable, type NotionColumn } from '../NotionTable'
import { StyleBible } from '../StyleBible'
import { toast } from 'sonner'
import { Plus, Trash2, Clapperboard, Film } from 'lucide-react'
import { formatRuntime } from '@/lib/studio-utils'
import type { Project, Scene } from '../project-workspace'

const SHOT_TYPES = ['A-roll', 'B-roll', 'Interview', 'Archival', 'Animation', 'Drone']
const SCENE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'filmed', label: 'Filmed' },
  { value: 'edited', label: 'Edited' },
  { value: 'locked', label: 'Locked' },
]

export function StoryboardTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
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

  const columns: NotionColumn[] = [
    { key: 'title', label: 'Scene', width: '180px' },
    { key: 'aesthetic', label: 'Aesthetic', width: '120px' },
    { key: 'visualStyle', label: 'Visual Style', width: '120px' },
    { key: 'animationType', label: 'Animation', width: '100px' },
    { key: 'presenter', label: 'Presenter', width: '100px' },
    { key: 'duration', label: 'Duration', width: '70px', editable: false },
    { key: 'status', label: 'Status', width: '80px', editable: false },
  ]

  function getCellValue(scene: Scene, key: string): string {
    switch (key) {
      case 'title': return scene.title
      case 'aesthetic': return ''
      case 'visualStyle': return scene.shotType || ''
      case 'animationType': return ''
      case 'presenter': return scene.description?.includes('presenter') ? 'Yes' : 'No'
      case 'duration': return `${scene.duration}s`
      case 'status': return scene.status
      default: return ''
    }
  }

  async function handleCellEdit(rowId: string, key: string, value: string) {
    const scene = scenes.find(s => s.id === rowId)
    if (!scene) return
    const patch: Record<string, string | number> = {}
    if (key === 'title') patch.title = value
    else if (key === 'visualStyle') patch.shotType = value
    else if (key === 'aesthetic' || key === 'animationType') {
      // Store in description as JSON-like tags (no schema change)
      const desc = scene.description || ''
      const tagKey = key
      const existing = new RegExp(`\\[${tagKey}:([^\\]]*)\\]`, 'i')
      if (existing.test(desc)) {
        patch.description = desc.replace(existing, `[${tagKey}:${value}]`)
      } else {
        patch.description = `${desc} [${tagKey}:${value}]`
      }
    }
    await fetch(`/api/projects/${project.id}/scenes/${rowId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    onChange()
  }

  async function addScene() {
    const order = scenes.length
    await fetch(`/api/projects/${project.id}/scenes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Scene', shotType: 'B-roll', order, duration: 60, status: 'planned' }),
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
    await fetch(`/api/projects/${project.id}/scenes/${sceneId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next.value }),
    })
    onChange()
  }

  function saveStyleBible(field: string, value: string) {
    setStyleBible(prev => ({ ...prev, [field]: value }))
    // Save to a pinned research note (no schema change)
    // In a real implementation, this would persist via the research API
  }

  return (
    <div className="space-y-4">
      {/* Style Bible */}
      <StyleBible
        palette={styleBible.palette}
        typography={styleBible.typography}
        motion={styleBible.motion}
        references={styleBible.references}
        mood={styleBible.mood}
        onSave={saveStyleBible}
      />

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{scenes.length} scenes</span>
        <span>{formatRuntime(scenes.reduce((s, sc) => s + sc.duration, 0) / 60)} total</span>
      </div>

      {/* Notion-style table */}
      {scenes.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Clapperboard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No scenes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add scenes to build your storyboard. Each scene maps to script lines and visual plan shots.</p>
          <Button onClick={addScene}><Plus className="w-4 h-4 mr-1.5" /> Add first scene</Button>
        </Card>
      ) : (
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
          renderExpanded={(scene) => (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
                  <InlineEditor
                    value={scene.description || ''}
                    onSave={async (v) => {
                      await fetch(`/api/projects/${project.id}/scenes/${scene.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description: v }),
                      })
                      onChange()
                    }}
                    multiline
                    className="text-sm"
                    placeholder="What happens in this scene..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Narration</label>
                  <InlineEditor
                    value={scene.narration || ''}
                    onSave={async (v) => {
                      await fetch(`/api/projects/${project.id}/scenes/${scene.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ narration: v }),
                      })
                      onChange()
                    }}
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
                    onSave={async (v) => {
                      await fetch(`/api/projects/${project.id}/scenes/${scene.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ location: v }),
                      })
                      onChange()
                    }}
                    className="text-sm"
                    placeholder="Where this scene takes place..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">B-roll Notes</label>
                  <InlineEditor
                    value={scene.brollNotes || ''}
                    onSave={async (v) => {
                      await fetch(`/api/projects/${project.id}/scenes/${scene.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brollNotes: v }),
                      })
                      onChange()
                    }}
                    multiline
                    className="text-sm"
                    placeholder="Camera, lens, lighting, sound design notes..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => cycleStatus(scene.id, scene.status)}>
                  Status: {scene.status}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteScene(scene.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
