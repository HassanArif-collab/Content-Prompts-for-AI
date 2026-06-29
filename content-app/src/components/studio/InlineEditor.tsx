'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'

interface InlineEditorProps {
  value: string
  onSave: (value: string) => Promise<void> | void
  placeholder?: string
  multiline?: boolean
  className?: string
  /** Show a subtle "saving" indicator while saving */
  showSaveIndicator?: boolean
}

/**
 * Notion-style inline editor.
 * - Renders text as a div (looks like normal text)
 * - On click, becomes editable (contentEditable or textarea)
 * - On blur (click away), auto-saves via onSave callback
 * - Shows a subtle "saving..." / "saved" indicator
 * - No popup, no dialog, no modal
 */
export function InlineEditor({
  value,
  onSave,
  placeholder = 'Click to edit...',
  multiline = false,
  className = '',
  showSaveIndicator = true,
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  // Update value when prop changes (e.g., after external update)
  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(value)
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Move cursor to end
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setSaveState('idle')
  }, [])

  const handleSave = useCallback(async () => {
    const trimmed = currentValue.trim()
    if (trimmed === value.trim()) {
      setIsEditing(false)
      return
    }

    setSaveState('saving')
    try {
      await onSave(trimmed)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      setCurrentValue(value) // revert on error
      setSaveState('idle')
    }
    setIsEditing(false)
  }, [currentValue, value, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setCurrentValue(value)
      setIsEditing(false)
    }
  }, [handleSave, multiline, value])

  // Render edit mode
  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none resize-none p-0 m-0 font-inherit text-inherit leading-inherit focus:ring-2 focus:ring-ring/40 rounded px-1 -mx-1"
            rows={Math.max(3, currentValue.split('\n').length)}
            style={{ minHeight: '2rem' }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none p-0 m-0 font-inherit text-inherit leading-inherit focus:ring-2 focus:ring-ring/40 rounded px-1 -mx-1"
          />
        )}
      </div>
    )
  }

  // Render display mode
  return (
    <div
      onClick={handleStartEdit}
      className={`cursor-text rounded px-1 -mx-1 transition-colors hover:bg-accent ${className}`}
      title="Click to edit"
    >
      {currentValue || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
      {showSaveIndicator && saveState === 'saving' && (
        <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin text-muted-foreground" />
      )}
      {showSaveIndicator && saveState === 'saved' && (
        <Check className="inline-block w-3 h-3 ml-2 text-muted-foreground" />
      )}
    </div>
  )
}
