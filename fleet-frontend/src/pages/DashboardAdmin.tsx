import { useState, useEffect, useCallback } from 'react'
import { fetchVehicles, fetchConducteurs, fetchInterventions } from '../api'
import type { Vehicle, Conducteur, Intervention } from '../types'

function StatCard({
  title, value, icon, color, sub,
}: { title: string; value: number | string; icon: string; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`text-2xl p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const SERVICE_PORTS = [
  { label: 'Vehicle Service', port: '8081', url: 'http://localhost:8081' },
  { label: 'Conductor Service', port: '8082', url: 'http://localhost:8082' },
  { label: 'Maintenance Service', port: '8083', url: 'http://localhost:8083' },
  { label: 'Localization Service', port: '8084', url: 'http://localhost:8084' },
  { label: 'API Gateway (GraphQL)', port: '3000', url: 'http://localhost:3000' },
  { label: 'Keycloak', port: '8080', url: 'http://localhost:8080' },
]

export default function DashboardAdmin() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [v, c, i] = await Promise.allSettled([
      fetchVehicles(), fetchConducteurs(), fetchInterventions(),
    ])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    if (c.status === 'fulfilled') setConducteurs(Array.isArray(c.value) ? c.value : [])
    if (i.status === 'fulfilled') setInterventions(Array.isArray(i.value) ? i.value : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const statusCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1; return acc
  }, {})

  const assignationsActives = conducteurs.reduce((n, c) =>
    n + (c.assignations ?? []).filter((a) => a.statut === 'EN_COURS').length, 0)

  const interventionsActives = interventions.filter(
    (i) => i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS',
  )

  const tauxDispo = vehicles.length > 0
    ? Math.round(((statusCounts['AVAILABLE'] ?? 0) / vehicles.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrateur</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
          Supervision complète
        </span>
      </div>

      {/* Stats globales flotte — lecture seule */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total véhicules" value={vehicles.length} icon="🚗" color="bg-blue-50" sub={`${tauxDispo}% disponibles`} />
        <StatCard title="Disponibles" value={statusCounts['AVAILABLE'] ?? 0} icon="✅" color="bg-green-50" />
        <StatCard title="En maintenance" value={statusCounts['MAINTENANCE'] ?? 0} icon="🔧" color="bg-yellow-50" />
        <StatCard title="Hors service" value={statusCounts['OUT_OF_SERVICE'] ?? 0} icon="🚫" color="bg-red-50" />
        <StatCard title="Conducteurs" value={conducteurs.length} icon="👤" color="bg-purple-50" sub={`${assignationsActives} assigné(s)`} />
        <StatCard title="Interventions actives" value={interventionsActives.length} icon="⚠️" color="bg-orange-50" />
        <StatCard title="Véhicules en service" value={statusCounts['RESERVED'] ?? 0} icon="🔗" color="bg-indigo-50" />
        <StatCard title="Taux dispo." value={`${tauxDispo}%`} icon="📊" color="bg-teal-50" sub="objectif > 70%" />
      </div>

      {/* Accès rapide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/utilisateurs"
          className="flex items-center gap-4 p-5 bg-white border border-purple-100 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
        >
          <span className="text-3xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900">Gestion des utilisateurs</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Créer des comptes, activer/désactiver, réinitialiser les mots de passe
            </p>
          </div>
        </a>
        <a
          href="/supervision"
          className="flex items-center gap-4 p-5 bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
        >
          <span className="text-3xl">🖥️</span>
          <div>
            <p className="font-semibold text-gray-900">Supervision des microservices</p>
            <p className="text-xs text-gray-500 mt-0.5">
              État de santé des services, logs OpenTelemetry
            </p>
          </div>
        </a>
      </div>

      {/* Récapitulatif interventions récentes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Interventions récentes
          <span className="ml-2 text-sm font-normal text-gray-400">({interventions.length} total)</span>
        </h3>
        {interventions.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Aucune intervention</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Véhicule', 'Type', 'Description', 'Date', 'Statut', 'Coût'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interventions.slice(0, 10).map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs font-semibold">{i.vehiculeImmat}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                        i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{i.type}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{i.description ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        i.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                        i.statut === 'EN_COURS' ? 'bg-yellow-100 text-yellow-700' :
                        i.statut === 'ANNULEE' ? 'bg-gray-100 text-gray-500' :
                        'bg-blue-100 text-blue-700'
                      }`}>{i.statut}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-xs">
                      {i.cout != null ? `${i.cout.toLocaleString('fr-FR')} €` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architecture microservices */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Architecture microservices</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SERVICE_PORTS.map(({ label, port }) => (
            <div key={port} className="border border-gray-100 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-400 mt-1">:{port}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
