import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { fetchVehicles, fetchConducteurs, fetchInterventions, fetchPositions } from '../api'
import type { Vehicle, Conducteur, Intervention, Position } from '../types'

// Fix Leaflet icons
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

export default function DashboardManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const load = useCallback(async () => {
    const [v, c, i, p] = await Promise.allSettled([
      fetchVehicles(), fetchConducteurs(), fetchInterventions(), fetchPositions(),
    ])
    if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value) ? v.value : [])
    if (c.status === 'fulfilled') setConducteurs(Array.isArray(c.value) ? c.value : [])
    if (i.status === 'fulfilled') setInterventions(Array.isArray(i.value) ? i.value : [])
    if (p.status === 'fulfilled') setPositions(Array.isArray(p.value) ? p.value : [])
    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

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
          <p className="text-xs text-gray-500 uppercase tracking-wide">Hors zone / Urgences</p>
          <p className="text-3xl font-bold text-red-600">{horsZone.length + urgences.length}</p>
          <p className="text-xs text-gray-400">{horsZone.length} hors zone · {urgences.length} urgences</p>
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
    </div>
  )
}
