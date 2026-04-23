import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchPositions, fetchVehicles, fetchPositionVehicule, activerSimulateurGPS } from '../api'
import { getFlags } from '../features/featureFlags'
import type { Position, Vehicle } from '../types'

// Fix icônes Leaflet avec Vite
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

function createIcon(outside: boolean) {
  return L.divIcon({
    html: `<div style="
      background:${outside ? '#ef4444' : '#3b82f6'};
      color:white;border-radius:50%;
      width:28px;height:28px;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.3)">🚗</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function FitBounds({ positions }: { positions: Position[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (positions.length > 0 && !done.current) {
      map.fitBounds(L.latLngBounds(positions.map((p) => [p.latitude, p.longitude])), { padding: [60, 60] })
      done.current = true
    }
  }, [positions, map])
  return null
}

export default function Localisation() {
  const flags = getFlags()
  const [positions, setPositions] = useState<Position[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gpsInitStatus, setGpsInitStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [gpsActivated, setGpsActivated] = useState(0)
  const [geofenceAlert, setGeofenceAlert] = useState<string>('')
  const initializedRef = useRef(false)

  const initGPS = useCallback(async (vehicleList: Vehicle[]) => {
    if (!flags.gpsSimulatorEnabled) return
    if (initializedRef.current || vehicleList.length === 0) return
    initializedRef.current = true
    setGpsInitStatus('running')

    let activated = 0
    await Promise.allSettled(
      vehicleList.map(async (v) => {
        try {
          const pos = await fetchPositionVehicule(v.id)
          if (!pos) {
            await activerSimulateurGPS(v.id.toString())
            activated++
          }
        } catch {
          try { await activerSimulateurGPS(v.id.toString()) } catch { /* ignore */ }
          activated++
        }
      }),
    )

    setGpsActivated(activated)
    setGpsInitStatus('done')
  }, [flags.gpsSimulatorEnabled])

  const load = useCallback(async () => {
    try {
      const [pos, veh] = await Promise.all([fetchPositions(), fetchVehicles()])
      const vehicleList: Vehicle[] = Array.isArray(veh) ? veh : []
      const posList: Position[] = Array.isArray(pos) ? pos : []
      setPositions(posList)
      setVehicles(vehicleList)
      setLastUpdate(new Date())
      setError(null)

      if (flags.geofencingAlertsEnabled) {
        const outside = posList.filter(
          (p) => distanceParis(p.latitude, p.longitude) > GEOFENCE_RADIUS_M,
        )
        if (outside.length > 0) {
          setGeofenceAlert(`⚠️ ${outside.length} véhicule(s) hors zone géofencing`)
        } else {
          setGeofenceAlert('')
        }
      }

      if (!initializedRef.current) {
        await initGPS(vehicleList)
      }
    } catch (e) {
      setError(`Erreur chargement positions : ${(e as Error).message}`)
    }
  }, [initGPS, flags.geofencingAlertsEnabled])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const outsideCount = flags.geofencingAlertsEnabled
    ? positions.filter((p) => distanceParis(p.latitude, p.longitude) > GEOFENCE_RADIUS_M).length
    : 0

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Localisation temps réel</h2>
        <div className="flex items-center gap-3">
          {gpsInitStatus === 'running' && (
            <span className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Activation GPS en cours...
            </span>
          )}
          {gpsInitStatus === 'done' && gpsActivated > 0 && (
            <span className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              ✓ {gpsActivated} véhicule(s) activé(s)
            </span>
          )}
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {lastUpdate ? `MàJ ${lastUpdate.toLocaleTimeString('fr-FR')}` : 'Connexion...'}
          </span>
          {flags.geofencingAlertsEnabled && outsideCount > 0 && (
            <span
              aria-live="polite"
              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
            >
              {geofenceAlert}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-3 flex gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Dans la zone (50 km autour de Paris)</span>
        </div>
        {flags.geofencingAlertsEnabled && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Hors zone géofencing</span>
          </div>
        )}
        <div className="ml-auto text-gray-400">{positions.length} véhicule(s) tracké(s)</div>
      </div>

      <div
        role="application"
        aria-label="Carte de localisation GPS"
        className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        <MapContainer
          center={[PARIS.lat, PARIS.lng]}
          zoom={9}
          style={{ height: '100%', width: '100%', minHeight: '500px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {flags.geofencingAlertsEnabled && (
            <Circle
              center={[PARIS.lat, PARIS.lng]}
              radius={GEOFENCE_RADIUS_M}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '6 4',
              }}
            />
          )}
          {positions.map((pos) => {
            const outside = flags.geofencingAlertsEnabled
              ? distanceParis(pos.latitude, pos.longitude) > GEOFENCE_RADIUS_M
              : false
            const vehicle = vehicles.find((v) => v.id === Number(pos.vehiculeId))
            return (
              <Marker
                key={pos.vehiculeId}
                position={[pos.latitude, pos.longitude]}
                icon={createIcon(outside)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>
                      {vehicle
                        ? `${vehicle.licensePlate} — ${vehicle.brand} ${vehicle.model}`
                        : `Véhicule ${pos.vehiculeId}`}
                    </strong>
                    <br />Vitesse : <strong>{pos.vitesse} km/h</strong>
                    <br />Lat : {pos.latitude.toFixed(5)} / Lng : {pos.longitude.toFixed(5)}
                    <br />MàJ : {new Date(pos.horodatage).toLocaleTimeString('fr-FR')}
                    {outside && (
                      <p className="mt-1 text-red-600 font-semibold">⚠️ Hors zone géofencing</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
          <FitBounds positions={positions} />
        </MapContainer>
      </div>
    </div>
  )
}
