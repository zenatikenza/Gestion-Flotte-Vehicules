import { useState, useEffect, useCallback } from 'react'
import { fetchMesInterventions, fetchVehicles, demarrerIntervention, terminerIntervention, annulerIntervention } from '../api'
import keycloak from '../keycloak'
import type { Vehicle, Intervention } from '../types'

const STATUT_COLORS: Record<string, string> = {
  SIGNALEE: 'bg-purple-100 text-purple-700',
  PLANIFIEE: 'bg-blue-100 text-blue-700',
  EN_COURS: 'bg-yellow-100 text-yellow-700',
  TERMINEE: 'bg-green-100 text-green-700',
  ANNULEE: 'bg-gray-100 text-gray-500',
}

export default function MesInterventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [i, v] = await Promise.allSettled([fetchMesInterventions(), fetchVehicles()])
    if (i.status === 'fulfilled') setInterventions(Array.isArray(i.value) ? i.value : [])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function getTechnicienInfo() {
    console.log('Token claims:', {
      sub: keycloak.tokenParsed?.sub,
      given_name: keycloak.tokenParsed?.given_name,
      family_name: keycloak.tokenParsed?.family_name,
      preferred_username: keycloak.tokenParsed?.preferred_username,
      name: keycloak.tokenParsed?.name,
    })
    const nom = keycloak.tokenParsed?.family_name || keycloak.tokenParsed?.preferred_username || ''
    const prenom = keycloak.tokenParsed?.given_name || ''
    return { technicienNom: nom, technicienPrenom: prenom }
  }

  async function handleDemarrer(i: Intervention) {
    setActionError(null)
    try {
      await demarrerIntervention(i.id, getTechnicienInfo())
      setActionSuccess(`Intervention démarrée.`)
      setTimeout(() => setActionSuccess(null), 3000)
      await load()
    } catch (e) { setActionError((e as Error).message) }
  }

  async function handleTerminer(i: Intervention) {
    setActionError(null)
    try {
      await terminerIntervention(i.id, getTechnicienInfo())
      setActionSuccess(`Intervention terminée.`)
      setTimeout(() => setActionSuccess(null), 3000)
      await load()
    } catch (e) { setActionError((e as Error).message) }
  }

  async function handleAnnuler(i: Intervention) {
    if (!confirm('Annuler cette intervention ?')) return
    setActionError(null)
    try {
      await annulerIntervention(i.id)
      setActionSuccess(`Intervention annulée.`)
      setTimeout(() => setActionSuccess(null), 3000)
      await load()
    } catch (e) { setActionError((e as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const actives = interventions.filter((i) => i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mes Interventions</h2>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
          {actives.length} à traiter
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          ⚠️ {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">✅ {actionSuccess}</div>
      )}

      {/* Urgences */}
      {actives.filter((i) => i.type === 'URGENCE').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">🚨 Urgences à traiter</h3>
          <div className="space-y-2">
            {actives.filter((i) => i.type === 'URGENCE').map((i) => (
              <div key={i.id} className="bg-white rounded-lg px-4 py-3 flex items-center justify-between border border-red-100">
                <div>
                  <span className="font-mono text-xs font-bold text-gray-700">{i.vehiculeImmat}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-sm text-gray-600">{i.description ?? '—'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTerminer(i)} className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Terminer</button>
                  <button onClick={() => handleAnnuler(i)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Annuler</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des interventions actives */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Interventions à traiter
          <span className="ml-2 text-sm font-normal text-gray-400">({actives.length})</span>
        </h3>
        {actives.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-500 font-medium">Aucune intervention en attente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Statut', 'Véhicule', 'Type', 'Description', 'Date planifiée', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actives.map((i) => {
                  const v = vehicles.find((v) => v.licensePlate === i.vehiculeImmat)
                  return (
                    <tr key={i.id} className={`hover:bg-gray-50 ${i.type === 'URGENCE' ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[i.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                          {i.statut === 'PLANIFIEE' ? 'Planifiée' : i.statut === 'EN_COURS' ? 'En cours' : i.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-bold">{i.vehiculeImmat}</p>
                        {v && <p className="text-xs text-gray-400">{v.brand} {v.model}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                          i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{i.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{i.description ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {i.statut === 'PLANIFIEE' && (
                            <button onClick={() => handleDemarrer(i)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">▶ Démarrer</button>
                          )}
                          {i.statut === 'EN_COURS' && (
                            <button onClick={() => handleTerminer(i)} className="text-green-600 hover:text-green-800 text-xs font-medium">✓ Terminer</button>
                          )}
                          <button onClick={() => handleAnnuler(i)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Annuler</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
