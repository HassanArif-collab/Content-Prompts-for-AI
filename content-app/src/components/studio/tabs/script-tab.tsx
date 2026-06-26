'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Plus, Pencil, Trash2, Clock, FileText, ArrowUp, ArrowDown, GripVertical, Sparkles, Loader2, Check } from 'lucide-react'
import {
  countWords, estimateRuntimeMinutes, formatRuntime,
} from '@/lib/studio-utils'
import type { Project, ScriptSection } from '../project-workspace'

const SECTION_TYPES = [
  { value: 'hook', label: 'Hook (cold open)', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  { value: 'act', label: 'Act', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { value: 'transition', label: 'Transition', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { value: 'outro', label: 'Outro', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
]

export function ScriptTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [editing, setEditing] = useState<ScriptSection | null>(null)
  const [creating, setCreating] = useState(false)
  const [expanding, setExpanding] = useState<ScriptSection | null>(null)

  const sections = useMemo(
    () => [...project.scriptSections].sort((a, b) => a.order - b.order),
    [project.scriptSections]
  )

  const totalWords = sections.reduce((s, sec) => s + countWords(sec.content), 0)
  const totalMinutes = estimateRuntimeMinutes(totalWords, project.narrationWpm)
  const targetMinutes = project.targetRuntime
  const targetProgress = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0
  const targetWords = Math.round(targetMinutes * project.narrationWpm)

  return (
    <div className="space-y-5">
      {/* Runtime dashboard */}
      <Card className="p-5 border-border/60">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Words written</div>
            <div className="font-editorial text-3xl font-bold tabular-nums">{totalWords.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">of {targetWords.toLocaleString()} target</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated runtime</div>
            <div className="font-editorial text-3xl font-bold tabular-nums flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              {formatRuntime(totalMinutes)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">at {project.narrationWpm} wpm</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target runtime</div>
            <div className="font-editorial text-3xl font-bold tabular-nums">{formatRuntime(targetMinutes)}</div>
            <div className="text-xs text-muted-foreground mt-1">{project.targetRuntime} min</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target fill</div>
            <div className="font-editorial text-3xl font-bold tabular-nums">{targetProgress}%</div>
            <Progress value={targetProgress} className="h-2 mt-2" />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-editorial text-lg font-semibold">Script sections</h3>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No script sections yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Break your documentary into beats — hook, acts, transitions, outro. Each section's word count feeds the runtime estimator above.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add first section
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <SectionCard
              key={s.id}
              section={s}
              index={i}
              canMoveUp={i > 0}
              canMoveDown={i < sections.length - 1}
              narrationWpm={project.narrationWpm}
              onEdit={() => setEditing(s)}
              onExpand={() => setExpanding(s)}
              onChange={onChange}
              onReorder={async (dir: 'up' | 'down') => {
                const swapWith = dir === 'up' ? sections[i - 1] : sections[i + 1]
                if (!swapWith) return
                await fetch(`/api/projects/${project.id}/script/${s.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order: swapWith.order }),
                })
                await fetch(`/api/projects/${project.id}/script/${swapWith.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ order: s.order }),
                })
                onChange()
              }}
            />
          ))}
        </div>
      )}

      <SectionDialog
        open={creating || !!editing}
        section={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null) } }}
        projectId={project.id}
        onSaved={() => { setCreating(false); setEditing(null); onChange() }}
      />

      <ExpandSectionDialog
        open={!!expanding}
        section={expanding}
        onOpenChange={(v) => { if (!v) setExpanding(null) }}
        projectId={project.id}
        onApplied={() => { setExpanding(null); onChange() }}
      />
    </div>
  )
}

function SectionCard({ section, index, canMoveUp, canMoveDown, narrationWpm, onEdit, onExpand, onChange, onReorder }: {
  section: ScriptSection
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
  narrationWpm: number
  onEdit: () => void
  onExpand: () => void
  onChange: () => void
  onReorder: (dir: 'up' | 'down') => void
}) {
  const words = countWords(section.content)
  const minutes = estimateRuntimeMinutes(words, narrationWpm)
  const type = SECTION_TYPES.find(t => t.value === section.type) ?? SECTION_TYPES[1]

  async function handleDelete() {
    await fetch(`/api/projects/${section.projectId}/script/${section.id}`, { method: 'DELETE' })
    toast.success('Section deleted')
    onChange()
  }

  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onReorder('up')} disabled={!canMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="w-3 h-3" />
            </button>
            <GripVertical className="w-3 h-3 text-muted-foreground/40" />
            <button onClick={() => onReorder('down')} disabled={!canMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums mt-0.5">{String(index + 1).padStart(2, '0')}</span>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${type.color}`}>{type.label}</Badge>
          <h4 className="font-editorial text-base font-semibold truncate">{section.heading}</h4>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground tabular-nums">{words.toLocaleString()} words</div>
            <div className="text-xs font-medium tabular-nums">{formatRuntime(minutes)}</div>
          </div>
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onExpand} className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" aria-label="Expand with AI">
                  <Sparkles className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Expand with AI</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pl-8">
        {section.content || <span className="italic text-muted-foreground/60">No content yet.</span>}
      </div>
    </Card>
  )
}

