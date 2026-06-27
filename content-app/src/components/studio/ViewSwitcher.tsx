'use client'

import { Button } from '@/components/ui/button'
import {
  List, LayoutGrid, Image, Clock,
} from 'lucide-react'

export type ViewType = 'list' | 'board' | 'gallery' | 'timeline'

interface ViewSwitcherProps {
  current: ViewType
  onChange: (view: ViewType) => void
}

const VIEWS: Array<{ type: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'list', label: 'List', icon: List },
  { type: 'board', label: 'Board', icon: LayoutGrid },
  { type: 'gallery', label: 'Gallery', icon: Image },
  { type: 'timeline', label: 'Timeline', icon: Clock },
]

export function ViewSwitcher({ current, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40">
      {VIEWS.map(view => {
        const Icon = view.icon
        const isActive = current === view.type
        return (
          <button
            key={view.type}
            onClick={() => onChange(view.type)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        )
      })}
    </div>
  )
}
