'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Image as ImageIcon, Video, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'

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
  // Shot info
  shotId: string
  shotArchetype: string
}

export function AssetDock({ animationCode, imageBase64, imageUrl, videoPath, assetStatus, shotId, shotArchetype }: AssetDockProps) {
  const [playing, setPlaying] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

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
