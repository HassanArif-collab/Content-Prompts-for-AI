'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  FileText, Quote, Clapperboard, ListTodo, Clock, Sparkles,
  CheckCircle2, Circle, AlertCircle, ArrowRight,
} from 'lucide-react'
import {
  statusLabel,
  countWords, estimateRuntimeMinutes, formatRuntime,
} from '@/lib/studio-utils'
import type { Project } from '../project-workspace'

export function OverviewTab({ project, onOpenTab }: {
  project: Project
  onOpenTab: (t: string) => void
}) {
  const totalWords = project.scriptSections.reduce(
    (sum, s) => sum + countWords(s.content), 0
  )
  const scriptMinutes = estimateRuntimeMinutes(totalWords, project.narrationWpm)
  const sceneMinutes = project.scenes.reduce((s, sc) => s + sc.duration, 0) / 60
  const targetProgress = project.targetRuntime > 0
    ? Math.min(100, Math.round((scriptMinutes / project.targetRuntime) * 100))
    : 0

  const tasksDone = project.tasks.filter(t => t.status === 'done').length
  const tasksTotal = project.tasks.length
  const taskProgress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

  const sceneStatusCounts = project.scenes.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const credAvg = project.sources.length > 0
    ? (project.sources.reduce((s, src) => s + src.credibility, 0) / project.sources.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium bg-muted text-muted-foreground border-border">
            {statusLabel(project.status)}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium bg-muted text-muted-foreground border-border">
            Target {project.targetRuntime}m
          </Badge>
        </div>
        <h2 className="font-editorial text-3xl md:text-4xl font-bold leading-tight mb-3">
          {project.title}
        </h2>
        {project.logline && (
          <p className="text-lg text-foreground max-w-3xl leading-relaxed">
            {project.logline}
          </p>
        )}
        {project.description && (
          <p className="text-sm text-muted-foreground max-w-3xl mt-3 leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      <Card className="border-border divide-y divide-border">
        <PropertyRow label="Research notes" value={project.researchNotes.length} hint={`${project.researchNotes.filter(n => n.pinned).length} pinned`} icon={<FileText className="w-4 h-4 text-muted-foreground" />} onClick={() => onOpenTab('research')} />
        <PropertyRow label="Sources in library" value={project.sources.length} hint={`avg credibility ${credAvg}/5`} icon={<Quote className="w-4 h-4 text-muted-foreground" />} onClick={() => onOpenTab('sources')} />
        <PropertyRow label="Storyboard scenes" value={project.scenes.length} hint={`${formatRuntime(sceneMinutes)} planned`} icon={<Clapperboard className="w-4 h-4 text-muted-foreground" />} onClick={() => onOpenTab('storyboard')} />
        <PropertyRow label="Production tasks" value={project.tasks.length} hint={`${tasksDone}/${tasksTotal} done`} icon={<ListTodo className="w-4 h-4 text-muted-foreground" />} onClick={() => onOpenTab('production')} />
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2 border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-editorial text-lg font-semibold">Script runtime vs. target</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Narration estimated at {project.narrationWpm} words per minute
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenTab('script')}>
              Open script <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-editorial text-4xl font-bold tabular-nums">{formatRuntime(scriptMinutes)}</span>
            <span className="text-sm text-muted-foreground">/ target {formatRuntime(project.targetRuntime)}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalWords.toLocaleString()} words written</span>
              <span>{targetProgress}% of target</span>
            </div>
            <Progress value={targetProgress} className="h-2" />
          </div>

          {scriptMinutes < project.targetRuntime * 0.5 && project.scriptSections.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Your script is significantly under target. Consider expanding Act II or adding a third narrative beat — long-form documentaries usually need at least {Math.round(project.targetRuntime * project.narrationWpm).toLocaleString()} words to fill the runtime.
              </span>
            </div>
          )}
          {project.scriptSections.length === 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                No script sections yet. Head to the Script tab to draft your hook, acts, and outro — runtime estimates will appear here automatically.
              </span>
            </div>
          )}
        </Card>

        <Card className="p-6 border-border">
          <h3 className="font-editorial text-lg font-semibold mb-4">Scene status</h3>
          {project.scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scenes planned yet. Add scenes in the Storyboard tab.
            </p>
          ) : (
            <div className="space-y-3">
              <SceneStatusRow label="Planned" count={sceneStatusCounts['planned'] ?? 0} total={project.scenes.length} color="bg-foreground/15" />
              <SceneStatusRow label="Filmed" count={sceneStatusCounts['filmed'] ?? 0} total={project.scenes.length} color="bg-foreground/30" />
              <SceneStatusRow label="Edited" count={sceneStatusCounts['edited'] ?? 0} total={project.scenes.length} color="bg-foreground/45" />
              <SceneStatusRow label="Locked" count={sceneStatusCounts['locked'] ?? 0} total={project.scenes.length} color="bg-foreground/70" />
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total scene runtime</h4>
            <div className="flex items-baseline gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-editorial text-2xl font-semibold tabular-nums">{formatRuntime(sceneMinutes)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 border-border">
          <h3 className="font-editorial text-lg font-semibold mb-3">Production progress</h3>
          {tasksTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-editorial text-3xl font-bold tabular-nums">{taskProgress}%</span>
                <span className="text-sm text-muted-foreground">{tasksDone} of {tasksTotal} done</span>
              </div>
              <Progress value={taskProgress} className="h-2 mb-4" />
              <div className="space-y-2 text-sm">
                <TaskStatusLine icon={<Circle className="w-3.5 h-3.5 text-muted-foreground" />} label="To do" count={project.tasks.filter(t => t.status === 'todo').length} />
                <TaskStatusLine icon={<AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />} label="In progress" count={project.tasks.filter(t => t.status === 'in-progress').length} />
                <TaskStatusLine icon={<CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />} label="Done" count={tasksDone} />
                <TaskStatusLine icon={<AlertCircle className="w-3.5 h-3.5 text-destructive" />} label="Blocked" count={project.tasks.filter(t => t.status === 'blocked').length} />
              </div>
            </>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2 border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-editorial text-lg font-semibold">Pinned research notes</h3>
            <Button variant="outline" size="sm" onClick={() => onOpenTab('research')}>
              All notes <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          {project.researchNotes.filter(n => n.pinned).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pin important research notes (interviews, archive leads, thesis statements) to keep them at the top of your mind.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {project.researchNotes.filter(n => n.pinned).slice(0, 4).map(n => (
                <div key={n.id} className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase">{n.category}</Badge>
                  </div>
                  <h4 className="text-sm font-semibold mb-1 line-clamp-1">{n.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-3">{n.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function PropertyRow({ label, value, icon, hint, onClick }: {
  label: string; value: number; icon: React.ReactNode; hint?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors first:rounded-t-xl last:rounded-b-xl">
      {icon}
      <span className="text-sm text-muted-foreground flex-1 min-w-0">{label}</span>
      {hint && <span className="text-xs text-muted-foreground hidden sm:inline">{hint}</span>}
      <span className="font-editorial text-lg font-semibold tabular-nums w-10 text-right">{value}</span>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function SceneStatusRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TaskStatusLine({ icon, label, count }: {
  icon: React.ReactNode; label: string; count: number
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-medium tabular-nums">{count}</span>
    </div>
  )
}
