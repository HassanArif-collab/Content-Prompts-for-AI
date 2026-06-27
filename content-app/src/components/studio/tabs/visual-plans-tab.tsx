'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Trash2, RefreshCw, Check, X, MessageSquare, Clock,
  Film, Code, Eye, Copy, Loader2, AlertCircle, Send, Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Project } from '../project-workspace'

interface Shot {
  id: string
  archetype: string
  duration: number
  visual: string
  motion: string
  textOverlay?: string
  narration: string
  asset?: {
    capability?: string
    prompt?: string
    status?: 'pending' | 'generated' | 'failed'
    path?: string
  }
}

interface FeedbackEntry {
  role: 'user' | 'ai' | 'system'
  content: string
  timestamp: string
}

interface VisualPlan {
  id: string
  projectId: string
  title: string
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested' | 'rendered'
  scriptSnapshot: string
  scriptSectionId: string
  shotsJson: string
  feedbackJson: string
  remotionCode: string
  remotionPreview: string
  browserTasksJson: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  in_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  changes_requested: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  rendered: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
}

export function VisualPlansTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [plans, setPlans] = useState<VisualPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VisualPlan | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/visual-plans`)
      const data = await res.json()
      setPlans(data)
    } catch {
      toast.error('Failed to load visual plans')
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    load()
    // Poll every 5s for new plans pushed from chat
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-editorial text-lg font-semibold">Visual Plans</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plans pushed from your AI chat appear here automatically (5s polling). Review, give feedback, approve.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Empty state */}
      {!loading && plans.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Film className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No visual plans yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            When you ask your AI co-pilot (in the Z.ai chat) to "generate a visual plan for this script", it will push the plan here. You review, give feedback, and approve — all in this tab.
          </p>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 max-w-md mx-auto text-left">
            <div className="font-medium mb-1">How it works:</div>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Ask the AI in chat to generate a visual plan</li>
              <li>Plan appears here automatically</li>
              <li>Click to review shots, request changes, or approve</li>
              <li>After approval, AI generates Remotion code → preview shows here</li>
              <li>Give feedback on the rendered visual — AI updates</li>
            </ol>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onOpen={() => setSelected(plan)} onRefresh={load} />
          ))}
        </div>
      )}

      {/* Plan detail dialog */}
      <PlanDetailDialog
        plan={selected}
        onOpenChange={(v) => { if (!v) setSelected(null) }}
        onPlanUpdated={setSelected}
        onSaved={() => { load(); onChange() }}
        projectId={project.id}
      />
    </div>
  )
}

function PlanCard({ plan, onOpen, onRefresh }: {
  plan: VisualPlan
  onOpen: () => void
  onRefresh: () => void
}) {
  const shots: Shot[] = JSON.parse(plan.shotsJson || '[]')
  const feedback: FeedbackEntry[] = JSON.parse(plan.feedbackJson || '[]')
  const updated = formatDistanceToNow(new Date(plan.updatedAt), { addSuffix: true })
  const hasRemotion = !!plan.remotionCode
  const hasPreview = !!plan.remotionPreview

  async function handleDelete() {
    await fetch(`/api/visual-plans/${plan.id}`, { method: 'DELETE' })
    toast.success('Plan deleted')
    onRefresh()
  }

  return (
    <Card className="p-5 border-border/60 hover:border-border transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_COLORS[plan.status] ?? STATUS_COLORS.draft}`}>
              {plan.status.replace('_', ' ')}
            </Badge>
            {hasRemotion && <Badge variant="outline" className="text-[10px]"><Code className="w-3 h-3 mr-1" />Remotion</Badge>}
            {hasPreview && <Badge variant="outline" className="text-[10px]"><Eye className="w-3 h-3 mr-1" />Preview</Badge>}
            <span className="text-xs text-muted-foreground">{shots.length} shots</span>
            {feedback.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />{feedback.length}
              </span>
            )}
          </div>
          <h4 className="font-editorial text-base font-semibold mb-1 line-clamp-1">{plan.title}</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Updated {updated}</span>
          </div>
        </button>
        <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}

