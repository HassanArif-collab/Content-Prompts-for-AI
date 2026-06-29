'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ExternalLink, Sparkles, Loader2, Star, ChevronRight, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Source {
  id: string
  title: string
  author: string
  url: string
  publisher: string
  publicationDate: string
  citation: string
  credibility: number
  notes: string
}

interface SourceSidebarProps {
  sources: Source[]
  activeSource: Source | null
  onClose: () => void
}

/**
 * Slide-in source panel. Lists all sources; click one to expand its detail,
 * preview the page inline (read-url extract + open-in-browser), or AI-summarize.
 */
export function SourceSidebar({ sources, activeSource, onClose }: SourceSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(activeSource?.id ?? null)
  const [preview, setPreview] = useState<{ image?: string; title?: string; text?: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  useEffect(() => { setExpandedId(activeSource?.id ?? null) }, [activeSource?.id])
  useEffect(() => {
    setPreview(null); setShowPreview(false); setSummary('')
  }, [expandedId])

  if (!activeSource) return null

  const expanded = sources.find((s) => s.id === expandedId) ?? null

  async function loadPreview(url: string) {
    setShowPreview(true)
    if (preview) return
    setPreviewLoading(true)
    try {
      // Visual screenshot first; fall back to extracted text if it fails.
      const shot = await fetch('/api/ai/screenshot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const shotData = await shot.json()
      if (shotData.ok && shotData.image) {
        setPreview({ image: shotData.image })
        return
      }
      const res = await fetch('/api/ai/read-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, draftSource: false }),
      })
      const data = await res.json()
      if (data.page?.text) {
        setPreview({ title: data.page.title || url, text: data.page.text })
      } else {
        toast.error(data.error || 'Could not preview this page')
        setShowPreview(false)
      }
    } catch {
      toast.error('Preview failed')
      setShowPreview(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function summarize(url: string) {
    if (!url) { toast.error('No URL for this source'); return }
    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/read-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, draftSource: false }),
      })
      const data = await res.json()
      if (!data.page?.text) { toast.error('Could not read this page'); return }
      const sumRes = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Summarize this page in 3-4 sentences:\n\n${data.page.text.slice(0, 3000)}` }] }),
      })
      const reader = sumRes.body?.getReader()
      const decoder = new TextDecoder()
      let result = ''
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (line.startsWith('data: ')) {
              const d = line.slice(6)
              if (d === '[DONE]') continue
              try { const p = JSON.parse(d); if (p.delta) result += p.delta } catch {}
            }
          }
        }
      }
      setSummary(result || 'Could not generate summary')
    } catch {
      toast.error('Summarize failed')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-background border-l border-border shadow-xl z-50 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="text-sm font-medium">Sources <span className="text-muted-foreground">{sources.length}</span></div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll">
          {sources.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No sources yet.</div>
          )}
          {sources.map((s, i) => {
            const open = expandedId === s.id
            return (
              <div key={s.id} className="border-b border-border/60">
                <button
                  onClick={() => setExpandedId(open ? null : s.id)}
                  className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-accent/40"
                >
                  <span className="text-[11px] tabular-nums text-muted-foreground mt-0.5 w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0 text-sm leading-snug line-clamp-2">{s.title || s.url || 'Untitled source'}</span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>

                {open && expanded && (
                  <div className="px-4 pb-4 pl-11 space-y-3">
                    {s.author && <p className="text-xs text-muted-foreground">by {s.author}</p>}
                    {s.citation && (
                      <p className="text-xs font-mono bg-muted/40 p-2 rounded border border-border/40">{s.citation}</p>
                    )}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= s.credibility ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1">{s.credibility}/5</span>
                    </div>

                    {s.url && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => loadPreview(s.url)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <Globe className="w-3.5 h-3.5" /> Preview page
                        </button>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-3.5 h-3.5" /> Open in browser
                        </a>
                      </div>
                    )}

                    {showPreview && (
                      <div className="rounded border border-border/60 bg-muted/20 overflow-hidden">
                        {previewLoading ? (
                          <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading preview…</div>
                        ) : preview?.image ? (
                          <div className="max-h-72 overflow-y-auto studio-scroll">
                            <img src={`data:image/png;base64,${preview.image}`} alt="Page preview" className="w-full" />
                          </div>
                        ) : preview?.text ? (
                          <div className="max-h-64 overflow-y-auto studio-scroll p-3">
                            <div className="text-xs font-medium mb-1.5">{preview.title}</div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{preview.text.slice(0, 2500)}{preview.text.length > 2500 ? '…' : ''}</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {s.url && (
                      <div>
                        <Button onClick={() => summarize(s.url)} disabled={summarizing} variant="outline" size="sm" className="w-full">
                          {summarizing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Summarizing…</> : <><Sparkles className="w-3 h-3 mr-1.5" /> AI summarize</>}
                        </Button>
                        {summary && <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/40 border border-border/40 rounded">{summary}</p>}
                      </div>
                    )}

                    {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
