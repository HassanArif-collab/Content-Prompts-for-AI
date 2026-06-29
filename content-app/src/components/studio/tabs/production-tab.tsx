'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ListTodo, Circle, AlertCircle,
  CheckCircle2, ArrowRight, Calendar,
} from 'lucide-react'
import { InlineEditor } from '../InlineEditor'
import type { Project, Task } from '../project-workspace'

const CATEGORIES = [
  { value: 'research', label: 'Research' },
  { value: 'filming', label: 'Filming' },
  { value: 'editing', label: 'Editing' },
  { value: 'graphics', label: 'Graphics' },
  { value: 'sound', label: 'Sound' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'publish', label: 'Publish' },
  { value: 'general', label: 'General' },
]

const STATUSES = [
  { value: 'todo', label: 'To do', icon: Circle },
  { value: 'in-progress', label: 'In progress', icon: AlertCircle },
  { value: 'blocked', label: 'Blocked', icon: AlertCircle },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

type View = 'board' | 'list' | 'table'

// ponytail: local helper, no need to import date libs for a YYYY-MM-DD string compare.
function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return task.dueDate < new Date().toISOString().slice(0, 10)
}

export function ProductionTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')
  const [view, setView] = useState<View>('board')

  const byStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { todo: [], 'in-progress': [], blocked: [], done: [] }
    project.tasks.forEach(t => { groups[t.status]?.push(t) })
    return groups
  }, [project.tasks])

  async function quickAddTask() {
    if (!quickAdd.trim()) return
    await fetch(`/api/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickAdd, category: 'general', status: 'todo', priority: 'medium' }),
    })
    setQuickAdd('')
    toast.success('Task added')
    onChange()
  }

  async function moveTask(task: Task, newStatus: string) {
    await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    onChange()
  }

  async function renameTask(task: Task, title: string) {
    if (!title.trim()) return
    await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    onChange()
  }

  async function deleteTask(task: Task) {
    await fetch(`/api/projects/${project.id}/tasks/${task.id}`, { method: 'DELETE' })
    toast.success('Task deleted')
    onChange()
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 border-border/60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <StatPill label="To do" count={byStatus.todo.length} />
            <StatPill label="In progress" count={byStatus['in-progress'].length} />
            <StatPill label="Blocked" count={byStatus.blocked.length} />
            <StatPill label="Done" count={byStatus.done.length} />
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Input
              placeholder="Quick add: schedule next shoot…"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') quickAddTask() }}
            />
            <Button onClick={quickAddTask} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="inline-flex gap-1 rounded-lg bg-muted/40 p-1">
          {(['board', 'list', 'table'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={view === v
                ? 'bg-background text-foreground shadow-sm rounded-md px-2.5 py-1 text-xs'
                : 'text-muted-foreground px-2.5 py-1 text-xs'}
            >
              {v === 'board' ? 'Board' : v === 'list' ? 'List' : 'Table'}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add detailed task
        </Button>
      </div>

      {project.tasks.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No production tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Track everything that needs to happen — research follow-ups, filming days, edit milestones, licensing, sound, color, thumbnails, publish.
          </p>
        </Card>
      ) : view === 'board' ? (
        <BoardView
          byStatus={byStatus}
          onEdit={setEditing}
          onRename={renameTask}
          onDelete={deleteTask}
          onMove={moveTask}
        />
      ) : view === 'list' ? (
        <ListView
          byStatus={byStatus}
          onEdit={setEditing}
          onRename={renameTask}
          onDelete={deleteTask}
        />
      ) : (
        <TableView
          tasks={project.tasks}
          onEdit={setEditing}
          onRename={renameTask}
          onDelete={deleteTask}
        />
      )}

      <TaskDialog
        open={creating || !!editing}
        task={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null) } }}
        projectId={project.id}
        onSaved={() => { setCreating(false); setEditing(null); onChange() }}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── Board

function BoardView({ byStatus, onEdit, onRename, onDelete, onMove }: {
  byStatus: Record<string, Task[]>
  onEdit: (t: Task) => void
  onRename: (t: Task, title: string) => void
  onDelete: (t: Task) => void
  onMove: (t: Task, status: string) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUSES.map(col => (
        <div key={col.value} className="rounded-lg border border-border/60 bg-card/50 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <col.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{col.label}</h3>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{byStatus[col.value].length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto studio-scroll flex-1">
            {byStatus[col.value].length === 0 ? (
              <div className="text-xs text-muted-foreground/50 text-center py-6">No tasks</div>
            ) : (
              byStatus[col.value].map(t => {
                const idx = STATUSES.findIndex(s => s.value === t.status)
                return (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onEdit={() => onEdit(t)}
                    onRename={(title) => onRename(t, title)}
                    onDelete={() => onDelete(t)}
                    onMove={(dir) => {
                      const next = dir === 'left' ? STATUSES[idx - 1] : STATUSES[idx + 1]
                      if (next) onMove(t, next.value)
                    }}
                    canMoveLeft={idx > 0}
                    canMoveRight={idx < STATUSES.length - 1}
                  />
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TaskCard({ task, onEdit, onRename, onDelete, onMove, canMoveLeft, canMoveRight }: {
  task: Task
  onEdit: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onMove: (dir: 'left' | 'right') => void
  canMoveLeft: boolean
  canMoveRight: boolean
}) {
  const cat = CATEGORIES.find(c => c.value === task.category) ?? CATEGORIES[7]
  const pri = PRIORITIES.find(p => p.value === task.priority) ?? PRIORITIES[1]
  const overdue = isOverdue(task)

  return (
    <Card className="p-3 border-border/60 hover:border-border transition-colors group">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase bg-muted text-muted-foreground">{cat.label}</Badge>
            <Badge variant="outline" className="text-[10px] uppercase bg-muted text-muted-foreground">{pri.label}</Badge>
          </div>
          <InlineEditor
            value={task.title}
            onSave={onRename}
            placeholder="Task title…"
            className="text-sm font-medium leading-snug"
          />
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-xs mt-1.5 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </div>
          )}
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onMove('left')} disabled={!canMoveLeft} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label="Move left">
          <ArrowRight className="w-3 h-3 rotate-180" />
        </button>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <button onClick={() => onMove('right')} disabled={!canMoveRight} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label="Move right">
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────── List

function ListView({ byStatus, onEdit, onRename, onDelete }: {
  byStatus: Record<string, Task[]>
  onEdit: (t: Task) => void
  onRename: (t: Task, title: string) => void
  onDelete: (t: Task) => void
}) {
  return (
    <div className="space-y-6">
      {STATUSES.map(col => (
        <div key={col.value}>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <col.icon className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{col.label}</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{byStatus[col.value].length}</span>
          </div>
          <div className="rounded-lg border border-border/60 divide-y divide-border/60 overflow-hidden">
            {byStatus[col.value].length === 0 ? (
              <div className="text-xs text-muted-foreground/50 px-3 py-3">No tasks</div>
            ) : (
              byStatus[col.value].map(t => (
                <TaskRow key={t.id} task={t} onEdit={() => onEdit(t)} onRename={(title) => onRename(t, title)} onDelete={() => onDelete(t)} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TaskRow({ task, onEdit, onRename, onDelete }: {
  task: Task
  onEdit: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const pri = PRIORITIES.find(p => p.value === task.priority) ?? PRIORITIES[1]
  const overdue = isOverdue(task)
  return (
    <div className="group flex items-center gap-3 px-3 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <InlineEditor value={task.title} onSave={onRename} placeholder="Task title…" className="text-sm font-medium" />
      </div>
      <Badge variant="outline" className="text-[10px] uppercase bg-muted text-muted-foreground shrink-0">{pri.label}</Badge>
      {task.dueDate && (
        <span className={`text-xs shrink-0 tabular-nums ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{task.dueDate}</span>
      )}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── Table

