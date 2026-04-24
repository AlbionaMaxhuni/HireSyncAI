'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getExplicitUserRole, type UserRole } from '@/lib/auth'
import type { WorkspaceSummary } from '@/lib/workspace'
import { createClient } from '@/utils/supabase/client'

type AuthContextValue = {
  user: User | null
  role: UserRole | null
  workspace: WorkspaceSummary | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  workspace: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let active = true

    const syncSession = async (nextUser?: User | null) => {
      const resolvedUser =
        nextUser !== undefined
          ? nextUser
          : (
              await supabase.auth.getSession()
            ).data.session?.user ?? null

      if (!active) return

      setUser(resolvedUser)

      if (!resolvedUser) {
        setRole(null)
        setWorkspace(null)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/session-role', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const payload = (await response.json().catch(() => null)) as {
          role?: UserRole | null
          workspace?: WorkspaceSummary | null
        } | null
        setRole(payload?.role ?? getExplicitUserRole(resolvedUser))
        setWorkspace(payload?.workspace ?? null)
      } catch {
        setRole(getExplicitUserRole(resolvedUser))
        setWorkspace(null)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true)
      void syncSession(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return <AuthContext.Provider value={{ user, role, workspace, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
