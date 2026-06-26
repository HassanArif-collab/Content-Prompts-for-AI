'use client'

import { useEffect, useState } from 'react'
import { useStudio } from '@/store/studio'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft, Film, Settings2, Cpu } from 'lucide-react'
import { OverviewTab } from './tabs/overview-tab'
import { ResearchTab } from './tabs/research-tab'
import { ScriptTab } from './tabs/script-tab'
import { StoryboardTab } from './tabs/storyboard-tab'
import { SourcesTab } from './tabs/sources-tab'
import { ProductionTab } from './tabs/production-tab'
import { VisualPlansTab } from './tabs/visual-plans-tab'
import { ProjectSettingsDialog } from './project-settings'
import { AiAssistant } from './ai-assistant'
import { AiSettingsDialog } from './ai-settings-dialog'
import { TunnelBanner } from './tunnel-banner'

export interface ResearchNote {
  id: string; projectId: string; parentId: string | null; title: string; content: string;
  url: string; category: string; tags: string; pinned: boolean;
  createdAt: string; updatedAt: string;
}
export interface Source {
  id: string; projectId: string; type: string; title: string; author: string;
  url: string; publisher: string; publicationDate: string; citation: string;
  notes: string; credibility: number;
  createdAt: string; updatedAt: string;
}
export interface Scene {
  id: string; projectId: string; order: number; title: string;
  shotType: string; location: string; description: string; narration: string;
  duration: number; brollNotes: string; status: string;
  createdAt: string; updatedAt: string;
}
export interface ScriptSection {
  id: string; projectId: string; order: number; type: string;
  heading: string; content: string;
  createdAt: string; updatedAt: string;
}
export interface Task {
  id: string; projectId: string; title: string; category: string;
  status: string; priority: string; dueDate: string; notes: string;
  createdAt: string; updatedAt: string;
}
export interface Project {
  id: string; title: string; logline: string | null; description: string | null;
  status: string; targetRuntime: number; narrationWpm: number; coverColor: string;
  createdAt: string; updatedAt: string;
  researchNotes: ResearchNote[]
  sources: Source[]
  scenes: Scene[]
  scriptSections: ScriptSection[]
  tasks: Task[]
}

export function ProjectWorkspace() {
  const { view, backToDashboard } = useStudio()
  const projectId = view.kind === 'project' ? view.id : ''
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const triggerReload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!projectId) return
      const res = await fetch(`/api/projects/${projectId}`)
      if (cancelled) return
      if (!res.ok) {
        toast.error('Could not load project')
        backToDashboard()
        return
      }
      const data = await res.json()
      if (cancelled) return
      setProject(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [projectId, backToDashboard, reloadKey])

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading project…</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background studio-grain overflow-hidden">
      {/* Tunnel banner — shows public URL when cloudflared is running */}
      <TunnelBanner />

      {/* Project header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur shrink-0">
        <div className="px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={backToDashboard} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" />
              All projects
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="min-w-0 flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-500 shrink-0" />
              <h1 className="font-editorial text-base font-semibold truncate">{project.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAiSettingsOpen(true)} className="text-muted-foreground" title="AI provider settings">
              <Cpu className="w-4 h-4 mr-1.5" />
              AI provider
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="text-muted-foreground">
              <Settings2 className="w-4 h-4 mr-1.5" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Main split layout: tabs on left, AI sidebar on right */}
      <div className="flex-1 flex min-h-0">
        {/* Left: project content (scrollable) */}
        <main className="flex-1 min-w-0 overflow-y-auto studio-scroll">
          <div className="px-6 py-6 max-w-[1400px]">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-muted/40 h-10">
                <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
                <TabsTrigger value="research" className="text-sm">Research <span className="text-muted-foreground ml-1.5 text-xs">{project.researchNotes.length}</span></TabsTrigger>
                <TabsTrigger value="script" className="text-sm">Script</TabsTrigger>
                <TabsTrigger value="storyboard" className="text-sm">Storyboard <span className="text-muted-foreground ml-1.5 text-xs">{project.scenes.length}</span></TabsTrigger>
                <TabsTrigger value="visual-plans" className="text-sm">Visual Plans</TabsTrigger>
                <TabsTrigger value="sources" className="text-sm">Sources <span className="text-muted-foreground ml-1.5 text-xs">{project.sources.length}</span></TabsTrigger>
                <TabsTrigger value="production" className="text-sm">Production <span className="text-muted-foreground ml-1.5 text-xs">{project.tasks.length}</span></TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab project={project} onOpenTab={setTab} />
              </TabsContent>
              <TabsContent value="research" className="mt-6">
                <ResearchTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="script" className="mt-6">
                <ScriptTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="storyboard" className="mt-6">
                <StoryboardTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="visual-plans" className="mt-6">
                <VisualPlansTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="sources" className="mt-6">
                <SourcesTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="production" className="mt-6">
                <ProductionTab project={project} onChange={triggerReload} />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Right: AI Co-pilot sidebar (fixed width, full height).
            Desktop-only — documentary editing is a desktop activity.
            The AiAssistant component handles its own collapse/expand inside this slot. */}
        <aside className="w-[420px] shrink-0 hidden md:flex flex-col min-h-0">
          <AiAssistant projectId={project.id} projectTitle={project.title} />
        </aside>
      </div>

      <ProjectSettingsDialog
        project={project}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={triggerReload}
      />

      <AiSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
      />
    </div>
  )
}
