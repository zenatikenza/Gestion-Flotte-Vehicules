import { useState, useEffect, useCallback } from 'react'
import { fetchVehicles, fetchConducteurs, assignerVehicule, desassignerConducteur } from '../api'
import type { Vehicle, Conducteur } from '../types'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'En service',
  MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service',
}
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
}

export default function Assignations() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal d'assignation
  const [assignModal, setAssignModal] = useState<{ conducteurId: string; nom: string } | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    const [v, c] = await Promise.allSettled([fetchVehicles(), fetchConducteurs()])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    if (c.status === 'fulfilled') setConducteurs(Array.isArray(c.value) ? c.value : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleAssigner(e: React.FormEvent) {
    e.preventDefault()
    if (!assignModal || !selectedVehicle) return
    setAssigning(true)
    setError(null)
    try {
      await assignerVehicule(assignModal.conducteurId, selectedVehicle)
      flash(`${assignModal.nom} assigné au véhicule avec succès.`)
      setAssignModal(null)
      setSelectedVehicle('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAssigning(false)
    }
  }

  async function handleDesassigner(conducteur: Conducteur) {
    if (!confirm(`Désassigner ${conducteur.prenom} ${conducteur.nom} ?`)) return
    setError(null)
    try {
      await desassignerConducteur(conducteur.id)
      flash(`${conducteur.prenom} ${conducteur.nom} désassigné.`)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const assignationsActives = conducteurs.flatMap((c) =>
    (c.assignations ?? [])
      .filter((a) => a.statut === 'EN_COURS')
      .map((a) => ({ conducteur: c, vehicule: vehicles.find((v) => String(v.id) === a.vehiculeId), assignation: a }))
  )

  const disponibles = vehicles.filter((v) => v.status === 'AVAILABLE')
  const conducteursSansAssignation = conducteurs.filter((c) =>
    !(c.assignations ?? []).some((a) => a.statut === 'EN_COURS')
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des Assignations</h2>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            {assignationsActives.length} active(s)
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">✅ {success}</div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{assignationsActives.length}</p>
          <p className="text-xs text-gray-500 mt-1">Assignations actives</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{disponibles.length}</p>
          <p className="text-xs text-gray-500 mt-1">Véhicules disponibles</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{conducteursSansAssignation.length}</p>
          <p className="text-xs text-gray-500 mt-1">Conducteurs libres</p>
        </div>
      </div>

      {/* Assignations en cours */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Assignations en cours
          <span className="ml-2 text-sm font-normal text-gray-400">({assignationsActives.length})</span>
        </h3>
        {assignationsActives.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Aucune assignation active</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignationsActives.map(({ conducteur: c, vehicule: v }, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {c.prenom[0]}{c.nom[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-gray-400">Permis {c.categoriePermis} — {c.numeroPermis}</p>
                  </div>
                  <span className="text-gray-300 mx-2">→</span>
                  {v ? (
                    <div>
                      <p className="font-mono font-semibold text-gray-800">{v.licensePlate}</p>
                      <p className="text-xs text-gray-500">{v.brand} {v.model}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Véhicule introuvable</p>
                  )}
                </div>
                <button
                  onClick={() => handleDesassigner(c)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50"
                >
                  Désassigner
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nouvelle assignation */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Conducteurs sans véhicule
          <span className="ml-2 text-sm font-normal text-gray-400">({conducteursSansAssignation.length})</span>
        </h3>
        {conducteursSansAssignation.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Tous les conducteurs sont assignés</p>
        ) : (
          <div className="space-y-3">
            {conducteursSansAssignation.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                    {c.prenom[0]}{c.nom[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-gray-400">Permis {c.categoriePermis}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (disponibles.length === 0) {
                      setError("Aucun véhicule disponible pour l'assignation.")
                      return
                    }
                    setAssignModal({ conducteurId: c.id, nom: `${c.prenom} ${c.nom}` })
                    setSelectedVehicle(String(disponibles[0]?.id ?? ''))
                  }}
                  disabled={disponibles.length === 0}
                  className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Assigner un véhicule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vue des véhicules par statut */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">État de la flotte</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Immatriculation', 'Modèle', 'Statut', 'Kilométrage'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{v.licensePlate}</td>
                  <td className="px-4 py-3 text-gray-600">{v.brand} {v.model}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.mileage.toLocaleString('fr-FR')} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal assignation */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Assigner un véhicule</h3>
            <p className="text-sm text-gray-500 mb-4">Conducteur : <strong>{assignModal.nom}</strong></p>
            <form onSubmit={handleAssigner} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Véhicule disponible</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {disponibles.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.licensePlate} — {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setAssignModal(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={assigning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {assigning ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
