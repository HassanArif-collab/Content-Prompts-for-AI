'use client'

import { useState } from 'react'
import { InlineEditor } from './InlineEditor'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'

export interface NotionColumn {
  key: string
  label: string
  width?: string
  editable?: boolean
  type?: 'text' | 'select' | 'badge'
  options?: string[]
}

interface NotionTableProps<T> {
  columns: NotionColumn[]
  rows: T[]
  getRowId: (row: T) => string
  getCellValue: (row: T, key: string) => string
  onCellEdit: (rowId: string, key: string, value: string) => void
  onRowExpand?: (rowId: string) => void
  expandedRowId?: string | null
  renderExpanded?: (row: T) => React.ReactNode
  onAddRow?: () => void
  addLabel?: string
}

export function NotionTable<T>({
  columns,
  rows,
  getRowId,
  getCellValue,
  onCellEdit,
  onRowExpand,
  expandedRowId,
  renderExpanded,
  onAddRow,
  addLabel = 'Add row',
}: NotionTableProps<T>) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-border bg-muted/30">
        <div className="w-8 shrink-0" />
        {columns.map(col => (
          <div
            key={col.key}
            className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0"
            style={{ width: col.width || 'auto', minWidth: col.width || '80px' }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const rowId = getRowId(row)
        const isExpanded = expandedRowId === rowId
        return (
          <div key={rowId}>
            <div
              className={`flex items-center border-b border-border/40 hover:bg-accent/30 transition-colors cursor-pointer ${isExpanded ? 'bg-accent/20' : ''}`}
              onClick={() => onRowExpand?.(isExpanded ? '' : rowId)}
            >
              <div className="w-8 shrink-0 flex items-center justify-center">
                {renderExpanded && (
                  isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground/50 ml-0.5">{i + 1}</span>
              </div>
              {columns.map(col => (
                <div
                  key={col.key}
                  className="px-3 py-2 shrink-0"
                  style={{ width: col.width || 'auto', minWidth: col.width || '80px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {col.editable !== false ? (
                    <InlineEditor
                      value={getCellValue(row, col.key)}
                      onSave={(v) => onCellEdit(rowId, col.key, v)}
                      className="text-sm text-foreground"
                      placeholder="—"
                    />
                  ) : (
                    <span className="text-sm text-foreground">{getCellValue(row, col.key) || '—'}</span>
                  )}
                </div>
              ))}
            </div>
            {/* Expanded content */}
            {isExpanded && renderExpanded && (
              <div className="px-12 py-4 border-b border-border/40 bg-muted/10">
                {renderExpanded(row)}
              </div>
            )}
          </div>
        )
      })}

      {/* Add row */}
      {onAddRow && (
        <button
          onClick={onAddRow}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  )
}
