import { useTranslation } from 'react-i18next'
import keycloak, { getUsername, getUserRoles } from '../keycloak'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const username = getUsername()
  const roles = getUserRoles()
  const primaryRole = roles[0] ?? 'utilisateur'

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <nav aria-label="Navigation principale">
        <div className="text-sm text-gray-500">
          Rôle actif :{' '}
          <span className="font-semibold text-primary-700 capitalize">{primaryRole}</span>
        </div>
      </nav>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700">
          <span className="text-gray-400">Connecté en tant que </span>
          <span className="font-semibold">{username}</span>
        </div>
        <button
          onClick={toggleLanguage}
          aria-label="Changer la langue"
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
        >
          {i18n.language === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
        </button>
        <button
          onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
          aria-label="Se déconnecter"
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          {t('nav.logout')}
        </button>
      </div>
    </header>
  )
}
