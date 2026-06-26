'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Cloud, HardDrive, Loader2, RefreshCw, Check, X, Globe } from 'lucide-react'

interface AiSettings {
  provider: 'zai' | 'ollama'
  ollamaUrl: string
  ollamaModel: string
  browsingEnabled: boolean
}

export function AiSettingsDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaError, setOllamaError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/ai/settings')
      .then(r => r.json())
      .then(s => { setSettings(s); setLoading(false) })
      .catch(() => { toast.error('Failed to load AI settings'); setLoading(false) })
  }, [open])

  async function checkOllama() {
    if (!settings?.ollamaUrl) return
    setOllamaStatus('checking')
    setOllamaError('')
    setOllamaModels([])
    try {
      const res = await fetch('/api/ai/ollama-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: settings.ollamaUrl }),
      })
      const data = await res.json()
      if (data.ok) {
        setOllamaStatus('ok')
        setOllamaModels(data.models ?? [])
        if (data.models?.length > 0 && !data.models.includes(settings.ollamaModel)) {
          setSettings({ ...settings, ollamaModel: data.models[0] })
        }
      } else {
        setOllamaStatus('fail')
        setOllamaError(data.error || 'Connection failed')
      }
    } catch (err) {
      setOllamaStatus('fail')
      setOllamaError(err instanceof Error ? err.message : 'failed')
    }
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(`AI provider: ${settings.provider === 'ollama' ? 'Ollama (local)' : 'ZAI (cloud)'}`)
      onOpenChange(false)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto studio-scroll">
        <DialogHeader>
          <DialogTitle className="font-editorial">AI provider settings</DialogTitle>
        </DialogHeader>

        {loading || !settings ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Provider picker */}
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, provider: 'zai' })}
                  className={`p-3 rounded-lg border text-left transition-all ${settings.provider === 'zai' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/40' : 'border-border hover:bg-muted/40'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">ZAI (cloud)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">GLM-4 + image gen + web search. No setup.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, provider: 'ollama' })}
                  className={`p-3 rounded-lg border text-left transition-all ${settings.provider === 'ollama' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/40' : 'border-border hover:bg-muted/40'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">Ollama (local)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Runs on your PC. No cloud, no API costs.</p>
                </button>
              </div>
            </div>

            {/* Ollama config */}
            {settings.provider === 'ollama' && (
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="ollama-url">Ollama URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ollama-url"
                      value={settings.ollamaUrl}
                      onChange={(e) => { setSettings({ ...settings, ollamaUrl: e.target.value }); setOllamaStatus('idle') }}
                      placeholder="http://localhost:11434"
                    />
                    <Button onClick={checkOllama} disabled={ollamaStatus === 'checking'} variant="outline" size="sm">
                      {ollamaStatus === 'checking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline">ollama.com</a>, then run <code className="bg-muted px-1 rounded">ollama serve</code> and <code className="bg-muted px-1 rounded">ollama pull llama3.1</code>.
                  </p>
                </div>

                {/* Status */}
                {ollamaStatus === 'ok' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <Check className="w-3.5 h-3.5" /> Connected — {ollamaModels.length} models available
                  </div>
                )}
                {ollamaStatus === 'fail' && (
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <X className="w-3.5 h-3.5 mt-0.5" />
                    <div>
                      <div>Cannot reach Ollama</div>
                      <div className="opacity-70">{ollamaError}</div>
                      <div className="opacity-70 mt-1">If you haven&apos;t installed it yet, see the link above. Cloud (ZAI) is the default fallback.</div>
                    </div>
                  </div>
                )}

                {/* Model picker */}
                <div className="space-y-1.5">
                  <Label htmlFor="ollama-model">Model</Label>
                  {ollamaModels.length > 0 ? (
                    <select
                      id="ollama-model"
                      value={settings.ollamaModel}
                      onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <Input
                      id="ollama-model"
                      value={settings.ollamaModel}
                      onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                      placeholder="llama3.1"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recommended: llama3.1 (8B), qwen2.5 (7B), or mistral (7B) for general writing tasks.
                  </p>
                </div>

                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                  <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Ollama doesn&apos;t have image generation or built-in web search. Those features will fall back to ZAI cloud when you&apos;re in Ollama mode. The browser tool below still works.
                  </span>
                </div>
              </div>
            )}

            {/* Browsing tool */}
            <div className="space-y-2 p-4 rounded-lg border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-500" /> Browser automation
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Let the AI drive a real Playwright browser (ChatGPT, Google Flow, Dreamina, archives).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, browsingEnabled: !settings.browsingEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.browsingEnabled ? 'bg-amber-500' : 'bg-muted'}`}
                  aria-label="Toggle browsing"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.browsingEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {settings.browsingEnabled && (
                <Badge variant="outline" className="text-[10px] uppercase">Playwright via agent-browser</Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
              <strong>Current provider:</strong>{' '}
              {settings.provider === 'ollama' ? 'Ollama (local) — ' + settings.ollamaModel : 'ZAI cloud (GLM-4)'}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !settings}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
