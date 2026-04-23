import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getUserRoles } from '../keycloak'

interface NavItem { to: string; label: string; icon: string }

function getNavItems(roles: string[], t: (key: string) => string): NavItem[] {
  if (roles.includes('admin')) return [
    { to: '/dashboard',      label: t('nav.dashboard'),    icon: '📊' },
    { to: '/utilisateurs',   label: t('nav.utilisateurs'), icon: '👥' },
    { to: '/vehicles',       label: t('nav.vehicles'),     icon: '🚗' },
    { to: '/supervision',    label: t('nav.supervision'),  icon: '🖥️' },
    { to: '/feature-flags',  label: t('nav.featureFlags'), icon: '🔀' },
  ]
  if (roles.includes('manager')) return [
    { to: '/dashboard',           label: t('nav.dashboard'),    icon: '📊' },
    { to: '/vehicles',            label: t('nav.vehicles'),     icon: '🚗' },
    { to: '/assignations',        label: t('nav.assignations'), icon: '🔗' },
    { to: '/maintenance',         label: t('nav.maintenance'),  icon: '🔧' },
    { to: '/localisation',        label: t('nav.localisation'), icon: '🗺️' },
    { to: '/statistiques-flotte', label: t('nav.statistiques'), icon: '📈' },
  ]
  if (roles.includes('technicien')) return [
    { to: '/dashboard',                    label: t('nav.dashboard'),        icon: '📊' },
    { to: '/mes-interventions',            label: t('nav.mesInterventions'), icon: '🔧' },
    { to: '/mon-historique-interventions', label: t('nav.monHistorique'),    icon: '📋' },
  ]
  return [
    { to: '/dashboard',       label: t('nav.dashboard'),     icon: '🚗' },
    { to: '/ma-localisation', label: t('nav.maLocalisation'), icon: '📍' },
    { to: '/signaler',        label: t('nav.signaler'),       icon: '🚨' },
    { to: '/mon-historique',  label: t('nav.monHistorique'),  icon: '📋' },
  ]
}

function getRoleLabel(roles: string[]) {
  if (roles.includes('admin'))      return 'Administrateur'
  if (roles.includes('manager'))    return 'Superviseur'
  if (roles.includes('technicien')) return 'Technicien'
  return 'Conducteur'
}

export default function Sidebar() {
  const { t } = useTranslation()
  const roles = getUserRoles()
  const navItems = getNavItems(roles, t)

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-primary-700">
        <h1 className="text-xl font-bold tracking-tight">🚛 Gestion Flotte</h1>
        <p className="text-primary-100 text-xs mt-1">{getRoleLabel(roles)} — M1</p>
      </div>
      <nav role="navigation" aria-label="Menu principal" className="flex-1 p-4 space-y-1">
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
            {({ isActive }) => (
              <>
                <span>{item.icon}</span>
                <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
