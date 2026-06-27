'use client'

import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Download } from 'lucide-react'

interface VideoPreviewProps {
  /** URL to an MP4 video file (for AI-generated videos from Dreamina/Flow) */
  videoUrl?: string
  /** Base64 PNG image (for Remotion still previews) */
  imageBase64?: string
  /** Whether this is a live Remotion animation (would use @remotion/player) */
  isLiveAnimation?: boolean
  /** Title for the preview */
  title?: string
}

/**
 * Inline video/image preview component.
 * - If videoUrl is provided: shows an HTML5 video player with controls
 * - If imageBase64 is provided: shows the image
 * - If isLiveAnimation is true: would embed @remotion/player (future)
 */
export function VideoPreview({ videoUrl, imageBase64, isLiveAnimation, title }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)

  if (videoUrl) {
    return (
      <div className="rounded-lg overflow-hidden border border-border/60 bg-black relative group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          muted={muted}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          controls
        />
        {title && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
            {title}
          </div>
        )}
      </div>
    )
  }

  if (imageBase64) {
    return (
      <div className="rounded-lg overflow-hidden border border-border/60 bg-muted/10 relative">
        <img
          src={imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`}
          alt={title || 'Preview'}
          className="w-full"
        />
        {title && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
            {title}
          </div>
        )}
      </div>
    )
  }

  if (isLiveAnimation) {
    return (
      <div className="rounded-lg overflow-hidden border border-border/60 bg-muted/10 min-h-[180px] flex items-center justify-center">
        <div className="text-center">
          <Play className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Live animation preview</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Requires @remotion/player</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border/60 bg-muted/10 min-h-[120px] flex items-center justify-center">
      <div className="text-center">
        <Play className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
        <p className="text-xs text-muted-foreground/50">No preview available</p>
      </div>
    </div>
  )
}