function PlanDetailDialog({ plan, onOpenChange, onPlanUpdated, onSaved, projectId }: {
  plan: VisualPlan | null
  onOpenChange: (v: boolean) => void
  onPlanUpdated: (plan: VisualPlan) => void
  onSaved: () => void
  projectId: string
}) {
  const [feedbackInput, setFeedbackInput] = useState('')
  const [acting, setActing] = useState(false)

  if (!plan) return null

  const shots: Shot[] = JSON.parse(plan.shotsJson || '[]')
  const feedback: FeedbackEntry[] = JSON.parse(plan.feedbackJson || '[]')

  async function updatePlan(patch: Partial<VisualPlan>) {
    if (!plan) return
    const res = await fetch(`/api/visual-plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    onPlanUpdated(updated)
    onSaved()
    return updated as VisualPlan
  }

  async function requestChanges() {
    if (!feedbackInput.trim() || !plan) return
    setActing(true)
    try {
      const newFeedback: FeedbackEntry = {
        role: 'user',
        content: feedbackInput,
        timestamp: new Date().toISOString(),
      }
      const updated = [...feedback, newFeedback]
      await updatePlan({
        feedbackJson: JSON.stringify(updated),
        status: 'changes_requested',
      })
      // Copy to clipboard for easy paste into chat
      await navigator.clipboard.writeText(`Feedback on visual plan "${plan.title}":\n\n${feedbackInput}`)
      toast.success('Feedback saved + copied to clipboard', {
        description: 'Paste it in your AI chat to apply changes.',
      })
      setFeedbackInput('')
    } finally {
      setActing(false)
    }
  }

  async function approve() {
    if (!plan) return
    setActing(true)
    try {
      await updatePlan({ status: 'approved' })
      const newFeedback: FeedbackEntry = {
        role: 'system',
        content: 'Plan approved. Ready for Remotion code generation.',
        timestamp: new Date().toISOString(),
      }
      await updatePlan({ feedbackJson: JSON.stringify([...feedback, newFeedback]) })
      toast.success('Plan approved — AI can now generate Remotion code')
    } finally {
      setActing(false)
    }
  }

  async function copyRemotionCode() {
    if (!plan?.remotionCode) return
    await navigator.clipboard.writeText(plan.remotionCode)
    toast.success('Remotion code copied')
  }

  async function renderPreview() {
    if (!plan?.remotionCode) return
    setActing(true)
    try {
      const res = await fetch('/api/render/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remotionCode: plan.remotionCode,
          width: 1920,
          height: 1080,
          durationInFrames: 150,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.image) {
        throw new Error(data.error ?? 'Preview render failed')
      }
      await updatePlan({ remotionPreview: data.image })
      toast.success('Remotion preview rendered')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview render failed')
    } finally {
      setActing(false)
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2 flex-wrap">
            <span className="truncate">{plan.title}</span>
            <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[plan.status] ?? STATUS_COLORS.draft}`}>
              {plan.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto studio-scroll flex-1 pr-1 space-y-5">
          {/* Shots */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-500" />
              Shot list ({shots.length})
            </h4>
            {shots.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No shots defined yet. The AI will push shots here.</p>
            ) : (
              <div className="space-y-2">
                {shots.map((shot, i) => (
                  <ShotCard key={shot.id ?? i} shot={shot} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Remotion code + preview */}
          {(plan.remotionCode || plan.remotionPreview) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Code className="w-4 h-4 text-violet-500" />
                Remotion output
              </h4>
              {plan.remotionPreview && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">Preview</div>
                  <div className="rounded-lg overflow-hidden border border-border/60 bg-muted/20">
                    <img src={plan.remotionPreview.startsWith('data:') ? plan.remotionPreview : `data:image/png;base64,${plan.remotionPreview}`} alt="Remotion preview" className="w-full" />
                  </div>
                </div>
              )}
              {plan.remotionCode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Code</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={renderPreview} disabled={acting}>
                        {acting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        Render preview
                      </Button>
                      <Button size="sm" variant="ghost" onClick={copyRemotionCode}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono p-3 rounded-lg bg-muted/40 border border-border/60 max-h-64 overflow-auto studio-scroll">
                    <code>{plan.remotionCode}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Feedback thread */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-500" />
              Feedback thread ({feedback.length})
            </h4>
            {feedback.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No feedback yet. Use the box below to request changes.</p>
            ) : (
              <div className="space-y-2">
                {feedback.map((f, i) => (
                  <div key={i} className={`text-xs p-2 rounded-lg ${f.role === 'user' ? 'bg-primary/10 border border-primary/20' : f.role === 'system' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/40'}`}>
                    <div className="font-medium mb-0.5 uppercase text-[10px] tracking-wider opacity-70">
                      {f.role} · {formatDistanceToNow(new Date(f.timestamp), { addSuffix: true })}
                    </div>
                    <div className="whitespace-pre-wrap">{f.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback input */}
          <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
            <Label className="text-xs">Request changes / give feedback</Label>
            <Textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="e.g. Shot 3 is too long. Make shot 5 use a stat counter instead of a bar chart."
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                Feedback is saved to the plan AND copied to your clipboard — paste it in your AI chat to apply.
              </p>
              <Button onClick={requestChanges} disabled={acting || !feedbackInput.trim()} size="sm" variant="outline">
                <Send className="w-3 h-3 mr-1" /> Save + copy
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          {plan.status === 'approved' || plan.status === 'rendered' ? (
            <Badge variant="outline" className="text-xs">
              <Check className="w-3 h-3 mr-1 text-emerald-500" /> Approved
            </Badge>
          ) : (
            <Button onClick={approve} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="w-4 h-4 mr-1.5" /> Approve plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShotCard({ shot, index }: { shot: Shot; index: number }) {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tabular-nums font-mono">SHOT {String(index + 1).padStart(2, '0')}</span>
          <Badge variant="outline" className="text-[10px] uppercase">{shot.archetype}</Badge>
          <span className="text-xs text-muted-foreground tabular-nums">{shot.duration}s</span>
          {shot.asset?.status && shot.asset.status !== 'pending' && (
            <Badge variant="outline" className={`text-[10px] uppercase ${shot.asset.status === 'generated' ? 'bg-emerald-500/15 text-emerald-700' : shot.asset.status === 'failed' ? 'bg-rose-500/15 text-rose-700' : ''}`}>
              {shot.asset.status}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div><span className="text-muted-foreground">Visual:</span> <span className="text-foreground/90">{shot.visual}</span></div>
        <div><span className="text-muted-foreground">Motion:</span> <span className="text-foreground/90">{shot.motion}</span></div>
        {shot.textOverlay && <div><span className="text-muted-foreground">Text:</span> <span className="text-foreground/90">{shot.textOverlay}</span></div>}
        <div className="text-muted-foreground italic border-l-2 border-amber-500/40 pl-2">{shot.narration}</div>
        {shot.asset?.capability && (
          <div className="mt-1.5 pt-1.5 border-t border-border/40">
            <span className="text-muted-foreground">Asset:</span>{' '}
            <Badge variant="outline" className="text-[10px]">{shot.asset.capability}</Badge>
            {shot.asset.prompt && <div className="mt-0.5 text-muted-foreground">{shot.asset.prompt}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
