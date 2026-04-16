import { NavLink } from 'react-router-dom'
import { getUserRoles } from '../keycloak'

interface NavItem { to: string; label: string; icon: string }

function getNavItems(roles: string[]): NavItem[] {
  if (roles.includes('admin')) return [
    { to: '/dashboard',    label: 'Dashboard',             icon: '📊' },
    { to: '/utilisateurs', label: 'Utilisateurs',           icon: '👥' },
    { to: '/vehicles',     label: 'Véhicules',              icon: '🚗' }, // Ajouté pour l'admin
    { to: '/supervision',  label: 'Supervision',            icon: '🖥️' },
  ]
  if (roles.includes('manager')) return [
    { to: '/dashboard',             label: 'Dashboard',            icon: '📊' },
    { to: '/vehicles',              label: 'Véhicules',            icon: '🚗' }, // Ajouté ici pour le manager
    { to: '/assignations',          label: 'Assignations',         icon: '🔗' },
    { to: '/maintenance',           label: 'Maintenance',          icon: '🔧' },
    { to: '/localisation',          label: 'Localisation',         icon: '🗺️' },
    { to: '/statistiques-flotte',   label: 'Statistiques Flotte',  icon: '📈' },
  ]
  if (roles.includes('technicien')) return [
    { to: '/dashboard',                       label: 'Dashboard',        icon: '📊' },
    { to: '/mes-interventions',               label: 'Mes Interventions', icon: '🔧' },
    { to: '/mon-historique-interventions',    label: 'Mon Historique',    icon: '📋' },
  ]
  // conducteur / utilisateur
  return [
    { to: '/dashboard',       label: 'Mon Véhicule',    icon: '🚗' },
    { to: '/ma-localisation', label: 'Ma Localisation', icon: '📍' },
    { to: '/signaler',        label: 'Signaler',        icon: '🚨' },
    { to: '/mon-historique',  label: 'Mon Historique',  icon: '📋' },
  ]
}

function getRoleLabel(roles: string[]) {
  if (roles.includes('admin'))      return 'Administrateur'
  if (roles.includes('manager'))    return 'Superviseur'
  if (roles.includes('technicien')) return 'Technicien'
  return 'Conducteur'
}

export default function Sidebar() {
  const roles = getUserRoles()
  const navItems = getNavItems(roles)

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-primary-700">
        <h1 className="text-xl font-bold tracking-tight">🚛 Gestion Flotte</h1>
        <p className="text-primary-100 text-xs mt-1">{getRoleLabel(roles)} — M1</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}