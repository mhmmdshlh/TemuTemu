import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to={`/masuk?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}
