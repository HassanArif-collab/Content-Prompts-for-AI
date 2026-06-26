'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Globe, Loader2, Copy, X, Check, AlertCircle, RefreshCw,
} from 'lucide-react'

interface TunnelStatus {
  running: boolean
  url: string | null
  startedAt: string | null
  error: string | null
}

export function TunnelBanner() {
  const [status, setStatus] = useState<TunnelStatus>({ running: false, url: null, startedAt: null, error: null })
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/tunnel/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  async function startTunnel() {
    setStarting(true)
    try {
      const res = await fetch('/api/tunnel/start', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        setStatus({ running: true, url: data.url, startedAt: new Date().toISOString(), error: null })
        toast.success('Public URL ready!', { description: data.url })
        await navigator.clipboard.writeText(data.url)
      } else {
        toast.error('Could not start tunnel', { description: data.error ?? 'unknown error' })
      }
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start tunnel')
    } finally {
      setStarting(false)
    }
  }

  async function stopTunnel() {
    try {
      await fetch('/api/tunnel/stop', { method: 'POST' })
      setStatus({ running: false, url: null, startedAt: null, error: null })
      toast.success('Tunnel stopped')
    } catch {
      toast.error('Failed to stop tunnel')
    }
  }

  async function copyUrl() {
    if (!status.url) return
    await navigator.clipboard.writeText(status.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('URL copied — paste it in your AI chat')
  }

  // Don't render if dismissed and not running
  if (dismissed && !status.running) return null

  // Running with URL — show the URL prominently
  if (status.running && status.url) {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Public URL:</span>
          <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 truncate">{status.url}</code>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copyUrl}>
            {copied ? <Check className="w-3 h-3 mr-1 text-emerald-500" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={stopTunnel}>
            <X className="w-3 h-3 mr-1" /> Stop
          </Button>
        </div>
      </div>
    )
  }

  // Starting
  if (starting || (status.running && !status.url)) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 shrink-0">
        <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
        <span className="text-xs text-amber-700 dark:text-amber-300">Starting Cloudflare tunnel…</span>
      </div>
    )
  }

  // Not running — show CTA
  return (
    <div className="bg-muted/40 border-b border-border/60 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">Want your AI chat to push to this app?</strong>{' '}
          Start a public tunnel — no terminal needed.
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startTunnel} disabled={starting}>
          <Globe className="w-3 h-3 mr-1.5" /> Start tunnel
        </Button>
      </div>
    </div>
  )
}