function SectionDialog({ open, section, onOpenChange, projectId, onSaved }: {
  open: boolean
  section: ScriptSection | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onSaved: () => void
}) {
  const [heading, setHeading] = useState(section?.heading ?? '')
  const [content, setContent] = useState(section?.content ?? '')
  const [type, setType] = useState(section?.type ?? 'act')
  const [saving, setSaving] = useState(false)

  const sectionId = section?.id ?? 'new'
  const [lastId, setLastId] = useState(sectionId)
  if (sectionId !== lastId) {
    setLastId(sectionId)
    setHeading(section?.heading ?? '')
    setContent(section?.content ?? '')
    setType(section?.type ?? 'act')
  }

  async function save() {
    if (!heading.trim()) { toast.error('Heading is required'); return }
    setSaving(true)
    try {
      if (section) {
        await fetch(`/api/projects/${projectId}/script/${section.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heading, content, type }),
        })
      } else {
        await fetch(`/api/projects/${projectId}/script`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heading, content, type }),
        })
      }
      toast.success(section ? 'Section updated' : 'Section added')
      onSaved()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const liveWords = countWords(content)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-editorial">{section ? 'Edit section' : 'Add script section'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="sec-heading">Heading</Label>
              <Input id="sec-heading" value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="e.g. ACT II — DIRECTIVE 14-C" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sec-content">Narration / content</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {liveWords.toLocaleString()} words · {formatRuntime(estimateRuntimeMinutes(liveWords, 150))}
              </span>
            </div>
            <Textarea
              id="sec-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder="Write the narration here. Press Enter twice for paragraph breaks. The word count updates the runtime estimate live."
              className="font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save section'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExpandSectionDialog({ open, section, onOpenChange, projectId, onApplied }: {
  open: boolean
  section: ScriptSection | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onApplied: () => void
}) {
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'replace' | 'append'>('replace')

  const sectionId = section?.id ?? 'none'
  const [lastId, setLastId] = useState(sectionId)
  if (sectionId !== lastId) {
    setLastId(sectionId)
    setInstruction('')
    setResult('')
    setMode('replace')
  }

  async function generate() {
    if (!section) return
    setLoading(true)
    setResult('')
    try {
      const res = await fetch('/api/ai/expand-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sectionId: section.id, instruction: instruction || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setResult(data.content)
      toast.success('AI expansion ready')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI failed')
    } finally {
      setLoading(false)
    }
  }

  async function apply() {
    if (!section || !result) return
    const newContent = mode === 'append' && section.content
      ? section.content + '\n\n' + result
      : result
    await fetch(`/api/projects/${projectId}/script/${section.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    })
    toast.success(mode === 'append' ? 'AI text appended' : 'Section updated with AI text')
    onApplied()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-editorial flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Expand "{section?.heading}" with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto studio-scroll flex-1 pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="ai-instruction">Optional instruction for the AI</Label>
            <Input
              id="ai-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Add a specific example from the 1943 archives, keep it under 200 words"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to let the AI expand naturally based on the project context.
            </p>
          </div>

          <Button onClick={generate} disabled={loading || !section} variant="outline">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating…</>
            ) : result ? (
              <><Sparkles className="w-4 h-4 mr-1.5" /> Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" /> Generate expansion</>
            )}
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>AI-generated narration</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {countWords(result).toLocaleString()} words · {formatRuntime(estimateRuntimeMinutes(countWords(result), 150))}
                </span>
              </div>
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 max-h-72 overflow-y-auto studio-scroll">
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{result}</div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Apply mode:</Label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMode('replace')}
                    className={`text-xs px-2.5 py-1 rounded ${mode === 'replace' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Replace existing
                  </button>
                  <button
                    onClick={() => setMode('append')}
                    className={`text-xs px-2.5 py-1 rounded ${mode === 'append' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Append to existing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {result && (
            <Button onClick={apply} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              <Check className="w-4 h-4 mr-1.5" /> Apply to section
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
