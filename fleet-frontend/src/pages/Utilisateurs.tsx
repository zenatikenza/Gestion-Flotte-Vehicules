import { useState, useEffect, useCallback } from 'react'
import { fetchAdminUsers, gqlCreateUser, gqlToggleUser, gqlResetPassword } from '../api'

interface KcUser {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  enabled: boolean
  realmRoles: string[]
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  technicien: 'bg-yellow-100 text-yellow-700',
  utilisateur: 'bg-green-100 text-green-700',
}

const APP_ROLES = ['admin', 'manager', 'technicien', 'utilisateur']
const CATEGORIES_PERMIS = ['A', 'B', 'C', 'D', 'BE', 'CE']

const appRole = (roles: string[]) => APP_ROLES.find((r) => roles.includes(r)) ?? '—'

const GQL_NOT_AVAILABLE = "L'api-gateway n'est pas accessible. Vérifiez que le service api-gateway est démarré (port 3000) et redéployé avec le nouveau schéma GraphQL."

export default function Utilisateurs() {
  const [users, setUsers] = useState<KcUser[]>([])
  const [loading, setLoading] = useState(true)
  const [gqlUnavailable, setGqlUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    username: '', email: '', firstName: '', lastName: '',
    password: '', role: 'utilisateur',
    // Conducteur-specific fields
    nom: '', prenom: '', numeroPermis: '', categoriePermis: 'B', dateValiditePermis: '',
  })
  const [formLoading, setFormLoading] = useState(false)

  // Reset password modal
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminUsers()
      setUsers(data as KcUser[])
      setGqlUnavailable(false)
    } catch {
      setGqlUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setError(null)
    try {
      // Créer dans Keycloak via api-gateway (le resolver crée aussi le conducteur si rôle utilisateur)
      await gqlCreateUser({
        username: form.username,
        email: form.email,
        firstName: form.role === 'utilisateur' ? form.prenom : form.firstName,
        lastName: form.role === 'utilisateur' ? form.nom : form.lastName,
        password: form.password,
        roles: [form.role],
        numeroPermis: form.role === 'utilisateur' ? form.numeroPermis : undefined,
        categoriePermis: form.role === 'utilisateur' ? form.categoriePermis : undefined,
        dateValiditePermis: form.role === 'utilisateur' ? form.dateValiditePermis : undefined,
      })

      flash(`Utilisateur "${form.username}" créé avec succès.`)
      setShowCreate(false)
      setForm({
        username: '', email: '', firstName: '', lastName: '',
        password: '', role: 'utilisateur',
        nom: '', prenom: '', numeroPermis: '', categoriePermis: 'B', dateValiditePermis: '',
      })
      await load()
    } catch (e) {
      setError(`Erreur lors de la création : ${(e as Error).message}`)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggle(user: KcUser) {
    setError(null)
    try {
      await gqlToggleUser(user.id, !user.enabled)
      flash(`Utilisateur "${user.username}" ${!user.enabled ? 'activé' : 'désactivé'}.`)
      await load()
    } catch (e) {
      setError(`Impossible de modifier le statut : ${(e as Error).message}`)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetUserId || !newPassword) return
    setError(null)
    try {
      await gqlResetPassword(resetUserId, newPassword)
      flash('Mot de passe réinitialisé avec succès.')
      setResetUserId(null)
      setNewPassword('')
    } catch (e) {
      setError(`Erreur réinitialisation : ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h2>
        <div className="flex items-center gap-3">
          {!gqlUnavailable && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
              Keycloak — {users.length} utilisateur(s)
            </span>
          )}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium"
          >
            + Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Avertissement api-gateway indisponible */}
      {gqlUnavailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Service de gestion des utilisateurs indisponible</h4>
          <p className="text-sm text-yellow-700">{GQL_NOT_AVAILABLE}</p>
          <p className="text-xs text-yellow-600 mt-2 font-mono">docker-compose up --build api-gateway</p>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">
          ✅ {success}
        </div>
      )}

      {/* Formulaire de création */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-purple-100">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Nouvel utilisateur</h3>
          <p className="text-xs text-gray-500 mb-4">
            {form.role === 'utilisateur'
              ? 'Rôle conducteur — créera aussi une entité dans conductor-service (double écriture).'
              : 'Compte créé dans Keycloak uniquement.'}
          </p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Champ rôle en premier pour adapter le formulaire */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Rôle *</label>
              <div className="flex gap-3 flex-wrap">
                {APP_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.role === r
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom d'utilisateur *</label>
              <input
                required value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="jean.dupont"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input
                required type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="jean.dupont@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe temporaire *</label>
              <input
                required type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="À changer à la première connexion"
              />
            </div>

            {/* Champs spécifiques conducteur */}
            {form.role === 'utilisateur' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input
                    required value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input
                    required value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Permis *</label>
                  <input
                    required value={form.numeroPermis}
                    onChange={(e) => setForm({ ...form, numeroPermis: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="P-12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie permis *</label>
                  <select
                    value={form.categoriePermis}
                    onChange={(e) => setForm({ ...form, categoriePermis: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {CATEGORIES_PERMIS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date validité permis *</label>
                  <input
                    required type="date" value={form.dateValiditePermis}
                    onChange={(e) => setForm({ ...form, dateValiditePermis: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={formLoading || gqlUnavailable}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {formLoading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des utilisateurs */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">Chargement...</div>
      ) : gqlUnavailable ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🔌</p>
          <p className="font-medium">api-gateway non disponible</p>
          <p className="text-sm mt-1">Démarrez l'api-gateway pour afficher et gérer les utilisateurs Keycloak</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const role = appRole(user.realmRoles)
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                            {user.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            {(user.firstName || user.lastName) && (
                              <p className="text-xs text-gray-400">{user.firstName} {user.lastName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{user.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {user.enabled ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggle(user)}
                            className={`text-xs font-medium ${user.enabled ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {user.enabled ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => { setResetUserId(user.id); setNewPassword('') }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Réinitialiser MDP
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-10 text-gray-400">Aucun utilisateur trouvé</div>
            )}
          </div>
        </div>
      )}

      {/* Modal réinitialisation MDP */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Réinitialiser le mot de passe</h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe *</label>
                <input
                  required type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setResetUserId(null); setNewPassword('') }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
