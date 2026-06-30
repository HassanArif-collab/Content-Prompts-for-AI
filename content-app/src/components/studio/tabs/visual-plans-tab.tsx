'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  RefreshCw, Trash2, MessageSquare, Clock, Film, Code, Copy,
  Loader2, Check, X, Send, Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Project } from '../project-workspace'
import { ViewSwitcher, type ViewType } from '../ViewSwitcher'
import { ShotBlock } from '../ShotBlock'
import { VideoPreview } from '../VideoPreview'

interface Shot {
  id: string; archetype: string; duration: number; visual: string;
  motion: string; textOverlay?: string; narration: string;
  asset?: { capability?: string; prompt?: string; status?: string; path?: string };
}

interface FeedbackEntry { role: string; content: string; timestamp: string }

interface VisualPlan {
  id: string; projectId: string; title: string; status: string;
  scriptSnapshot: string; scriptSectionId: string;
  shotsJson: string; feedbackJson: string;
  remotionCode: string; remotionPreview: string; browserTasksJson: string;
  createdAt: string; updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  in_review: 'bg-muted text-foreground border-border',
  approved: 'bg-foreground text-background border-transparent',
  changes_requested: 'bg-muted text-foreground border-border',
  rendered: 'bg-muted text-muted-foreground border-border',
}

const BOARD_COLUMNS = ['draft', 'in_review', 'approved', 'rendered']

