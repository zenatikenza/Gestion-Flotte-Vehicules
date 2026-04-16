import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { fetchVehicles, fetchConducteurs, fetchInterventions } from '../api'
import type { Vehicle, Conducteur, Intervention } from '../types'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e', RESERVED: '#3b82f6',
  MAINTENANCE: '#f59e0b', OUT_OF_SERVICE: '#ef4444',
}
const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'En service',
  MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service',
}

export default function StatistiquesFlotte() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [v, c, i] = await Promise.allSettled([fetchVehicles(), fetchConducteurs(), fetchInterventions()])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    if (c.status === 'fulfilled') setConducteurs(Array.isArray(c.value) ? c.value : [])
    if (i.status === 'fulfilled') setInterventions(Array.isArray(i.value) ? i.value : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  // Statistiques calculées
  const statusCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1; return acc
  }, {})

  const pieData = Object.entries(statusCounts).map(([s, count]) => ({
    name: STATUS_LABELS[s] ?? s, value: count, color: STATUS_COLORS[s] ?? '#6b7280',
  }))

  const tauxDispo = vehicles.length > 0
    ? Math.round(((statusCounts['AVAILABLE'] ?? 0) / vehicles.length) * 100)
    : 0

  const assignationsActives = conducteurs.reduce((n, c) =>
    n + (c.assignations ?? []).filter((a) => a.statut === 'EN_COURS').length, 0)

  const coutTotal = interventions
    .filter((i) => i.statut === 'TERMINEE' && i.cout != null)
    .reduce((s, i) => s + (i.cout ?? 0), 0)

  // Interventions par type
  const byType = interventions.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1; return acc
  }, {})
  const typeData = Object.entries(byType).map(([type, count]) => ({ type, count }))

  // Interventions par statut
  const byStatut = interventions.reduce<Record<string, number>>((acc, i) => {
    acc[i.statut] = (acc[i.statut] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Statistiques de la Flotte</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          Vue superviseur
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Taux disponibilité</p>
          <p className="text-3xl font-bold text-green-600">{tauxDispo}%</p>
          <p className="text-xs text-gray-400 mt-1">objectif {'>'} 70%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Taux utilisation</p>
          <p className="text-3xl font-bold text-blue-600">
            {vehicles.length > 0 ? Math.round(((statusCounts['RESERVED'] ?? 0) / vehicles.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{assignationsActives} véhicule(s) en mission</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En maintenance</p>
          <p className="text-3xl font-bold text-yellow-600">{statusCounts['MAINTENANCE'] ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            {interventions.filter((i) => i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS').length} ticket(s) actif(s)
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Coût maintenance</p>
          <p className="text-2xl font-bold text-purple-600">{coutTotal.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">interventions terminées</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition statuts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Répartition par statut</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">Aucune donnée</p>
          )}
        </div>

        {/* Interventions par type */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Interventions par type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Interventions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">Aucune intervention</p>
          )}
        </div>
      </div>

      {/* Tableau de bord global */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(byStatut).map(([statut, count]) => (
          <div key={statut} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{count}</p>
            <p className="text-xs text-gray-500 mt-1">{statut}</p>
          </div>
        ))}
      </div>

      {/* Coûts par type */}
      {interventions.some((i) => i.cout != null) && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Coûts de maintenance par type</h3>
          <div className="space-y-3">
            {Object.entries(
              interventions
                .filter((i) => i.statut === 'TERMINEE' && i.cout != null)
                .reduce<Record<string, number>>((acc, i) => {
                  acc[i.type] = (acc[i.type] ?? 0) + (i.cout ?? 0); return acc
                }, {})
            ).map(([type, cout]) => (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                  type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{type}</span>
                <span className="font-semibold text-gray-800">{cout.toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
