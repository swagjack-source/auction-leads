import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function PrivateRoute({ children }) {
  const { session } = useAuth()
  if (session === undefined) return null // loading — avoid flash of login
  if (!session) return <Navigate to="/login" replace />
  return children
}