export function VisualPlansTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [plans, setPlans] = useState<VisualPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewType>('list')
  const [selectedPlan, setSelectedPlan] = useState<VisualPlan | null>(null)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [acting, setActing] = useState(false)
  const [renderingShot, setRenderingShot] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/visual-plans`)
      const data = await res.json()
      setPlans(data)
    } catch { toast.error('Failed to load plans') }
    finally { setLoading(false) }
  }, [project.id])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="space-y-4">
      {/* Header with view switcher */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-editorial text-lg font-semibold">Visual Plans</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Plans pushed from AI chat appear here automatically. All shots are expanded — no clicking to open.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitcher current={view} onChange={setView} />
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Film className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No visual plans yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">When you ask the AI in chat to generate a visual plan, it will push here automatically.</p>
        </Card>
      ) : view === 'list' ? (
        /* LIST VIEW: All plans + shots fully expanded, no dialogs */
        <div className="space-y-6">
          {plans.map(plan => (
            <PlanInline
              key={plan.id}
              plan={plan}
              onRefresh={load}
              onChange={onChange}
              projectId={project.id}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              feedbackInput={feedbackInput}
              setFeedbackInput={setFeedbackInput}
              acting={acting}
              setActing={setActing}
              renderingShot={renderingShot}
              setRenderingShot={setRenderingShot}
            />
          ))}
        </div>
      ) : view === 'board' ? (
        /* BOARD VIEW: Kanban by status */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {BOARD_COLUMNS.map(col => {
            const colPlans = plans.filter(p => p.status === col)
            return (
              <div key={col} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium uppercase tracking-wider">{col.replace('_', ' ')}</h4>
                  <span className="text-xs text-muted-foreground">{colPlans.length}</span>
                </div>
                <div className="space-y-2">
                  {colPlans.map(p => (
                    <div key={p.id} className="p-3 rounded-md bg-card border border-border/60 cursor-pointer hover:border-border" onClick={() => { setView('list'); setSelectedPlan(p) }}>
                      <div className="text-sm font-medium line-clamp-1">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{JSON.parse(p.shotsJson || '[]').length} shots</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : view === 'gallery' ? (
        /* GALLERY VIEW: Thumbnails of rendered previews */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {plans.flatMap(plan => {
            const shots: Shot[] = JSON.parse(plan.shotsJson || '[]')
            return shots.map((shot, i) => (
              <div key={`${plan.id}-${shot.id}`} className="rounded-lg overflow-hidden border border-border/60 cursor-pointer hover:border-border" onClick={() => { setView('list'); setSelectedPlan(plan) }}>
                <VideoPreview imageBase64={plan.remotionPreview} title={`Shot ${i + 1}`} />
                <div className="p-2">
                  <div className="text-xs font-medium line-clamp-1">{shot.visual}</div>
                  <div className="text-[10px] text-muted-foreground">{shot.archetype} · {shot.duration}s</div>
                </div>
              </div>
            ))
          })}
        </div>
      ) : (
        /* TIMELINE VIEW: Horizontal bars */
        <Card className="p-6 border-border/60">
          <div className="space-y-2">
            {plans.flatMap(plan => {
              const shots: Shot[] = JSON.parse(plan.shotsJson || '[]')
              const totalDuration = shots.reduce((s, sh) => s + sh.duration, 0)
              return shots.map((shot, i) => {
                const widthPct = totalDuration > 0 ? (shot.duration / totalDuration) * 100 : 100
                return (
                  <div key={`${plan.id}-${shot.id}`} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Shot {i + 1}</span>
                    <div className="flex-1 bg-muted/30 rounded h-8 relative overflow-hidden">
                      <div className="h-full bg-foreground/15 border-r border-border/60 flex items-center px-2" style={{ width: `${widthPct}%` }}>
                        <span className="text-[10px] truncate">{shot.archetype}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 shrink-0 text-right">{shot.duration}s</span>
                  </div>
                )
              })
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Plan Inline (fully expanded, no dialog) ─────────────────────

function PlanInline({ plan, onRefresh, onChange, projectId, selectedPlan, setSelectedPlan, feedbackInput, setFeedbackInput, acting, setActing, renderingShot, setRenderingShot }: {
  plan: VisualPlan
  onRefresh: () => void
  onChange: () => void
  projectId: string
  selectedPlan: VisualPlan | null
  setSelectedPlan: (p: VisualPlan | null) => void
  feedbackInput: string
  setFeedbackInput: (s: string) => void
  acting: boolean
  setActing: (b: boolean) => void
  renderingShot: string | null
  setRenderingShot: (s: string | null) => void
}) {
  const shots: Shot[] = JSON.parse(plan.shotsJson || '[]')
  const feedback: FeedbackEntry[] = JSON.parse(plan.feedbackJson || '[]')
  const updated = formatDistanceToNow(new Date(plan.updatedAt), { addSuffix: true })

  async function updatePlan(patch: Partial<VisualPlan>) {
    await fetch(`/api/visual-plans/${plan.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    onRefresh()
  }

  async function updateShot(shotIndex: number, field: string, value: string | number) {
    const newShots = [...shots]
    newShots[shotIndex] = { ...newShots[shotIndex], [field]: value }
    await updatePlan({ shotsJson: JSON.stringify(newShots) })
  }

  async function attachAsset(shotIndex: number, filePath: string, kind: 'image' | 'video') {
    const newShots = [...shots]
    newShots[shotIndex] = {
      ...newShots[shotIndex],
      asset: {
        ...(newShots[shotIndex].asset || {}),
        path: filePath,
        capability: kind === 'video' ? 'upload.video' : 'upload.image',
        status: 'ready',
      },
    }
    await updatePlan({ shotsJson: JSON.stringify(newShots) })
    toast.success('Asset attached')
  }

  async function requestChanges() {
    if (!feedbackInput.trim()) return
    setActing(true)
    try {
      const newFeedback: FeedbackEntry = { role: 'user', content: feedbackInput, timestamp: new Date().toISOString() }
      await updatePlan({ feedbackJson: JSON.stringify([...feedback, newFeedback]), status: 'changes_requested' })
      await navigator.clipboard.writeText(`Feedback on visual plan "${plan.title}":\n\n${feedbackInput}`)
      toast.success('Feedback saved + copied to clipboard')
      setFeedbackInput('')
    } finally { setActing(false) }
  }

  async function approve() {
    setActing(true)
    try {
      await updatePlan({ status: 'approved' })
      const newFeedback: FeedbackEntry = { role: 'system', content: 'Plan approved.', timestamp: new Date().toISOString() }
      await updatePlan({ feedbackJson: JSON.stringify([...feedback, newFeedback]) })
      toast.success('Plan approved')
    } finally { setActing(false) }
  }

  async function renderPreview(shotIndex: number) {
    if (!plan.remotionCode) { toast.error('No Remotion code to render'); return }
    setRenderingShot(`${plan.id}-${shotIndex}`)
    try {
      const res = await fetch('/api/render/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: plan.remotionCode, width: 1280, height: 720, waitForAnimation: 3000 }),
      })
      const data = await res.json()
      if (data.ok) {
        await updatePlan({ remotionPreview: data.image })
        toast.success('Preview rendered')
      } else { toast.error(data.error || 'Render failed') }
    } catch { toast.error('Render failed') }
    finally { setRenderingShot(null) }
  }

  return (
    <Card className="border-border/60 overflow-hidden">
      {/* Plan header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[plan.status] ?? STATUS_COLORS.draft}`}>{plan.status.replace('_', ' ')}</Badge>
          <h4 className="font-editorial text-base font-semibold">{plan.title}</h4>
          <span className="text-xs text-muted-foreground">{shots.length} shots</span>
          {feedback.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" />{feedback.length}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Updated {updated}</span>
          <button onClick={async () => { await fetch(`/api/visual-plans/${plan.id}`, { method: 'DELETE' }); toast.success('Deleted'); onRefresh() }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shots — all fully expanded */}
      <div className="p-5 space-y-3">
        {shots.map((shot, i) => (
          <ShotBlock
            key={shot.id || i}
            shot={shot}
            index={i}
            onUpdate={(field, value) => updateShot(i, field, value)}
            onRenderPreview={() => renderPreview(i)}
            rendering={renderingShot === `${plan.id}-${i}`}
            previewImage={plan.remotionPreview}
            remotionCode={plan.remotionCode}
            onAttachAsset={(p, k) => attachAsset(i, p, k)}
          />
        ))}
      </div>

      {/* Feedback section */}
      <div className="px-5 py-4 border-t border-border/40 bg-muted/10 space-y-3">
        {feedback.length > 0 && (
          <div className="space-y-1.5">
            {feedback.map((f, i) => (
              <div key={i} className={`text-xs p-2 rounded ${f.role === 'user' ? 'bg-muted border border-border' : f.role === 'system' ? 'bg-muted/60 border border-border' : 'bg-muted/40'}`}>
                <span className="font-medium uppercase text-[10px] mr-2">{f.role}</span>
                {f.content}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="text" value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} placeholder="Type feedback..." className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background" onKeyDown={(e) => { if (e.key === 'Enter') requestChanges() }} />
          <Button onClick={requestChanges} disabled={acting || !feedbackInput.trim()} size="sm" variant="outline">
            <Send className="w-3 h-3 mr-1" /> Save + copy
          </Button>
          {plan.status !== 'approved' && plan.status !== 'rendered' && (
            <Button onClick={approve} disabled={acting} size="sm">
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
