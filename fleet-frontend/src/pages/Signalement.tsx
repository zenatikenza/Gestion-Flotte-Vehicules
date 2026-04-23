import { useState, useCallback, useEffect } from 'react'
import { fetchMesAssignations, fetchVehicle, signalerIntervention } from '../api'
import { getFlags } from '../features/featureFlags'

type Assignation = { id: string; vehiculeId: string; statut: string }

const TYPES_INCIDENT = [
  { value: 'URGENCE',    label: 'Urgence / Panne immobilisante',   icon: '🚨', color: 'border-red-300 bg-red-50'    },
  { value: 'CORRECTIVE', label: 'Problème technique à corriger',   icon: '⚠️', color: 'border-orange-300 bg-orange-50' },
  { value: 'PREVENTIVE', label: 'Signalement préventif',           icon: 'ℹ️', color: 'border-blue-300 bg-blue-50'  },
]

export default function Signalement() {
  const flags = getFlags()
  const [assignation, setAssignation] = useState<Assignation | null>(null)
  const [vehiculeLabel, setVehiculeLabel] = useState<string | null>(null)
  const [licensePlate, setLicensePlate] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [type, setType]         = useState('URGENCE')
  const [message, setMessage]   = useState('')
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // ── Chargement de l'assignation EN_COURS ──────────────────────────────────
  // fetchMesAssignations() = GET /conducteurs/me/assignations (avec token JWT).
  // C'est le même endpoint que DashboardUtilisateur — prouvé fonctionnel.
  //
  // Ancienne tentative via fetchConducteurs() + filtre JS sur keycloakUserId
  // échouait car keycloakUserId est nullable en DB : la comparaison
  // null === 'uuid-keycloak' retourne toujours false.
  const loadVehicule = useCallback(async () => {
    try {
      const assignations: Assignation[] = await fetchMesAssignations()
      const enCours = assignations.find((a) => a.statut === 'EN_COURS') ?? null
      setAssignation(enCours)

      // Enrichissement d'affichage : récupère le libellé lisible du véhicule.
      // fetchVehicles() passe via authFetch → keycloak.token (token correct).
      // Si le vehicle-service est indisponible, on affiche l'ID brut → pas bloquant.
      if (enCours) {
        fetchVehicle(enCours.vehiculeId)
          .then((v: { licensePlate: string; brand: string; model: string }) => {
            setLicensePlate(v.licensePlate)
            setVehiculeLabel(`${v.licensePlate} — ${v.brand} ${v.model}`)
          })
          .catch(() => setVehiculeLabel(enCours.vehiculeId))
      }
    } catch {
      // Erreur réseau : reste dans l'état "aucun véhicule"
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVehicule() }, [loadVehicule])

  // ── Soumission ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // On vérifie uniquement l'assignation EN_COURS — pas l'immatriculation.
    // vehiculeId (ID numérique du véhicule) est utilisé directement comme
    // référence dans l'intervention, ce qui est cohérent avec le reste de l'app.
    if (!assignation) {
      setError('Aucun véhicule assigné — impossible de soumettre un signalement.')
      return
    }

    setSending(true)
    setError(null)
    try {
      await signalerIntervention({
        vehiculeImmat: licensePlate ?? assignation.vehiculeId,
        description: message,
        type,
      })
      setSent(true)
      setMessage('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
  }

  if (!flags.maintenanceSignalEnabled) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900">Signaler un incident</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-gray-700 font-medium text-lg">Fonctionnalité désactivée</p>
          <p className="text-gray-500 text-sm mt-2">
            Le signalement d'incidents est temporairement désactivé par l'administrateur.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900">Signaler un incident</h2>

      {!assignation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-4xl mb-2">🚗</p>
          <p className="text-yellow-800 font-medium">Aucun véhicule assigné</p>
          <p className="text-yellow-600 text-sm mt-1">
            Vous devez être assigné à un véhicule pour soumettre un signalement
          </p>
        </div>
      )}

      {assignation && (
        <>
          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">✅ Signalement envoyé avec succès</p>
              <p className="text-green-600 text-sm mt-1">
                Votre responsable a été notifié. Une intervention sera planifiée.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-3 text-sm text-green-700 underline hover:text-green-900"
              >
                Soumettre un autre signalement
              </button>
            </div>
          )}

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <span className="text-2xl">🚗</span>
                <div>
                  <p className="text-xs text-gray-500">Véhicule concerné</p>
                  <p className="font-mono font-bold text-gray-800">
                    {vehiculeLabel ?? `ID ${assignation.vehiculeId}`}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Type d'incident
                </label>
                <div className="space-y-3">
                  {TYPES_INCIDENT.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        type === t.value ? t.color + ' border-opacity-100' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className={`font-medium text-sm ${type === t.value ? 'text-gray-900' : 'text-gray-600'}`}>
                        {t.label}
                      </span>
                      {type === t.value && <span className="ml-auto text-green-600">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description du problème *
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Décrivez précisément le problème observé : symptômes, circonstances, localisation..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !message.trim()}
                className={`w-full py-4 rounded-xl font-semibold text-white text-sm transition-colors ${
                  type === 'URGENCE'
                    ? 'bg-red-600 hover:bg-red-700'
                    : type === 'CORRECTIVE'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {sending ? 'Envoi en cours...' : '📤 Envoyer le signalement'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
