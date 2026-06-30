'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ExternalLink, Sparkles, Loader2, Star, Globe, AlertCircle } from 'lucide-react'
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
  activeSource: Source | null
  onClose: () => void
}

/**
 * In-flow source panel (rendered as a middle column by project-workspace, not an
 * overlay). Shows one source: title/author, citation, credibility, link, an
 * optional page preview, and an AI summary. Calm, no extra chrome.
 */
export function SourceSidebar({ activeSource, onClose }: SourceSidebarProps) {
  const [preview, setPreview] = useState<{ image?: string; title?: string; text?: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  // Reset transient state whenever a different source opens.
  useEffect(() => {
    setPreview(null); setShowPreview(false); setPreviewError(false); setSummary('')
  }, [activeSource?.id])

  if (!activeSource) return null
  const s = activeSource

  async function togglePreview(url: string) {
    if (showPreview) { setShowPreview(false); return }
    setShowPreview(true); setPreviewError(false)
    if (preview) return // already loaded
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
        setPreviewError(true)
      }
    } catch {
      toast.error('Preview failed')
      setPreviewError(true)
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
      if (!data.page?.text) { toast.error(data.error || 'Could not read this page'); return }
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
    <div className="border-l border-border bg-background h-full overflow-y-auto studio-scroll">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-background z-10">
        <div className="min-w-0">
          <h3 className="text-sm font-medium leading-snug">{s.title || s.url || 'Untitled source'}</h3>
          {s.author && <p className="text-xs text-muted-foreground mt-0.5">by {s.author}</p>}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent shrink-0" aria-label="Close source panel">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {s.citation && (
          <p className="text-xs font-mono bg-muted/40 p-2 rounded border border-border/60 leading-relaxed">{s.citation}</p>
        )}

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`w-3.5 h-3.5 ${n <= s.credibility ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
          ))}
          <span className="text-[11px] text-muted-foreground ml-1">{s.credibility}/5</span>
        </div>

        {s.url && (
          <div className="flex items-center gap-3">
            <button onClick={() => togglePreview(s.url)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Globe className="w-3.5 h-3.5" /> {showPreview ? 'Hide preview' : 'Preview page'}
            </button>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        )}

        {showPreview && (
          <div className="rounded border border-border/60 bg-muted/20 overflow-hidden">
            {previewLoading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading preview…</div>
            ) : previewError ? (
              <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" /> Couldn’t preview this page.</div>
            ) : preview?.image ? (
              <div className="max-h-80 overflow-y-auto studio-scroll">
                <img src={`data:image/png;base64,${preview.image}`} alt="Page preview" className="w-full" />
              </div>
            ) : preview?.text ? (
              <div className="max-h-72 overflow-y-auto studio-scroll p-3">
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
            {summary && <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/40 border border-border/60 rounded leading-relaxed">{summary}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
