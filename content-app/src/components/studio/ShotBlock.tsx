'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineEditor } from './InlineEditor'
import { AssetDock } from './AssetDock'
import {
  GripVertical, MoreHorizontal, Play, Copy, Check,
  Sparkles, Loader2, Image as ImageIcon, Video,
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
  SECTION_TITLE_CARD: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  STAT_COUNTER: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  BAR_CHART: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  LINE_GRAPH: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  PIE_CHART: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  FLOW_DIAGRAM: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  SCREENSHOT_HIGHLIGHT: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  DOC_HIGHLIGHT: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  EMOTIONAL_MOMENT: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  BROLL_VIDEO: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  TEXT_ANNOTATION: 'bg-muted text-muted-foreground',
  GSAP_METAPHOR: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Loader2 className="w-3 h-3 animate-spin" />,
  generating: <Loader2 className="w-3 h-3 animate-spin" />,
  ready: <Check className="w-3 h-3 text-emerald-500" />,
  generated: <Check className="w-3 h-3 text-emerald-500" />,
  failed: <span className="text-destructive text-xs">!</span>,
}

export function ShotBlock({
  shot,
  index,
  onUpdate,
  onRenderPreview,
  rendering,
  previewImage,
  remotionCode,
}: ShotBlockProps) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const archetypeColor = ARCHETYPE_COLORS[shot.archetype] || 'bg-muted text-muted-foreground'
  const hasRemotion = !!remotionCode
  const hasPreview = !!previewImage
  const isVideoAsset = shot.asset?.capability?.includes('video') || shot.asset?.capability?.includes('multiframes')

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
        <Badge variant="outline" className={`text-[10px] uppercase ${archetypeColor}`}>{shot.archetype}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">{shot.duration}s</span>
        <div className="flex-1" />
        {shot.asset?.status && (
          <Badge variant="outline" className="text-[10px] uppercase flex items-center gap-1">
            {STATUS_ICONS[shot.asset.status] || null}
            {shot.asset.status}
          </Badge>
        )}
        <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Body - two columns side by side */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Shot details */}
        <div className="p-4 space-y-2.5 border-r border-border/40">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Visual</label>
            <InlineEditor
              value={shot.visual}
              onSave={(v) => onUpdate('visual', v)}
              multiline
              className="text-sm"
              placeholder="What appears on screen..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Motion</label>
            <InlineEditor
              value={shot.motion}
              onSave={(v) => onUpdate('motion', v)}
              className="text-sm"
              placeholder="How it moves..."
            />
          </div>
          {shot.textOverlay && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Text Overlay</label>
              <InlineEditor
                value={shot.textOverlay}
                onSave={(v) => onUpdate('textOverlay', v)}
                className="text-sm"
                placeholder="Text shown on screen..."
              />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Narration</label>
            <div className="text-sm text-muted-foreground italic border-l-2 border-amber-500/40 pl-2">
              {shot.narration || 'No narration'}
            </div>
          </div>
        </div>

        {/* Right: Asset + Preview */}
        <div className="p-4 space-y-3">
          {/* Asset panel */}
          {shot.asset?.capability && (
            <div className="p-2.5 rounded-md bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2 mb-1.5">
                {isVideoAsset ? <Video className="w-3.5 h-3.5 text-muted-foreground" /> : <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium">{shot.asset.capability}</span>
              </div>
              {shot.asset.prompt && (
                <p className="text-xs text-muted-foreground line-clamp-2">{shot.asset.prompt}</p>
              )}
            </div>
          )}

          {/* Remotion code */}
          {hasRemotion && (
            <div>
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showCode ? 'Hide' : 'Show'} Remotion code
              </button>
              {showCode && (
                <div className="relative mt-1">
                  <pre className="text-[10px] font-mono p-2 rounded bg-muted/40 border border-border/40 max-h-32 overflow-auto studio-scroll">
                    <code>{remotionCode}</code>
                  </pre>
                  <button
                    onClick={copyCode}
                    className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-muted"
                  >
                    {codeCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          <div className="rounded-md overflow-hidden border border-border/40 bg-muted/10 min-h-[120px] flex items-center justify-center">
            {previewImage ? (
              <img src={previewImage.startsWith('data:') ? previewImage : `data:image/png;base64,${previewImage}`} alt="Preview" className="w-full" />
            ) : rendering ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs text-muted-foreground">Rendering...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <Play className="w-6 h-6 text-muted-foreground/30" />
                <span className="text-xs text-muted-foreground/50">No preview yet</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onRenderPreview && (
              <Button onClick={onRenderPreview} disabled={rendering} size="sm" variant="outline" className="flex-1">
                {rendering ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Render Preview
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
