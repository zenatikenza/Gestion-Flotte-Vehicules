import { useState, useEffect, useCallback } from 'react'
import { fetchMesInterventions } from '../api'
import type { Intervention } from '../types'

export default function MonHistoriqueInterventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const all = await fetchMesInterventions()
      setInterventions(Array.isArray(all) ? all : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const terminees = interventions.filter((i) => i.statut === 'TERMINEE')
  const annulees = interventions.filter((i) => i.statut === 'ANNULEE')

  // Statistiques personnelles
  const coutTotal = terminees.reduce((s, i) => s + (i.cout ?? 0), 0)
  const urgences = interventions.filter((i) => i.type === 'URGENCE').length
  const correctives = interventions.filter((i) => i.type === 'CORRECTIVE').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mon Historique</h2>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          {terminees.length} terminée(s)
        </span>
      </div>

      {/* Stats personnelles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Terminées</p>
          <p className="text-3xl font-bold text-green-600">{terminees.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Urgences traitées</p>
          <p className="text-3xl font-bold text-red-600">{urgences}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Correctives</p>
          <p className="text-3xl font-bold text-orange-600">{correctives}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Coût total géré</p>
          <p className="text-2xl font-bold text-blue-600">{coutTotal.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Liste terminées */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Interventions terminées
          <span className="ml-2 text-sm font-normal text-gray-400">({terminees.length})</span>
        </h3>
        {terminees.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>Aucune intervention terminée pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {terminees.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{i.vehiculeImmat}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                    i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{i.type}</span>
                  {i.description && (
                    <span className="text-xs text-gray-500 truncate max-w-xs">{i.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  {i.cout != null && (
                    <span className="text-xs font-medium text-gray-700">{i.cout.toLocaleString('fr-FR')} €</span>
                  )}
                  <span className="text-xs text-gray-400">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interventions annulées */}
      {annulees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Interventions annulées
            <span className="ml-2 text-sm font-normal text-gray-400">({annulees.length})</span>
          </h3>
          <div className="space-y-2">
            {annulees.map((i) => (
              <div key={i.id} className="flex items-center gap-3 text-sm text-gray-400 py-2 border-b border-gray-50 last:border-0">
                <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <span className="font-mono text-xs">{i.vehiculeImmat}</span>
                <span className="text-xs">{i.type}</span>
                {i.description && <span className="truncate max-w-xs">{i.description}</span>}
                <span className="ml-auto text-xs">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
