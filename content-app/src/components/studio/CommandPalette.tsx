'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ArrowRight } from 'lucide-react'

interface Command {
  id: string
  label: string
  hint?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.hint?.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [filtered, selectedIndex, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground"
              autoFocus
            />
            <kbd className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-border">ESC</kbd>
          </div>
          {/* Results */}
          <div className="max-h-80 overflow-y-auto studio-scroll py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results</div>
            ) : (
              filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => { cmd.action(); onClose() }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{cmd.label}</div>
                    {cmd.hint && <div className="text-xs text-muted-foreground">{cmd.hint}</div>}
                  </div>
                  {i === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
