'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Project } from './project-workspace'

const COLOR_OPTIONS = ['amber', 'emerald', 'rose', 'violet', 'sky', 'orange']
const STATUS_OPTIONS = ['research', 'scripting', 'production', 'editing', 'published']
const COVER_DOT: Record<string, string> = {
  amber: 'bg-amber-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500',
  violet: 'bg-violet-500', sky: 'bg-sky-500', orange: 'bg-orange-500',
}

export function ProjectSettingsDialog({ project, open, onOpenChange, onSaved }: {
  project: Project
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(project.title)
  const [logline, setLogline] = useState(project.logline ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState(project.status)
  const [targetRuntime, setTargetRuntime] = useState(project.targetRuntime)
  const [narrationWpm, setNarrationWpm] = useState(project.narrationWpm)
  const [coverColor, setCoverColor] = useState(project.coverColor)
  const [saving, setSaving] = useState(false)

  // Re-sync when project changes
  const pid = project.id
  const [lastPid, setLastPid] = useState(pid)
  if (pid !== lastPid) {
    setLastPid(pid)
    setTitle(project.title)
    setLogline(project.logline ?? '')
    setDescription(project.description ?? '')
    setStatus(project.status)
    setTargetRuntime(project.targetRuntime)
    setNarrationWpm(project.narrationWpm)
    setCoverColor(project.coverColor)
  }

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, logline: logline || null, description: description || null,
          status, targetRuntime, narrationWpm, coverColor,
        }),
      })
      toast.success('Project updated')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto studio-scroll">
        <DialogHeader>
          <DialogTitle className="font-editorial">Project settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-logline">Logline</Label>
            <Textarea id="p-logline" value={logline} onChange={(e) => setLogline(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-runtime">Target runtime (min)</Label>
              <Input id="p-runtime" type="number" value={targetRuntime} onChange={(e) => setTargetRuntime(parseInt(e.target.value) || 0)} min={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-wpm">Narration speed (wpm)</Label>
              <Input id="p-wpm" type="number" value={narrationWpm} onChange={(e) => setNarrationWpm(parseInt(e.target.value) || 150)} min={80} max={250} />
              <p className="text-xs text-muted-foreground">Default 150. Slower for contemplative docs (130), faster for explanatory (170).</p>
            </div>
            <div className="space-y-1.5">
              <Label>Cover color</Label>
              <div className="flex items-center gap-1.5 pt-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoverColor(c)}
                    className={`w-6 h-6 rounded-full ${COVER_DOT[c]} ${coverColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'opacity-60 hover:opacity-100'}`}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
