import { getUserRoles } from '../keycloak'
import DashboardAdmin from './DashboardAdmin'
import DashboardManager from './DashboardManager'
import DashboardTechnicien from './DashboardTechnicien'
import DashboardUtilisateur from './DashboardUtilisateur'

/**
 * Point d'entrée du dashboard — route vers la vue adaptée au rôle de l'utilisateur.
 * Priorité : admin > manager > technicien > utilisateur
 */
export default function Dashboard() {
  const roles = getUserRoles()

  if (roles.includes('admin')) return <DashboardAdmin />
  if (roles.includes('manager')) return <DashboardManager />
  if (roles.includes('technicien')) return <DashboardTechnicien />
  return <DashboardUtilisateur />
}
