'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ExternalLink, Sparkles, Send, Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'

interface SourceSidebarProps {
  source: {
    id: string
    title: string
    author: string
    url: string
    publisher: string
    publicationDate: string
    citation: string
    credibility: number
    notes: string
  } | null
  onClose: () => void
}

/**
 * Slide-in source sidebar.
 * Shows source citation, web page preview, AI summarize, and chat.
 */
export function SourceSidebar({ source, onClose }: SourceSidebarProps) {
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    setSummary('')
    setChatMessages([])
    setChatInput('')
  }, [source?.id])

  if (!source) return null

  async function handleSummarize() {
    if (!source?.url) {
      toast.error('No URL available for this source')
      return
    }
    setSummarizing(true)
    try {
      const res = await fetch('/api/ai/read-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: source.url, draftSource: false }),
      })
      const data = await res.json()
      if (data.page?.text) {
        // Use AI to summarize
        const summaryRes = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Summarize this web page in 3-4 sentences:\n\n${data.page.text.slice(0, 3000)}`
            }],
          }),
        })
        // Read the streaming response
        const reader = summaryRes.body?.getReader()
        const decoder = new TextDecoder()
        let result = ''
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value, { stream: true })
            const lines = text.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.delta) result += parsed.delta
                } catch {}
              }
            }
          }
        }
        setSummary(result || 'Could not generate summary')
      } else {
        toast.error('Could not read this URL')
      }
    } catch {
      toast.error('Summarization failed')
    } finally {
      setSummarizing(false)
    }
  }

  async function handleChat() {
    if (!chatInput.trim() || !source) return
    const userMsg = chatInput
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const context = `Source: ${source.title} by ${source.author}\nURL: ${source.url}\nCitation: ${source.citation}\nNotes: ${source.notes}`
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: `Context about this source:\n${context}\n\nQuestion: ${userMsg}` }
          ],
        }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let result = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.delta) result += parsed.delta
              } catch {}
            }
          }
        }
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: result || 'No response' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-background border-l border-border shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Source</div>
            <h3 className="font-semibold text-sm line-clamp-2">{source.title}</h3>
            {source.author && <p className="text-xs text-muted-foreground mt-1">by {source.author}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto studio-scroll p-4 space-y-4">
          {/* Citation */}
          {source.citation && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Citation</div>
              <p className="text-xs font-mono bg-muted/30 p-2 rounded border border-border/40">{source.citation}</p>
            </div>
          )}

          {/* Credibility */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Credibility</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={`w-4 h-4 ${n <= source.credibility ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-2">{source.credibility}/5</span>
            </div>
          </div>

          {/* URL */}
          {source.url && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Link</div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {source.url.length > 50 ? source.url.slice(0, 50) + '...' : source.url}
              </a>
            </div>
          )}

          {/* AI Summarize */}
          {source.url && (
            <div>
              <Button
                onClick={handleSummarize}
                disabled={summarizing}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {summarizing ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Summarizing...</>
                ) : (
                  <><Sparkles className="w-3 h-3 mr-1.5" /> AI Summarize page</>
                )}
              </Button>
              {summary && (
                <p className="text-xs text-muted-foreground mt-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded">{summary}</p>
              )}
            </div>
          )}

          {/* Chat */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Chat about this source</div>
            <div className="space-y-2 mb-2 max-h-48 overflow-y-auto studio-scroll">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-xs p-2 rounded ${msg.role === 'user' ? 'bg-primary/10 ml-4' : 'bg-muted/40 mr-4'}`}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleChat() }}
                placeholder="Ask about this source..."
                className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-background"
              />
              <Button onClick={handleChat} disabled={!chatInput.trim() || chatLoading} size="icon" className="h-8 w-8 shrink-0">
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          {source.notes && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
              <p className="text-xs text-muted-foreground italic">{source.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