function TableView({ tasks, onEdit, onRename, onDelete }: {
  tasks: Task[]
  onEdit: (t: Task) => void
  onRename: (t: Task, title: string) => void
  onDelete: (t: Task) => void
}) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="font-medium px-3 py-2">Task</th>
            <th className="font-medium px-3 py-2 w-28">Status</th>
            <th className="font-medium px-3 py-2 w-24">Priority</th>
            <th className="font-medium px-3 py-2 w-32">Due</th>
            <th className="px-3 py-2 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tasks.map(t => {
            const status = STATUSES.find(s => s.value === t.status)
            const pri = PRIORITIES.find(p => p.value === t.priority) ?? PRIORITIES[1]
            const overdue = isOverdue(t)
            return (
              <tr key={t.id} className="group hover:bg-accent/50 transition-colors">
                <td className="px-3 py-2">
                  <InlineEditor value={t.title} onSave={(title) => onRename(t, title)} placeholder="Task title…" className="font-medium" />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{status?.label ?? t.status}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="text-[10px] uppercase bg-muted text-muted-foreground">{pri.label}</Badge>
                </td>
                <td className={`px-3 py-2 tabular-nums ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{t.dueDate || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => onDelete(t)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── Shared

function StatPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-2xl font-editorial font-bold tabular-nums text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function TaskDialog({ open, task, onOpenChange, projectId, onSaved }: {
  open: boolean
  task: Task | null
  onOpenChange: (v: boolean) => void
  projectId: string
  onSaved: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [category, setCategory] = useState(task?.category ?? 'general')
  const [status, setStatus] = useState(task?.status ?? 'todo')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const taskId = task?.id ?? 'new'
  const [lastId, setLastId] = useState(taskId)
  if (taskId !== lastId) {
    setLastId(taskId)
    setTitle(task?.title ?? '')
    setCategory(task?.category ?? 'general')
    setStatus(task?.status ?? 'todo')
    setPriority(task?.priority ?? 'medium')
    setDueDate(task?.dueDate ?? '')
    setNotes(task?.notes ?? '')
  }

  async function save() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = { title, category, status, priority, dueDate, notes }
      if (task) {
        await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast.success(task ? 'Task updated' : 'Task added')
      onSaved()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-editorial">{task ? 'Edit task' : 'Add task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Confirm archive access window" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
