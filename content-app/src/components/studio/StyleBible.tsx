'use client'

import { InlineEditor } from './InlineEditor'
import { Palette, Type, Move, Image as ImageIcon } from 'lucide-react'

interface StyleBibleProps {
  palette: string
  typography: string
  motion: string
  references: string
  mood: string
  onSave: (field: string, value: string) => void
}

export function StyleBible({ palette, typography, motion, references, mood, onSave }: StyleBibleProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <h3 className="text-sm font-medium text-foreground">Visual Style Bible</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Global aesthetic direction for the entire video</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 p-4">
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <Palette className="w-3 h-3" /> Color Palette
          </label>
          <InlineEditor value={palette} onSave={(v) => onSave('palette', v)} className="text-sm" placeholder="e.g. Dark archival, #1a1a2e, #e94560..." />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <Type className="w-3 h-3" /> Typography
          </label>
          <InlineEditor value={typography} onSave={(v) => onSave('typography', v)} className="text-sm" placeholder="e.g. Inter (body), Playfair (titles)..." />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <Move className="w-3 h-3" /> Motion Principles
          </label>
          <InlineEditor value={motion} onSave={(v) => onSave('motion', v)} multiline className="text-sm" placeholder="e.g. Semantic only. Fade=presence, scale=emphasis..." />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <ImageIcon className="w-3 h-3" /> Reference Images
          </label>
          <InlineEditor value={references} onSave={(v) => onSave('references', v)} className="text-sm" placeholder="e.g. Links to reference images..." />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Overall Mood</label>
          <InlineEditor value={mood} onSave={(v) => onSave('mood', v)} className="text-sm" placeholder="e.g. Dark, archival, contemplative..." />
        </div>
      </div>
    </div>
  )
}
