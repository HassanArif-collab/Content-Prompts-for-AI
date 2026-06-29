'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { SidePanel } from './side-panel'
import type { Project } from './project-workspace'

const COLOR_OPTIONS = ['amber', 'emerald', 'rose', 'violet', 'sky', 'orange']
const STATUS_OPTIONS = ['research', 'scripting', 'production', 'editing', 'published']

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
    <SidePanel
      open={open}
      onClose={() => onOpenChange(false)}
      title="Project settings"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </>
      }
    >
      <div className="space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-runtime">Target runtime (min)</Label>
            <Input id="p-runtime" type="number" value={targetRuntime} onChange={(e) => setTargetRuntime(parseInt(e.target.value) || 0)} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>Cover label</Label>
            <Select value={coverColor} onValueChange={setCoverColor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-wpm">Narration speed (wpm)</Label>
          <Input id="p-wpm" type="number" value={narrationWpm} onChange={(e) => setNarrationWpm(parseInt(e.target.value) || 150)} min={80} max={250} />
          <p className="text-xs text-muted-foreground">Default 150. Slower for contemplative docs (130), faster for explanatory (170).</p>
        </div>
      </div>
    </SidePanel>
  )
}
