'use client'

import { create } from 'zustand'

export type View =
  | { kind: 'dashboard' }
  | { kind: 'project'; id: string }

interface StudioState {
  view: View
  openProject: (id: string) => void
  backToDashboard: () => void
}

export const useStudio = create<StudioState>((set) => ({
  view: { kind: 'dashboard' },
  openProject: (id) => set({ view: { kind: 'project', id } }),
  backToDashboard: () => set({ view: { kind: 'dashboard' } }),
}))
