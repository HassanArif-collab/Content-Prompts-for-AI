// AI library — provider-agnostic helpers.
// Two providers: ZAI (cloud, default) and Ollama (local, http://localhost:11434).
// Provider choice is read from a settings file (no DB migration).
// Ollama speaks plain HTTP/JSON — no SDK, just fetch (pattern from EditFlowAI's provider_service.py).

import ZAI from 'z-ai-web-dev-sdk'
import { promises as fs } from 'fs'
import path from 'path'
import type { Project } from '@/components/studio/project-workspace'

// ─── Settings persistence (ponytail: JSON file, no DB schema change) ──────────

const SETTINGS_PATH = path.join(process.cwd(), '.ai-settings.json')

export interface AiSettings {
  provider: 'zai' | 'ollama'
  ollamaUrl: string
  ollamaModel: string
  // Whether the AI co-pilot can drive the browser via agent-browser
  browsingEnabled: boolean
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'ollama',  // Ollama is the default — no cloud dependency
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  browsingEnabled: true,
}

let _settingsCache: AiSettings | null = null

export async function getSettings(): Promise<AiSettings> {
  if (_settingsCache) return _settingsCache
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8')
    _settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    _settingsCache = DEFAULT_SETTINGS
  }
  return _settingsCache
}

export async function saveSettings(s: AiSettings): Promise<void> {
  _settingsCache = s
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf8')
}

// ─── ZAI singleton ────────────────────────────────────────────────────────────

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

export async function getAI() {
  if (!_zai) {
    try {
      _zai = await ZAI.create()
    } catch {
      throw new Error(
        'Cloud AI (GLM-4) is not available on this machine. ' +
        'Open "AI provider" → switch to Ollama (local) to run AI on your PC, ' +
        'or use this app in the Z.ai sandbox where cloud AI is pre-configured.'
      )
    }
  }
  return _zai
}

// ─── Project context builder ──────────────────────────────────────────────────

export function buildProjectContext(project: Project): string {
  const totalScriptWords = project.scriptSections.reduce(
    (s, sec) => s + (sec.content.trim() ? sec.content.trim().split(/\s+/).length : 0), 0
  )
  return [
    `PROJECT: ${project.title}`,
    project.logline ? `LOGLINE: ${project.logline}` : '',
    project.description ? `DESCRIPTION: ${project.description}` : '',
    `STATUS: ${project.status}`,
    `TARGET RUNTIME: ${project.targetRuntime} min`,
    `NARRATION SPEED: ${project.narrationWpm} wpm`,
    `STATS: ${project.researchNotes.length} notes, ${project.sources.length} sources, ${project.scenes.length} scenes, ${project.scriptSections.length} script sections, ${totalScriptWords} total script words`,
    '',
    'SCRIPT OUTLINE:',
    ...project.scriptSections
      .sort((a, b) => a.order - b.order)
      .map(s => `  - [${s.type}] ${s.heading} (${s.content.trim().split(/\s+/).filter(Boolean).length} words)`),
    '',
    'SCENES:',
    ...project.scenes
      .sort((a, b) => a.order - b.order)
      .map(s => `  - Scene ${s.order + 1}: ${s.title} [${s.shotType}, ${s.duration}s, ${s.status}]${s.location ? ' @ ' + s.location : ''}`),
    '',
    'RECENT RESEARCH NOTES:',
    ...project.researchNotes
      .slice(0, 8)
      .map(n => `  - [${n.category}] ${n.title}${n.pinned ? ' (PINNED)' : ''}`),
    '',
    'SOURCES IN LIBRARY:',
    ...project.sources
      .slice(0, 10)
      .map(s => `  - [${s.type}] ${s.title}${s.author ? ' — ' + s.author : ''} (credibility ${s.credibility}/5)`),
  ].filter(Boolean).join('\n')
}

// ─── Chat (non-streaming) ─────────────────────────────────────────────────────
// Dispatches to ZAI or Ollama based on settings.

export async function chat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { thinking?: boolean } = {}
): Promise<string> {
  const settings = await getSettings()
  if (settings.provider === 'ollama') {
    return ollamaChat(messages, settings)
  }
  const zai = await getAI()
  const completion = await zai.chat.completions.create({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    thinking: { type: options.thinking ? 'enabled' : 'disabled' },
  } as Parameters<typeof zai.chat.completions.create>[0])
  return completion.choices[0]?.message?.content ?? ''
}

// ─── Ollama chat ──────────────────────────────────────────────────────────────
// Direct HTTP to Ollama's /api/chat. Pattern lifted from EditFlowAI's
// provider_service._ollama_chat. Returns plain content string.

