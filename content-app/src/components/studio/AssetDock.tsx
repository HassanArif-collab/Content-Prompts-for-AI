'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Image as ImageIcon, Video, Loader2, Copy, Check, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface PipelineStep { step: string; tool: string; prompt: string; note?: string }

interface AssetDockProps {
  // For live animations (Remotion/HTML/GSAP code)
  animationCode?: string
  // For AI-generated images (base64 or URL)
  imageBase64?: string
  imageUrl?: string
  // For AI-generated videos (file path served via /api/assets)
  videoPath?: string
  // Asset status
  assetStatus?: 'pending' | 'generating' | 'ready' | 'failed'
  // How this shot's asset gets made (image → animate → edit), shown to the user
  pipeline?: PipelineStep[]
  // Attach a manually-generated asset (upload) to this shot
  onAttached?: (filePath: string, kind: 'image' | 'video') => void
  // Shot info
  shotId: string
  shotArchetype: string
}

const STEP_LABEL: Record<string, string> = {
  image: 'Image', image_final: 'Final image', animate: 'Animate', edit: 'Edit',
}

export function AssetDock({ animationCode, imageBase64, imageUrl, videoPath, assetStatus, pipeline, onAttached, shotId, shotArchetype }: AssetDockProps) {
  const [playing, setPlaying] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/assets/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok) onAttached?.(data.path, data.kind)
      else toast.error(data.error || 'Upload failed')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const hasAnimation = !!animationCode
  const hasImage = !!imageBase64 || !!imageUrl
  const hasVideo = !!videoPath

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/10">
      <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Asset Dock</span>
        {assetStatus && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${assetStatus === 'failed' ? 'bg-muted text-destructive' : 'bg-muted text-muted-foreground'}`}>
            {assetStatus}
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Attach a manually-generated asset (copy prompt → Flow/ChatGPT → drop the file here) */}
        {onAttached && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer rounded-md border border-dashed border-border/60 px-3 py-2 hover:bg-accent">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Attach image or video'}
            <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" disabled={uploading} onChange={handleUpload} />
          </label>
        )}

        {/* Generation pipeline — how this shot's visual gets made */}
        {pipeline && pipeline.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Generation pipeline</div>
            {pipeline.map((p, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-background p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-foreground">{STEP_LABEL[p.step] ?? p.step}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.tool}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(p.prompt); setCopied(i); setTimeout(() => setCopied(null), 1500) }}
                    className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Copy prompt" aria-label="Copy prompt"
                  >
                    {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap">{p.prompt}</p>
                {p.note && <p className="text-[11px] text-muted-foreground mt-1 italic">{p.note}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Live animation (HTML/GSAP in iframe) */}
        {hasAnimation && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Play className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Live Animation</span>
            </div>
            <div className="rounded-md overflow-hidden border border-border/40 bg-background aspect-video relative">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              <iframe
                srcDoc={animationCode}
                className="w-full h-full"
                sandbox="allow-scripts"
                onLoad={() => setIframeLoaded(true)}
                title={`Animation for ${shotArchetype}`}
              />
            </div>
          </div>
        )}

        {/* AI-generated image */}
        {hasImage && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ImageIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Image</span>
            </div>
            <div className="rounded-md overflow-hidden border border-border/40">
              <img
                src={imageBase64 ? (imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`) : imageUrl}
                alt={`Generated asset for ${shotArchetype}`}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* AI-generated video */}
        {hasVideo && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Video className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Video</span>
            </div>
            <div className="rounded-md overflow-hidden border border-border/40 bg-black">
              <video
                src={`/api/assets/${videoPath}`}
                controls
                className="w-full"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            </div>
          </div>
        )}

        {/* Placeholder when no assets */}
        {!hasAnimation && !hasImage && !hasVideo && (
          <div className="flex flex-col items-center justify-center py-6">
            <Play className="w-6 h-6 text-muted-foreground/20 mb-1" />
            <p className="text-xs text-muted-foreground/50">No assets yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
