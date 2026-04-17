import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import {
  fetchVehicles, fetchConducteurs, fetchInterventions, fetchPositions,
  fetchInterventionsSignalees, fetchTechniciens, updateIntervention,
} from '../api'
import type { Vehicle, Conducteur, Intervention, Position } from '../types'

type TechnicienUser = { id: string; username: string; firstName?: string; lastName?: string }

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const PARIS = { lat: 48.8566, lng: 2.3522 }
const GEOFENCE_RADIUS_M = 50_000

function distanceParis(lat: number, lng: number): number {
  const R = 6371e3
  const φ1 = (PARIS.lat * Math.PI) / 180
  const φ2 = (lat * Math.PI) / 180
  const Δφ = ((lat - PARIS.lat) * Math.PI) / 180
  const Δλ = ((lng - PARIS.lng) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function markerIcon(outside: boolean) {
  return L.divIcon({
    html: `<div style="background:${outside ? '#ef4444' : '#3b82f6'};color:white;border-radius:50%;
      width:26px;height:26px;display:flex;align-items:center;justify-content:center;
      font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">🚗</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'En service',
  MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service',
}
void STATUS_LABELS

export default function DashboardManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [alertes, setAlertes] = useState<Intervention[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [techniciens, setTechniciens] = useState<TechnicienUser[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Modal planification
  const [planModal, setPlanModal] = useState<Intervention | null>(null)
  const [planDate, setPlanDate] = useState('')
  const [planTechnicienId, setPlanTechnicienId] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [v, c, i, p, a, t] = await Promise.allSettled([
      fetchVehicles(), fetchConducteurs(), fetchInterventions(), fetchPositions(),
      fetchInterventionsSignalees(), fetchTechniciens(),
    ])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    if (c.status === 'fulfilled') setConducteurs(Array.isArray(c.value) ? c.value : [])
    if (i.status === 'fulfilled') setInterventions(Array.isArray(i.value) ? i.value : [])
    if (p.status === 'fulfilled') setPositions(Array.isArray(p.value) ? p.value : [])
    if (a.status === 'fulfilled') setAlertes(Array.isArray(a.value) ? a.value : [])
    if (t.status === 'fulfilled') setTechniciens(Array.isArray(t.value) ? (t.value as TechnicienUser[]) : [])
    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  async function handlePlanifier(e: React.FormEvent) {
    e.preventDefault()
    if (!planModal) return
    setPlanLoading(true)
    setPlanError(null)
    try {
      await updateIntervention(planModal.id, {
        statut: 'PLANIFIEE',
        datePlanifiee: new Date(planDate).toISOString(),
        ...(planTechnicienId ? { technicienId: planTechnicienId } : {}),
      })
      setPlanModal(null)
      setPlanDate('')
      setPlanTechnicienId('')
      await load()
    } catch (e) {
      setPlanError((e as Error).message)
    } finally {
      setPlanLoading(false)
    }
  }

  function formatTechnicien(i: Intervention): string {
    if (i.technicienNom) {
      return `${i.technicienPrenom ?? ''} ${i.technicienNom}`.trim()
    }
    return 'Non assigné'
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  const statusCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1; return acc
  }, {})

  const horsZone = positions.filter((p) => distanceParis(p.latitude, p.longitude) > GEOFENCE_RADIUS_M)
  const urgences = interventions.filter((i) => i.type === 'URGENCE' && (i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS'))

  const assignations: { conducteur: Conducteur; vehicule: Vehicle | undefined; vehiculeId: string }[] = []
  conducteurs.forEach((c) => {
    c.assignations?.forEach((a) => {
      if (a.statut === 'EN_COURS') {
        assignations.push({ conducteur: c, vehicule: vehicles.find((v) => String(v.id) === a.vehiculeId), vehiculeId: a.vehiculeId })
      }
    })
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Superviseur</h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {lastUpdate ? `MàJ ${lastUpdate.toLocaleTimeString('fr-FR')}` : '...'}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Vue superviseur</span>
        </div>
      </div>

      {/* Alertes critiques */}
      {(horsZone.length > 0 || urgences.length > 0) && (
        <div className="space-y-2">
          {horsZone.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-red-500 text-xl">🚨</span>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {horsZone.length} véhicule(s) hors zone géofencing (50 km autour de Paris)
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Véhicules : {horsZone.map((p) => {
                    const v = vehicles.find((v) => v.id === Number(p.vehiculeId))
                    return v ? v.licensePlate : `#${p.vehiculeId}`
                  }).join(', ')}
                </p>
              </div>
            </div>
          )}
          {urgences.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-orange-500 text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">
                  {urgences.length} intervention(s) URGENCE en attente
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Véhicules concernés : {urgences.map((i) => i.vehiculeImmat).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Alertes en attente (signalements conducteurs) ─────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            🔔 Alertes en attente
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            alertes.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {alertes.length} signalement(s)
          </span>
        </div>
        {alertes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Aucun signalement en attente</p>
        ) : (
          <div className="space-y-3">
            {alertes.map((alerte) => (
              <div key={alerte.id} className="border border-orange-200 bg-orange-50 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      alerte.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                      alerte.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{alerte.type}</span>
                    <span className="font-mono text-xs font-bold text-gray-700">{alerte.vehiculeImmat}</span>
                    <span className="text-xs text-gray-400">{new Date(alerte.datePlanifiee).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{alerte.description ?? 'Aucune description'}</p>
                </div>
                <button
                  onClick={() => {
                    setPlanModal(alerte)
                    setPlanDate(new Date(Date.now() + 3600_000).toISOString().slice(0, 16))
                    setPlanError(null)
                  }}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Planifier
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats flotte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Disponibles</p>
          <p className="text-3xl font-bold text-green-600">{statusCounts['AVAILABLE'] ?? 0}</p>
          <p className="text-xs text-gray-400">sur {vehicles.length} véhicules</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En service</p>
          <p className="text-3xl font-bold text-blue-600">{statusCounts['RESERVED'] ?? 0}</p>
          <p className="text-xs text-gray-400">{assignations.length} conducteur(s) assigné(s)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En maintenance</p>
          <p className="text-3xl font-bold text-yellow-600">{statusCounts['MAINTENANCE'] ?? 0}</p>
          <p className="text-xs text-gray-400">interventions planifiées</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Alertes / Urgences</p>
          <p className="text-3xl font-bold text-red-600">{alertes.length + horsZone.length}</p>
          <p className="text-xs text-gray-400">{alertes.length} signalées · {horsZone.length} hors zone</p>
        </div>
      </div>

      {/* Carte temps réel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Carte temps réel — flotte complète
          <span className="ml-2 text-sm font-normal text-gray-400">({positions.length} véhicule(s) tracqué(s))</span>
        </h3>
        <div className="h-80 rounded-lg overflow-hidden">
          <MapContainer center={[PARIS.lat, PARIS.lng]} zoom={9} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            <Circle center={[PARIS.lat, PARIS.lng]} radius={GEOFENCE_RADIUS_M}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 2, dashArray: '6 4' }} />
            {positions.map((pos) => {
              const outside = distanceParis(pos.latitude, pos.longitude) > GEOFENCE_RADIUS_M
              const v = vehicles.find((v) => v.id === Number(pos.vehiculeId))
              return (
                <Marker key={pos.vehiculeId} position={[pos.latitude, pos.longitude]} icon={markerIcon(outside)}>
                  <Popup>
                    <strong>{v ? `${v.licensePlate} — ${v.brand} ${v.model}` : `Véhicule ${pos.vehiculeId}`}</strong>
                    <br />Vitesse : {pos.vitesse} km/h
                    {outside && <p className="text-red-600 font-semibold mt-1">⚠️ Hors zone géofencing</p>}
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      {/* Assignations actives */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Assignations en cours
          <span className="ml-2 text-sm font-normal text-gray-400">({assignations.length})</span>
        </h3>
        {assignations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Aucune assignation active</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {assignations.map(({ conducteur: c, vehicule: v }, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {c.prenom[0]}{c.nom[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-gray-400">Permis {c.categoriePermis} — {c.numeroPermis}</p>
                  </div>
                </div>
                <div className="text-right">
                  {v ? (
                    <>
                      <p className="text-sm font-mono font-semibold text-gray-800">{v.licensePlate}</p>
                      <p className="text-xs text-gray-400">{v.brand} {v.model}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Véhicule introuvable</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suivi des interventions planifiées / en cours */}
      {(() => {
        const enCours = interventions.filter((i) => i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS')
        return (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Suivi des interventions
              <span className="ml-2 text-sm font-normal text-gray-400">({enCours.length})</span>
            </h3>
            {enCours.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aucune intervention active</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Statut', 'Véhicule', 'Type', 'Description', 'Date planifiée', 'Traité par'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enCours.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            i.statut === 'EN_COURS' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {i.statut === 'EN_COURS' ? 'En cours' : 'Planifiée'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold">{i.vehiculeImmat}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                            i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{i.type}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{i.description ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-xs">
                          {i.technicienNom ? (
                            <span className="text-blue-700 font-medium">{formatTechnicien(i)}</span>
                          ) : !i.technicienId && techniciens.length > 0 ? (
                            <select
                              defaultValue=""
                              onChange={async (e) => {
                                if (!e.target.value) return
                                try {
                                  await updateIntervention(i.id, { technicienId: e.target.value })
                                  await load()
                                } catch { /* ignore */ }
                              }}
                              className="border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            >
                              <option value="">— Assigner —</option>
                              {techniciens.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.username}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 italic">Non assigné</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* Historique des interventions terminées */}
      {(() => {
        const terminees = interventions.filter((i) => i.statut === 'TERMINEE').slice(-20).reverse()
        return terminees.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Historique des interventions terminées
              <span className="ml-2 text-sm font-normal text-gray-400">({terminees.length} dernières)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {terminees.map((i) => (
                <div key={i.id} className="border border-green-100 bg-green-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                        i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{i.type}</span>
                      <span className="font-mono text-xs font-bold text-gray-700">{i.vehiculeImmat}</span>
                    </div>
                    <span className="text-green-600 text-xs font-semibold">✓ Terminée</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div><span className="font-medium text-gray-500">Signalé :</span> {new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</div>
                    <div><span className="font-medium text-gray-500">Traité :</span> {i.dateTraitement ? new Date(i.dateTraitement).toLocaleDateString('fr-FR') : i.dateRealisation ? new Date(i.dateRealisation).toLocaleDateString('fr-FR') : '—'}</div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-500">Technicien : </span>
                      {i.technicienNom ? (
                        <span className="text-green-700 font-semibold">✓ {formatTechnicien(i)}</span>
                      ) : (
                        <span className="text-gray-400">Non assigné</span>
                      )}
                    </div>
                    {i.description && (
                      <div className="col-span-2 text-gray-500 italic truncate">"{i.description}"</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      })()}

      {/* Modal planification */}
      {planModal && (
        /* z-[2000] passe au-dessus de Leaflet qui utilise z-index jusqu'à 1000 */
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 2000 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Planifier l'intervention</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  planModal.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                  planModal.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{planModal.type}</span>
                <span className="font-mono text-sm font-bold text-gray-700">{planModal.vehiculeImmat}</span>
              </div>
              {planModal.description && (
                <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">"{planModal.description}"</p>
              )}
            </div>
            <form onSubmit={handlePlanifier} className="px-6 py-5 space-y-4">
              {planError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {planError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de planification</label>
                <input
                  required
                  type="datetime-local"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technicien assigné</label>
                <select
                  value={planTechnicienId}
                  onChange={(e) => setPlanTechnicienId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Non assigné —</option>
                  {techniciens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.username}
                    </option>
                  ))}
                </select>
                {techniciens.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Aucun technicien disponible (vérifiez la connexion api-gateway)</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setPlanModal(null); setPlanDate('') }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={planLoading}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {planLoading ? 'Enregistrement...' : '✓ Planifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
