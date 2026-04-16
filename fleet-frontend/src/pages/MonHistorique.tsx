import { useState, useEffect, useCallback } from 'react'
import { fetchMesAssignations, fetchVehicles } from '../api'
import type { Vehicle } from '../types'

type Assignation = {
  id: string; vehiculeId: string; statut: string
  dateDepart?: string; dateRetour?: string
}

const STATUT_COLORS: Record<string, string> = {
  EN_COURS: 'bg-blue-100 text-blue-700',
  TERMINEE: 'bg-green-100 text-green-700',
  ANNULEE: 'bg-gray-100 text-gray-500',
}

export default function MonHistorique() {
  const [assignations, setAssignations] = useState<Assignation[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [a, v] = await Promise.allSettled([fetchMesAssignations(), fetchVehicles()])
    if (a.status === 'fulfilled') setAssignations(Array.isArray(a.value) ? a.value : [])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const terminees = assignations.filter((a) => a.statut === 'TERMINEE')
  const enCours = assignations.filter((a) => a.statut === 'EN_COURS')

  function daysBetween(start?: string, end?: string) {
    if (!start) return null
    const s = new Date(start)
    const e = end ? new Date(end) : new Date()
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mon Historique</h2>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
          {assignations.length} assignation(s) au total
        </span>
      </div>

      {/* Stats personnelles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{enCours.length}</p>
          <p className="text-xs text-gray-500 mt-1">En cours</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{terminees.length}</p>
          <p className="text-xs text-gray-500 mt-1">Terminées</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{assignations.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
      </div>

      {/* Liste de toutes les assignations */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Historique des assignations</h3>
        {assignations.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>Aucune assignation dans votre historique</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignations.map((a) => {
              const v = vehicles.find((v) => String(v.id) === a.vehiculeId)
              const duree = daysBetween(a.dateDepart, a.dateRetour)
              return (
                <div key={a.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                        🚗
                      </div>
                      <div>
                        {v ? (
                          <>
                            <p className="font-mono font-bold text-gray-800">{v.licensePlate}</p>
                            <p className="text-sm text-gray-600">{v.brand} {v.model}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Véhicule ID: {a.vehiculeId}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[a.statut]}`}>
                      {a.statut === 'EN_COURS' ? 'En cours' : a.statut === 'TERMINEE' ? 'Terminée' : 'Annulée'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Début : {a.dateDepart ? new Date(a.dateDepart).toLocaleDateString('fr-FR') : '—'}
                    </span>
                    {a.dateRetour && (
                      <span>Fin : {new Date(a.dateRetour).toLocaleDateString('fr-FR')}</span>
                    )}
                    {duree !== null && (
                      <span className="ml-auto bg-gray-50 px-2 py-0.5 rounded">{duree} jour(s)</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
