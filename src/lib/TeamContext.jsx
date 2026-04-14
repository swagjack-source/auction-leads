import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const TeamContext = createContext({ members: [], refetch: () => {} })

export function TeamProvider({ children }) {
  const [members, setMembers] = useState([])

  async function refetch() {
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data || [])
  }

  useEffect(() => { refetch() }, [])

  return (
    <TeamContext.Provider value={{ members, refetch }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
