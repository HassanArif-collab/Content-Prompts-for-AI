'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineEditor } from './InlineEditor'
import { AssetDock } from './AssetDock'
import { GripVertical, Copy, Check, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Shot {
  id: string
  archetype: string
  duration: number
  visual: string
  motion: string
  textOverlay?: string
  narration: string
  asset?: {
    capability?: string
    prompt?: string
    status?: string
    path?: string
  }
  pipeline?: { step: string; tool: string; prompt: string; note?: string }[]
  presenter?: { appears?: boolean; note?: string }
  highlight?: boolean
}

interface ShotBlockProps {
  shot: Shot
  index: number
  onUpdate: (field: string, value: string | number) => void
  onRenderPreview?: () => void
  rendering?: boolean
  previewImage?: string
  remotionCode?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      {children}
    </div>
  )
}

export function ShotBlock({
  shot, index, onUpdate, onRenderPreview, rendering, previewImage, remotionCode,
}: ShotBlockProps) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  async function copyCode() {
    if (!remotionCode) return
    await navigator.clipboard.writeText(remotionCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
    toast.success('Code copied')
  }

  const status = shot.asset?.status
  const statusClass = status === 'failed'
    ? 'bg-muted text-destructive'
    : 'bg-muted text-muted-foreground'

  return (
    <div className="border border-border/60 rounded-xl bg-card overflow-hidden group">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/20">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-xs text-muted-foreground tabular-nums font-mono">SHOT {String(index + 1).padStart(2, '0')}</span>
        <Badge variant="outline" className="text-[10px] uppercase">{shot.archetype}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">{shot.duration}s</span>
        {shot.presenter?.appears && <Badge variant="outline" className="text-[10px] uppercase">Presenter</Badge>}
        {shot.highlight && <Badge variant="outline" className="text-[10px] uppercase">Overlay</Badge>}
        <div className="flex-1" />
        {status && <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusClass}`}>{status}</span>}
      </div>

      {/* Asset hero — large, full width */}
      <div className="p-4 space-y-4">
        <AssetDock
          animationCode={remotionCode}
          imageBase64={previewImage}
          videoPath={shot.asset?.path}
          assetStatus={shot.asset?.status as 'pending' | 'generating' | 'ready' | 'failed' | undefined}
          pipeline={shot.pipeline}
          shotId={shot.id}
          shotArchetype={shot.archetype}
        />

        {onRenderPreview && (
          <Button onClick={onRenderPreview} disabled={rendering} size="sm" variant="outline" className="w-full">
            {rendering ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Rendering…</> : <><Sparkles className="w-3 h-3 mr-1.5" /> Render preview</>}
          </Button>
        )}

        {/* Details — inline editable, two columns on wider shots */}
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Visual">
            <InlineEditor value={shot.visual} onSave={(v) => onUpdate('visual', v)} multiline className="text-sm" placeholder="What appears on screen…" />
          </Field>
          <Field label="Motion">
            <InlineEditor value={shot.motion} onSave={(v) => onUpdate('motion', v)} className="text-sm" placeholder="How it moves…" />
          </Field>
          {shot.textOverlay !== undefined && (
            <Field label="Text overlay">
              <InlineEditor value={shot.textOverlay} onSave={(v) => onUpdate('textOverlay', v)} className="text-sm" placeholder="Text shown on screen…" />
            </Field>
          )}
          <div className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Narration</div>
            <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-2">{shot.narration || 'No narration'}</div>
          </div>
        </div>

        {/* Remotion / animation code */}
        {remotionCode && (
          <div>
            <button onClick={() => setShowCode(!showCode)} className="text-xs text-muted-foreground hover:text-foreground">
              {showCode ? 'Hide' : 'Show'} code
            </button>
            {showCode && (
              <div className="relative mt-1">
                <pre className="text-[10px] font-mono p-2 rounded bg-muted/40 border border-border/40 max-h-40 overflow-auto studio-scroll"><code>{remotionCode}</code></pre>
                <button onClick={copyCode} className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-muted">
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
