import keycloak, { getUsername, getUserRoles } from '../keycloak'

export default function Navbar() {
  const username = getUsername()
  const roles = getUserRoles()
  const primaryRole = roles[0] ?? 'utilisateur'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Rôle actif :{' '}
        <span className="font-semibold text-primary-700 capitalize">{primaryRole}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700">
          <span className="text-gray-400">Connecté en tant que </span>
          <span className="font-semibold">{username}</span>
        </div>
        <button
          onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
