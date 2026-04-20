import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

async function fetchOrganizationId(userId) {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.organization_id ?? null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [organizationId, setOrganizationId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchOrganizationId(session.user.id).then(setOrganizationId)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchOrganizationId(session.user.id).then(setOrganizationId)
      } else {
        setOrganizationId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, organizationId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