async function ollamaChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  settings: AiSettings
): Promise<string> {
  const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/chat'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      keep_alive: '30m', // keep model resident, matches EditFlowAI default
    }),
    // 180s matches EditFlowAI: enough for cold-load + first-token on a 4B model on CPU
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200) || res.statusText}`)
  }
  const data = await res.json() as { message?: { content?: string }; error?: string }
  if (data.error) throw new Error(`Ollama: ${data.error}`)
  return data.message?.content ?? ''
}

// ─── Streaming chat (returns an async iterable of PARSED content deltas) ─────
// Both providers yield plain content strings here — SSE/NDJSON parsing is hidden.

export async function* streamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { thinking?: boolean } = {}
): AsyncGenerator<string> {
  const settings = await getSettings()
  if (settings.provider === 'ollama') {
    yield* ollamaStream(messages, settings)
    return
  }
  // ZAI path — SDK returns array-like char-code chunks; reconstruct + parse SSE
  const zai = await getAI()
  const stream = await zai.chat.completions.create({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    thinking: { type: options.thinking ? 'enabled' : 'disabled' },
    stream: true,
  } as Parameters<typeof zai.chat.completions.create>[0]) as unknown as AsyncIterable<unknown>

  let buffer = ''
  for await (const chunk of stream) {
    // Reconstruct the chunk into a string
    let text: string
    if (typeof chunk === 'string') {
      text = chunk
    } else if (chunk && typeof chunk === 'object') {
      if ('choices' in chunk) {
        const c = chunk as { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }> }
        const delta = c.choices?.[0]?.delta?.content ?? c.choices?.[0]?.message?.content
        if (delta) yield delta
        continue
      } else if (typeof (chunk as { length?: number }).length === 'number') {
        const arr = Array.from(chunk as ArrayLike<number>)
        let s = ''
        const CHUNK = 8192
        for (let i = 0; i < arr.length; i += CHUNK) {
          s += String.fromCharCode(...arr.slice(i, i + CHUNK))
        }
        text = s
      } else {
        text = JSON.stringify(chunk)
      }
    } else {
      text = String(chunk ?? '')
    }

    buffer += text
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const data = t.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
          ?? parsed.choices?.[0]?.message?.content
          ?? parsed.delta?.content
        if (delta) yield delta
      } catch {
        // partial JSON, ignore
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim().startsWith('data:')) {
    const data = buffer.trim().slice(5).trim()
    if (data && data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
          ?? parsed.choices?.[0]?.message?.content
        if (delta) yield delta
      } catch {
        // ignore
      }
    }
  }
}

async function* ollamaStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  settings: AiSettings
): AsyncGenerator<string> {
  const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/chat'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }),
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok || !res.body) {
    throw new Error(`Ollama ${res.status}: ${res.statusText}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const obj = JSON.parse(trimmed) as { message?: { content?: string }; error?: string; done?: boolean }
        if (obj.error) throw new Error(`Ollama: ${obj.error}`)
        if (obj.message?.content) yield obj.message.content
      } catch (err) {
        // Re-throw real errors, swallow partial JSON
        if (err instanceof Error && err.message.startsWith('Ollama:')) throw err
      }
    }
  }
}

// ─── Web search (ZAI only — Ollama has no built-in search) ────────────────────

export interface SearchResult {
  title: string
  url: string
  snippet: string
  date?: string
}

export async function webSearch(query: string, num = 8): Promise<SearchResult[]> {
  const zai = await getAI()
  try {
    const res = await zai.functions.invoke('web_search', { query, num })
    const data = (res as { data?: unknown }).data ?? res
    if (Array.isArray(data)) {
      return (data as Array<Record<string, unknown>>).map(item => ({
        title: String(item.title ?? item.name ?? ''),
        url: String(item.url ?? item.link ?? item.href ?? ''),
        snippet: String(item.snippet ?? item.summary ?? item.description ?? ''),
        date: item.date ? String(item.date) : undefined,
      }))
    }
    return []
  } catch {
    return []
  }
}

// ─── URL reader (ZAI only — Ollama falls back to /api/ai/browse via agent-browser) ─

export interface PageContent {
  title: string
  url: string
  text: string
  publishedTime?: string
}

export async function readUrl(url: string): Promise<PageContent | null> {
  const zai = await getAI()
  try {
    const res = await zai.functions.invoke('page_reader', { url })
    const data = (res as { data?: Record<string, unknown> }).data
    if (!data) return null
    const html = String(data.html ?? '')
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      title: String(data.title ?? ''),
      url: String(data.url ?? url),
      text: text.slice(0, 8000),
      publishedTime: data.publishedTime ? String(data.publishedTime) : undefined,
    }
  } catch {
    return null
  }
}

// ─── Image generation (ZAI only — Ollama has no image model) ──────────────────

export async function generateImage(prompt: string, size: '1024x1024' | '1344x768' | '768x1344' = '1344x768'): Promise<string | null> {
  const zai = await getAI()
  try {
    const res = await zai.images.generations.create({ prompt, size })
    return res.data?.[0]?.base64 ?? null
  } catch {
    return null
  }
}
