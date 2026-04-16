import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { fetchMesAssignations, fetchVehicles, fetchPositionVehicule, activerSimulateurGPS } from '../api'
import type { Vehicle, Position } from '../types'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type Assignation = { id: string; vehiculeId: string; statut: string }

export default function MaLocalisation() {
  const [vehicule, setVehicule] = useState<Vehicle | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const assignations: Assignation[] = await fetchMesAssignations()
      const enCours = assignations.find((a) => a.statut === 'EN_COURS')
      if (!enCours) { setLoading(false); return }

      const [vehicles, pos] = await Promise.allSettled([
        fetchVehicles(),
        fetchPositionVehicule(enCours.vehiculeId),
      ])

      if (vehicles.status === 'fulfilled') {
        const v = (vehicles.value as Vehicle[]).find((v) => String(v.id) === enCours.vehiculeId)
        setVehicule(v ?? null)
      }

      if (pos.status === 'fulfilled') {
        if (!pos.value) {
          // Activer le simulateur si pas de position
          try {
            await activerSimulateurGPS(enCours.vehiculeId)
            const posRetry = await fetchPositionVehicule(enCours.vehiculeId)
            setPosition(posRetry)
          } catch { /* simulateur non disponible */ }
        } else {
          setPosition(pos.value as Position)
        }
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Ma Localisation</h2>
        {position && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Temps réel — MàJ toutes les 10s
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">⚠️ {error}</div>
      )}

      {!vehicule && !error ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">🚗</p>
          <p className="text-gray-500 font-medium">Aucun véhicule assigné</p>
          <p className="text-gray-400 text-sm mt-1">Votre localisation sera disponible dès qu'un véhicule vous est assigné</p>
        </div>
      ) : (
        <>
          {/* Infos véhicule + position */}
          {vehicule && (
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-gray-800 text-lg">{vehicule.licensePlate}</p>
                <p className="text-sm text-gray-600">{vehicule.brand} {vehicule.model}</p>
              </div>
              {position && (
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-800">{position.vitesse} km/h</p>
                  <p className="text-xs text-gray-500">
                    {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                  </p>
                  <p className="text-xs text-gray-400">MàJ {new Date(position.horodatage).toLocaleTimeString('fr-FR')}</p>
                </div>
              )}
            </div>
          )}

          {/* Carte */}
          {position ? (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={[position.latitude, position.longitude]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[position.latitude, position.longitude]}>
                    <Popup>
                      <strong>{vehicule?.licensePlate ?? 'Mon véhicule'}</strong>
                      <br />Vitesse : {position.vitesse} km/h
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">📍</p>
              <p>Position GPS non disponible pour ce véhicule</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
