'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Sparkles, Send, Bot, User, Loader2, Trash2, Lightbulb,
  FileText, Search, Clapperboard, Wand2, X, Globe,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantProps {
  projectId: string
  projectTitle: string
}

const QUICK_PROMPTS = [
  { icon: Lightbulb, label: 'Sharpen my thesis', prompt: 'Read my project context. What is the current thesis of this documentary, and how could I sharpen it in one sentence?' },
  { icon: FileText, label: 'Suggest a hook', prompt: 'Suggest three distinct cold-open hooks for this documentary. Each should be under 60 words and use a different opening strategy (visual, archival, interview, etc.).' },
  { icon: Search, label: 'What should I research next?', prompt: 'Based on my current research notes and sources, what are the three biggest gaps in my research? Be specific — name people, archives, or documents I should look for.' },
  { icon: Clapperboard, label: 'Critique my scene order', prompt: 'Review my scene list. Is the narrative arc working? Are there structural problems — slow opens, missing transitions, repetitive beats? Give me concrete recommendations.' },
]

const BROWSE_PROMPT = { icon: Globe, label: 'Browse a website', prompt: 'I want you to browse a specific website for me. Ask me which URL, then open it with the browser tool and tell me what you find.' }

export function AiAssistant({ projectId, projectTitle }: AssistantProps) {
  const [open, setOpen] = useState(true) // open by default — sidebar lives in layout
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'request failed' }))
        throw new Error(err.error || 'Chat failed')
      }

      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
          const data = trimmedLine.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.delta) {
              assistantContent += parsed.delta
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: assistantContent }
                return copy
              })
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      if (!assistantContent) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: '(No response received. Please try again.)' }
          return copy
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message !== 'The user aborted a request.') {
        toast.error(`AI error: ${message}`)
        setMessages(prev => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && !copy[copy.length - 1].content) {
            copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${message}` }
          }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, streaming, projectId])

  function stop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function clear() {
    if (streaming) return
    setMessages([])
  }

  // Collapsed state: thin vertical strip with an expand button
  if (!open) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-start py-3 border-l border-border/60 bg-muted/20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(true)}
                className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20"
              >
                <PanelRightOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Open AI Co-pilot</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="mt-3 [writing-mode:vertical-rl] rotate-180 text-xs text-muted-foreground tracking-wider">AI CO-PILOT</div>
      </div>
    )
  }

  // Expanded state: inline sidebar panel (NOT an overlay — lives in flex layout)
  return (
    <div className="flex flex-col h-full w-full bg-background border-l border-border/60">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 bg-gradient-to-r from-amber-500/10 to-orange-500/5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-editorial text-sm font-semibold leading-tight">AI Co-pilot</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground block max-w-[180px] truncate">{projectTitle}</span>
                </TooltipTrigger>
                <TooltipContent>{projectTitle}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && !streaming && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clear}>
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <PanelRightClose className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto studio-scroll p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <EmptyState onPick={(p) => send(p)} />
        ) : (
          messages.map((m, i) => (
            <MessageBubble key={i} message={m} streaming={streaming && i === messages.length - 1} />
          ))
        )}
      </div>

      {/* Quick prompts */}
      {messages.length > 0 && (
        <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto studio-scroll shrink-0">
          {QUICK_PROMPTS.map(q => (
            <button
              key={q.label}
              onClick={() => send(q.prompt)}
              disabled={streaming}
              className="shrink-0 text-xs px-2.5 py-1.5 rounded-md border border-border/60 bg-background hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <q.icon className="w-3 h-3 text-amber-500" />
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border/60 bg-background shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI co-pilot anything about this documentary…"
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
          />
          {streaming ? (
            <Button onClick={stop} variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => send(input)} disabled={!input.trim()} size="icon" className="h-10 w-10 shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          AI sees your full project context. Enter to send · Shift+Enter for newline.
        </p>
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center mb-4">
        <Wand2 className="w-7 h-7 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="font-editorial text-lg font-semibold mb-1.5">Your AI co-pilot</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        I have full context on your documentary — script, scenes, sources, research notes. Ask me anything, or start with one of these:
      </p>
      <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
        {QUICK_PROMPTS.map(q => (
          <button
            key={q.label}
            onClick={() => onPick(q.prompt)}
            className="text-left p-3 rounded-lg border border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all flex items-start gap-2.5"
          >
            <div className="w-7 h-7 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
              <q.icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{q.label}</div>
            </div>
          </button>
        ))}
        <button
          onClick={() => onPick(BROWSE_PROMPT.prompt)}
          className="text-left p-3 rounded-lg border border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 transition-all flex items-start gap-2.5"
        >
          <div className="w-7 h-7 rounded-md bg-sky-500/20 flex items-center justify-center shrink-0">
            <BROWSE_PROMPT.icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{BROWSE_PROMPT.label}</div>
            <div className="text-xs text-muted-foreground">AI opens a real Playwright browser — for ChatGPT, Google Flow, Dreamina, archives</div>
          </div>
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ message, streaming }: { message: Message; streaming: boolean }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center ${isUser ? 'bg-muted' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
        {isUser ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-sm leading-relaxed text-left rounded-lg px-3.5 py-2.5 max-w-[90%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/60 border border-border/40'}`}>
          {message.content ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : streaming ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Thinking…</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
