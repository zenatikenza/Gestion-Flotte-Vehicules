import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { hasAnyRole } from '../keycloak'

interface ProtectedRouteProps {
  children: ReactNode
  roles: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  if (!hasAnyRole(roles)) {
    return <Navigate to="/access-denied" replace />
  }
  return <>{children}</>
}
