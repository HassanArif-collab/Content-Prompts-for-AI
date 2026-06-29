'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus, Trash2, Clock, FileText, ArrowUp, ArrowDown, GripVertical,
  Sparkles, Loader2, Check, X,
} from 'lucide-react'
import {
  countWords, estimateRuntimeMinutes, formatRuntime,
} from '@/lib/studio-utils'
import { InlineEditor } from '../InlineEditor'
import { RichBlockEditor } from '../RichBlockEditor'
import { SourceSidebar } from '../SourceSidebar'
import type { Project, ScriptSection, Source } from '../project-workspace'

const SECTION_TYPES = [
  { value: 'hook', label: 'Hook', color: 'bg-muted text-muted-foreground' },
  { value: 'act', label: 'Act', color: 'bg-muted text-muted-foreground' },
  { value: 'transition', label: 'Transition', color: 'bg-muted text-muted-foreground' },
  { value: 'outro', label: 'Outro', color: 'bg-muted text-muted-foreground' },
]

// Next footnote number = highest [N] already in this section + 1.
function nextFootnoteNumber(text: string): number {
  let max = 0
  const re = /\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) max = Math.max(max, parseInt(m[1]))
  return max + 1
}

// ─── Main Script Tab ─────────────────────────────────────────────

export function ScriptTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [addingSection, setAddingSection] = useState(false)
  const [newHeading, setNewHeading] = useState('')
  const [newType, setNewType] = useState('act')
  const [activeSource, setActiveSource] = useState<Source | null>(null)
  const [expandingId, setExpandingId] = useState<string | null>(null)
  const [expandInstruction, setExpandInstruction] = useState('')
  const [expandResult, setExpandResult] = useState('')
  const [expandLoading, setExpandLoading] = useState(false)

  const sections = useMemo(
    () => [...project.scriptSections].sort((a, b) => a.order - b.order),
    [project.scriptSections]
  )
  const totalWords = sections.reduce((s, sec) => s + countWords(sec.content), 0)
  const totalMinutes = estimateRuntimeMinutes(totalWords, project.narrationWpm)
  const targetMinutes = project.targetRuntime
  const targetProgress = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0
  const targetWords = Math.round(targetMinutes * project.narrationWpm)
  const sources = project.sources

  const handleFootnoteClick = useCallback((num: number) => {
    const source = sources[num - 1]
    if (source) setActiveSource(source)
    else toast.error('Source not found')
  }, [sources])

  async function saveField(sectionId: string, field: string, value: string) {
    await fetch(`/api/projects/${project.id}/script/${sectionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    onChange()
  }

  async function addSection() {
    if (!newHeading.trim()) return
    await fetch(`/api/projects/${project.id}/script`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heading: newHeading, type: newType, content: '' }),
    })
    setNewHeading(''); setAddingSection(false)
    toast.success('Section added')
    onChange()
  }

  async function deleteSection(sectionId: string) {
    await fetch(`/api/projects/${project.id}/script/${sectionId}`, { method: 'DELETE' })
    toast.success('Section deleted')
    onChange()
  }

  async function reorder(dir: 'up' | 'down', index: number) {
    const section = sections[index]
    const swapWith = dir === 'up' ? sections[index - 1] : sections[index + 1]
    if (!swapWith) return
    await fetch(`/api/projects/${project.id}/script/${section.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: swapWith.order }),
    })
    await fetch(`/api/projects/${project.id}/script/${swapWith.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: section.order }),
    })
    onChange()
  }

  async function generateExpansion(section: ScriptSection) {
    setExpandLoading(true); setExpandResult('')
    try {
      const res = await fetch('/api/ai/expand-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, sectionId: section.id, instruction: expandInstruction || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')
      setExpandResult(data.content)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI failed')
    } finally { setExpandLoading(false) }
  }

  async function applyExpansion(section: ScriptSection) {
    if (!expandResult) return
    await fetch(`/api/projects/${project.id}/script/${section.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: section.content + '\n\n' + expandResult }),
    })
    toast.success('AI text appended')
    setExpandingId(null); setExpandResult(''); setExpandInstruction('')
    onChange()
  }

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
              <Clock className="w-5 h-5 text-muted-foreground" />{formatRuntime(totalMinutes)}
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

      {/* Script sections — inline editing, no popups */}
      {sections.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No script sections yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Break your documentary into beats. Click any text to edit it inline. Use [HIGHLIGHT]...[/HIGHLIGHT] for spoken parts and [1], [2] for footnotes.
          </p>
          <Button onClick={() => setAddingSection(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add first section
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((s, i) => {
            const type = SECTION_TYPES.find(t => t.value === s.type) ?? SECTION_TYPES[1]
            const words = countWords(s.content)
            const minutes = estimateRuntimeMinutes(words, project.narrationWpm)
            return (
              <Card key={s.id} className="border-border/60 overflow-hidden">
                {/* Section header — inline editable */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-muted/20">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => reorder('up', i)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <GripVertical className="w-3 h-3 text-muted-foreground/40" />
                    <button onClick={() => reorder('down', i)} disabled={i === sections.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${type.color}`}>{type.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <InlineEditor value={s.heading} onSave={(v) => saveField(s.id, 'heading', v)} className="font-editorial text-base font-semibold" placeholder="Section heading..." />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground tabular-nums">{words.toLocaleString()} words</div>
                    <div className="text-xs font-medium tabular-nums">{formatRuntime(minutes)}</div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => setExpandingId(expandingId === s.id ? null : s.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Expand with AI">
                          <Sparkles className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Expand with AI</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <button onClick={() => deleteSection(s.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Section content — single block editor; clean render by default,
                    raw markers only while editing. No separate preview box. */}
                <div className="px-5 py-4">
                  <RichBlockEditor
                    content={s.content}
                    onSave={(v) => saveField(s.id, 'content', v)}
                    onFootnoteClick={handleFootnoteClick}
                  />

                  {/* AI Expand panel (inline, not a dialog) */}
                  {expandingId === s.id && (
                    <div className="mt-4 p-4 rounded-lg border border-border bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-muted-foreground" /> Expand with AI
                        </h4>
                        <button onClick={() => { setExpandingId(null); setExpandResult(''); setExpandInstruction('') }} className="p-1 rounded hover:bg-muted">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input type="text" value={expandInstruction} onChange={(e) => setExpandInstruction(e.target.value)} placeholder="Optional: Add specific instruction for the AI..." className="w-full text-sm px-3 py-2 rounded border border-border bg-background" />
                      <Button onClick={() => generateExpansion(s)} disabled={expandLoading} variant="outline" size="sm">
                        {expandLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3 h-3 mr-1.5" /> {expandResult ? 'Regenerate' : 'Generate'}</>}
                      </Button>
                      {expandResult && (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-muted/40 border border-border max-h-48 overflow-y-auto studio-scroll text-sm whitespace-pre-wrap">{expandResult}</div>
                          <div className="flex gap-2">
                            <Button onClick={() => applyExpansion(s)} size="sm">
                              <Check className="w-3 h-3 mr-1" /> Append to section
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}

          {/* Add section inline */}
          {addingSection ? (
            <Card className="p-5 border-dashed border-border bg-muted/40">
              <div className="flex items-center gap-3">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="text" value={newHeading} onChange={(e) => setNewHeading(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAddingSection(false) }} placeholder="Section heading..." className="flex-1 text-sm px-3 py-2 rounded border border-border bg-background" autoFocus />
                <Button onClick={addSection} size="sm">Add</Button>
                <Button onClick={() => setAddingSection(false)} size="sm" variant="ghost">Cancel</Button>
              </div>
            </Card>
          ) : (
            <button onClick={() => setAddingSection(true)} className="w-full py-3 border border-dashed border-border/60 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add section
            </button>
          )}
        </div>
      )}

      {/* Source sidebar */}
      <SourceSidebar source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  )
}
