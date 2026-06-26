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
  CheckCircle2, Clock, ArrowRight, Calendar,
} from 'lucide-react'
import type { Project, Task } from '../project-workspace'

const CATEGORIES = [
  { value: 'research', label: 'Research', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { value: 'filming', label: 'Filming', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { value: 'editing', label: 'Editing', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  { value: 'graphics', label: 'Graphics', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { value: 'sound', label: 'Sound', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { value: 'licensing', label: 'Licensing', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  { value: 'publish', label: 'Publish', color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground' },
]

const STATUSES = [
  { value: 'todo', label: 'To do', icon: Circle, color: 'text-muted-foreground', colColor: 'border-t-muted-foreground/40' },
  { value: 'in-progress', label: 'In progress', icon: AlertCircle, color: 'text-amber-500', colColor: 'border-t-amber-500/60' },
  { value: 'blocked', label: 'Blocked', icon: AlertCircle, color: 'text-destructive', colColor: 'border-t-destructive/60' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-500', colColor: 'border-t-emerald-500/60' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { value: 'high', label: 'High', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
]

export function ProductionTab({ project, onChange }: {
  project: Project
  onChange: () => void
}) {
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')

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

  return (
    <div className="space-y-5">
      <Card className="p-5 border-border/60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <StatPill label="To do" count={byStatus.todo.length} color="text-muted-foreground" />
            <StatPill label="In progress" count={byStatus['in-progress'].length} color="text-amber-500" />
            <StatPill label="Blocked" count={byStatus.blocked.length} color="text-destructive" />
            <StatPill label="Done" count={byStatus.done.length} color="text-emerald-500" />
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

      {project.tasks.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-editorial text-lg font-semibold mb-1">No production tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Track everything that needs to happen — research follow-ups, filming days, edit milestones, licensing, sound, color, thumbnails, publish.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map(col => (
            <div key={col.value} className={`rounded-lg border border-border/60 border-t-4 ${col.colColor} bg-card/50 overflow-hidden flex flex-col`}>
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <col.icon className={`w-3.5 h-3.5 ${col.color}`} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{byStatus[col.value].length}</span>
              </div>
              <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto studio-scroll flex-1">
                {byStatus[col.value].length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 text-center py-6">Drop tasks here</div>
                ) : (
                  byStatus[col.value].map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={() => setEditing(t)}
                      onChange={onChange}
                      onMove={(dir) => {
                        const idx = STATUSES.findIndex(s => s.value === t.status)
                        const next = dir === 'left' ? STATUSES[idx - 1] : STATUSES[idx + 1]
                        if (next) moveTask(t, next.value)
                      }}
                      canMoveLeft={STATUSES.findIndex(s => s.value === t.status) > 0}
                      canMoveRight={STATUSES.findIndex(s => s.value === t.status) < STATUSES.length - 1}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add detailed task
        </Button>
      </div>

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

function TaskCard({ task, onEdit, onChange, onMove, canMoveLeft, canMoveRight }: {
  task: Task
  onEdit: () => void
  onChange: () => void
  onMove: (dir: 'left' | 'right') => void
  canMoveLeft: boolean
  canMoveRight: boolean
}) {
  const cat = CATEGORIES.find(c => c.value === task.category) ?? CATEGORIES[7]
  const pri = PRIORITIES.find(p => p.value === task.priority) ?? PRIORITIES[1]

  async function handleDelete() {
    await fetch(`/api/projects/${task.projectId}/tasks/${task.id}`, { method: 'DELETE' })
    toast.success('Task deleted')
    onChange()
  }

  return (
    <Card className="p-3 border-border/60 hover:border-border/100 transition-colors group">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] uppercase ${cat.color}`}>{cat.label}</Badge>
            <Badge variant="outline" className={`text-[10px] uppercase ${pri.color}`}>{pri.label}</Badge>
          </div>
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </div>
          )}
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60 opacity-60 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onMove('left')} disabled={!canMoveLeft} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label="Move left">
          <ArrowRight className="w-3 h-3 rotate-180" />
        </button>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Edit">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={handleDelete} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Delete">
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

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-2xl font-editorial font-bold tabular-nums ${color}`}>{count}</span>
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
