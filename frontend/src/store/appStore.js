import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      currentUser: null,
      activeClientId: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      setActiveClientId: (id) => set({ activeClientId: id }),
    }),
    { name: 'ai-use-case-app' }
  )
)
