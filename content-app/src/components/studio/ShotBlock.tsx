'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineEditor } from './InlineEditor'
import { AssetDock } from './AssetDock'
import {
  GripVertical, MoreHorizontal, Copy, Check,
  Sparkles, Loader2,
} from 'lucide-react'
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

const ARCHETYPE_COLORS: Record<string, string> = {
  SECTION_TITLE_CARD: 'bg-muted text-muted-foreground',
  STAT_COUNTER: 'bg-muted text-muted-foreground',
  BAR_CHART: 'bg-muted text-muted-foreground',
  LINE_GRAPH: 'bg-muted text-muted-foreground',
  PIE_CHART: 'bg-muted text-muted-foreground',
  FLOW_DIAGRAM: 'bg-muted text-muted-foreground',
  SCREENSHOT_HIGHLIGHT: 'bg-muted text-muted-foreground',
  DOC_HIGHLIGHT: 'bg-muted text-muted-foreground',
  EMOTIONAL_MOMENT: 'bg-muted text-muted-foreground',
  BROLL_VIDEO: 'bg-muted text-muted-foreground',
  TEXT_ANNOTATION: 'bg-muted text-muted-foreground',
  GSAP_METAPHOR: 'bg-muted text-muted-foreground',
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

  return (
    <div className="border border-border/60 rounded-lg bg-card overflow-hidden group">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/20">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-xs text-muted-foreground tabular-nums font-mono">SHOT {String(index + 1).padStart(2, '0')}</span>
        <Badge variant="outline" className="text-[10px] uppercase">{shot.archetype}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">{shot.duration}s</span>
        <div className="flex-1" />
        {shot.asset?.status && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            shot.asset.status === 'ready' || shot.asset.status === 'generated' ? 'bg-emerald-500/10 text-emerald-600' :
            shot.asset.status === 'generating' ? 'bg-amber-500/10 text-amber-600' :
            shot.asset.status === 'failed' ? 'bg-rose-500/10 text-rose-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {shot.asset.status}
          </span>
        )}
      </div>

      {/* Body — two columns side by side */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Shot details (inline editable) */}
        <div className="p-4 space-y-2.5 border-r border-border/40">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Visual</label>
            <InlineEditor value={shot.visual} onSave={(v) => onUpdate('visual', v)} multiline className="text-sm" placeholder="What appears on screen..." />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Motion</label>
            <InlineEditor value={shot.motion} onSave={(v) => onUpdate('motion', v)} className="text-sm" placeholder="How it moves..." />
          </div>
          {shot.textOverlay && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Text Overlay</label>
              <InlineEditor value={shot.textOverlay} onSave={(v) => onUpdate('textOverlay', v)} className="text-sm" placeholder="Text shown on screen..." />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Narration</label>
            <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-2">{shot.narration || 'No narration'}</div>
          </div>
          {/* Remotion code */}
          {remotionCode && (
            <div>
              <button onClick={() => setShowCode(!showCode)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {showCode ? 'Hide' : 'Show'} code
              </button>
              {showCode && (
                <div className="relative mt-1">
                  <pre className="text-[10px] font-mono p-2 rounded bg-muted/40 border border-border/40 max-h-32 overflow-auto studio-scroll">
                    <code>{remotionCode}</code>
                  </pre>
                  <button onClick={copyCode} className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-muted">
                    {codeCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: AssetDock + Preview */}
        <div className="p-4 space-y-3">
          <AssetDock
            animationCode={remotionCode}
            imageBase64={previewImage}
            videoPath={shot.asset?.path}
            assetStatus={shot.asset?.status as any}
            shotId={shot.id}
            shotArchetype={shot.archetype}
          />
          {onRenderPreview && (
            <Button onClick={onRenderPreview} disabled={rendering} size="sm" variant="outline" className="w-full">
              {rendering ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Rendering...</> : <><Sparkles className="w-3 h-3 mr-1" /> Render Preview</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
