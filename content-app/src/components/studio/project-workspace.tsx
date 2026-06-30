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
import { ThemeToggle } from './theme-toggle'
import { CommandPalette } from './CommandPalette'
import { SourceSidebar } from './SourceSidebar'

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

// Notion-style underline tabs: text triggers with a 2px active underline that
// sits on the strip's bottom border. Overrides the default shadcn pill styling.
const TAB_TRIGGER_CLS =
  "text-sm flex-none h-auto -mb-px rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pt-2 pb-2.5 font-normal text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-foreground dark:data-[state=active]:bg-transparent"

export function ProjectWorkspace() {
  const { view, backToDashboard } = useStudio()
  const projectId = view.kind === 'project' ? view.id : ''
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [activeSource, setActiveSource] = useState<Source | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const triggerReload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Tunnel banner — shows public URL when cloudflared is running */}
      <TunnelBanner />

      {/* Project header */}
      <header className="border-b border-border bg-background shrink-0">
        <div className="px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={backToDashboard} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" />
              All projects
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="min-w-0 flex items-center gap-2">
              <Film className="w-4 h-4 text-muted-foreground shrink-0" />
              <h1 className="font-editorial text-base font-semibold truncate">{project.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
          <div className={`px-6 py-6 transition-all duration-200 ${aiOpen ? 'max-w-full' : 'max-w-[1200px] mx-auto'}`}>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-transparent h-auto w-full justify-start gap-5 rounded-none border-b border-border p-0">
                <TabsTrigger value="overview" className={TAB_TRIGGER_CLS}>Overview</TabsTrigger>
                <TabsTrigger value="research" className={TAB_TRIGGER_CLS}>Research <span className="text-muted-foreground ml-1.5 text-xs">{project.researchNotes.length}</span></TabsTrigger>
                <TabsTrigger value="script" className={TAB_TRIGGER_CLS}>Script</TabsTrigger>
                <TabsTrigger value="storyboard" className={TAB_TRIGGER_CLS}>Storyboard <span className="text-muted-foreground ml-1.5 text-xs">{project.scenes.length}</span></TabsTrigger>
                <TabsTrigger value="visual-plans" className={TAB_TRIGGER_CLS}>Visual Plans</TabsTrigger>
                <TabsTrigger value="sources" className={TAB_TRIGGER_CLS}>Sources <span className="text-muted-foreground ml-1.5 text-xs">{project.sources.length}</span></TabsTrigger>
                <TabsTrigger value="production" className={TAB_TRIGGER_CLS}>Production <span className="text-muted-foreground ml-1.5 text-xs">{project.tasks.length}</span></TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab project={project} onOpenTab={setTab} />
              </TabsContent>
              <TabsContent value="research" className="mt-6">
                <ResearchTab project={project} onChange={triggerReload} />
              </TabsContent>
              <TabsContent value="script" className="mt-6">
                <ScriptTab project={project} onChange={triggerReload} onOpenSource={setActiveSource} />
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

        {/* Middle: source panel — slides in between the script and the co-pilot;
            the script (main, flex-1) shifts left as this takes width. */}
        <div className={`${activeSource ? 'w-[380px]' : 'w-0'} shrink-0 hidden md:block overflow-hidden transition-[width] duration-300 ease-in-out`}>
          <SourceSidebar activeSource={activeSource} onClose={() => setActiveSource(null)} />
        </div>

        {/* Right: AI Co-pilot sidebar (fixed width, full height).
            Desktop-only — documentary editing is a desktop activity.
            The AiAssistant component handles its own collapse/expand inside this slot. */}
        <aside className={`${aiOpen ? 'w-[420px]' : 'w-14'} shrink-0 hidden md:flex flex-col min-h-0 overflow-hidden transition-[width] duration-300 ease-in-out`}>
          <AiAssistant projectId={project.id} projectTitle={project.title} open={aiOpen} onOpenChange={setAiOpen} />
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

      {/* Command palette — ⌘K / Ctrl+K. Single instance at the workspace root. */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={[
          { id: 'tab-overview', label: 'Go to Overview', action: () => setTab('overview') },
          { id: 'tab-research', label: 'Go to Research', action: () => setTab('research') },
          { id: 'tab-script', label: 'Go to Script', action: () => setTab('script') },
          { id: 'tab-storyboard', label: 'Go to Storyboard', action: () => setTab('storyboard') },
          { id: 'tab-visual-plans', label: 'Go to Visual Plans', action: () => setTab('visual-plans') },
          { id: 'tab-sources', label: 'Go to Sources', action: () => setTab('sources') },
          { id: 'tab-production', label: 'Go to Production', action: () => setTab('production') },
          { id: 'toggle-ai', label: 'Open AI provider settings', action: () => setAiSettingsOpen(true) },
          { id: 'open-settings', label: 'Open project settings', action: () => setSettingsOpen(true) },
        ]}
      />
    </div>
  )
}
