import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) {
    return (
      <Navigate
        to={`/masuk?redirect=${encodeURIComponent(loc.pathname + loc.search)}`}
        replace
        state={{ notice: 'Sesimu berakhir. Masuk lagi untuk melanjutkan.' }}
      />
    )
  }
  return children
}
