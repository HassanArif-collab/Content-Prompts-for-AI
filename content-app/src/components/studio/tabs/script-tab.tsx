'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Plus, Trash2, FileText, ArrowUp, ArrowDown, Sparkles, Loader2, Check, X,
} from 'lucide-react'
import {
  countWords, estimateRuntimeMinutes, formatRuntime,
} from '@/lib/studio-utils'
import { InlineEditor } from '../InlineEditor'
import { RichBlockEditor } from '../RichBlockEditor'
import { SourceSidebar } from '../SourceSidebar'
import type { Project, ScriptSection, Source } from '../project-workspace'

// ─── Script tab — one continuous Notion-style writing surface ────
// Each beat: a left-margin label (editable, free text) + a heading + the
// rich block editor. No section cards, no header bars.

export function ScriptTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
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

  async function addBeat() {
    await fetch(`/api/projects/${project.id}/script`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heading: '', type: 'Act', content: '' }),
    })
    onChange()
  }

  async function deleteSection(sectionId: string) {
    await fetch(`/api/projects/${project.id}/script/${sectionId}`, { method: 'DELETE' })
    toast.success('Beat deleted')
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
    <div className="max-w-[880px] mx-auto">
      {/* Slim runtime strip */}
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground border-b border-border pb-3 mb-8">
        <span className="tabular-nums">{totalWords.toLocaleString()} words</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="tabular-nums">{formatRuntime(totalMinutes)} / {formatRuntime(targetMinutes)}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="tabular-nums">{targetProgress}% of target</span>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Start writing your script</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Break it into beats. Type ‘/’ for headings and blocks, select text to highlight spoken lines.
          </p>
          <Button onClick={addBeat}><Plus className="w-4 h-4 mr-1.5" /> Add first beat</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map((s, i) => {
            const words = countWords(s.content)
            const minutes = estimateRuntimeMinutes(words, project.narrationWpm)
            return (
              <div key={s.id} className="group grid grid-cols-[72px_1fr] gap-4">
                {/* Left gutter: editable beat label + hover controls */}
                <div className="text-right pt-1.5">
                  <InlineEditor
                    value={s.type || 'Beat'}
                    onSave={(v) => saveField(s.id, 'type', v)}
                    placeholder="Label"
                    className="text-[10px] uppercase tracking-wider text-muted-foreground text-right"
                    showSaveIndicator={false}
                  />
                  <div className="text-[10px] text-muted-foreground/50 tabular-nums mt-0.5">{String(i + 1).padStart(2, '0')} · {formatRuntime(minutes)}</div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5 mt-1.5">
                    <button onClick={() => reorder('up', i)} disabled={i === 0} className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => reorder('down', i)} disabled={i === sections.length - 1} className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3 h-3" /></button>
                    <button onClick={() => setExpandingId(expandingId === s.id ? null : s.id)} className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Expand with AI"><Sparkles className="w-3 h-3" /></button>
                    <button onClick={() => deleteSection(s.id)} className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-destructive" aria-label="Delete beat"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>

                {/* Content: heading + rich editor */}
                <div className="min-w-0">
                  <InlineEditor
                    value={s.heading}
                    onSave={(v) => saveField(s.id, 'heading', v)}
                    placeholder="Untitled beat"
                    className="font-editorial text-2xl font-semibold leading-snug mb-1"
                    showSaveIndicator={false}
                  />
                  <RichBlockEditor
                    content={s.content}
                    onSave={(v) => saveField(s.id, 'content', v)}
                    onFootnoteClick={handleFootnoteClick}
                    onNewBeat={addBeat}
                  />

                  {expandingId === s.id && (
                    <div className="mt-4 p-4 rounded-lg border border-border bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-muted-foreground" /> Expand with AI</h4>
                        <button onClick={() => { setExpandingId(null); setExpandResult(''); setExpandInstruction('') }} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
                      </div>
                      <input type="text" value={expandInstruction} onChange={(e) => setExpandInstruction(e.target.value)} placeholder="Optional: instruction for the AI…" className="w-full text-sm px-3 py-2 rounded border border-border bg-background" />
                      <Button onClick={() => generateExpansion(s)} disabled={expandLoading} variant="outline" size="sm">
                        {expandLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3 mr-1.5" /> {expandResult ? 'Regenerate' : 'Generate'}</>}
                      </Button>
                      {expandResult && (
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-background border border-border max-h-48 overflow-y-auto studio-scroll text-sm whitespace-pre-wrap">{expandResult}</div>
                          <Button onClick={() => applyExpansion(s)} size="sm"><Check className="w-3 h-3 mr-1" /> Append to beat</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div className="grid grid-cols-[72px_1fr] gap-4">
            <div />
            <button onClick={addBeat} className="text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-2">
              <Plus className="w-4 h-4" /> Add beat
            </button>
          </div>
        </div>
      )}

      <SourceSidebar source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  )
}
