'use client'

import { useStudio } from '@/store/studio'
import { Dashboard } from '@/components/studio/dashboard'
import { ProjectWorkspace } from '@/components/studio/project-workspace'

export default function Home() {
  const view = useStudio((s) => s.view)

  if (view.kind === 'project') {
    return <ProjectWorkspace />
  }
  return <Dashboard />
}
