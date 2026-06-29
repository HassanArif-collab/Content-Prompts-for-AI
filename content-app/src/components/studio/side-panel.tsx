'use client'

import { X } from 'lucide-react'

// Notion-style slide-in side panel. Replaces modal dialogs for settings/detail
// views — backdrop + a right-anchored panel with header / scroll body / footer.
export function SidePanel({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[440px] max-w-[92vw] bg-background border-l border-border shadow-xl z-50 flex flex-col">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-editorial text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto studio-scroll p-5">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </>
  )
}
