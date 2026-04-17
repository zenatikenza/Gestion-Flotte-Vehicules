import { useState, useEffect, useCallback } from 'react'
import { fetchMesAssignations, fetchVehicles, fetchPositionVehicule, syncConducteurMe } from '../api'
import type { Vehicle, Position } from '../types'
import { getUsername } from '../keycloak'

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', RESERVED: 'En service',
  MAINTENANCE: 'En maintenance', OUT_OF_SERVICE: 'Hors service',
}
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
}

type Assignation = { id: string; vehiculeId: string; statut: string; dateDepart?: string }

export default function DashboardUtilisateur() {
  const [assignation, setAssignation] = useState<Assignation | null>(null)
  const [vehicule, setVehicule] = useState<Vehicle | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const username = getUsername()

  const load = useCallback(async () => {
    try {
      const assignations: Assignation[] = await fetchMesAssignations()
      const enCours = assignations.find((a) => a.statut === 'EN_COURS') ?? null
      setAssignation(enCours)

      if (enCours) {
        const [vehicles, pos] = await Promise.allSettled([
          fetchVehicles(),
          fetchPositionVehicule(enCours.vehiculeId),
        ])
        if (vehicles.status === 'fulfilled') {
          const v = (vehicles.value as Vehicle[]).find((v) => String(v.id) === enCours.vehiculeId)
          setVehicule(v ?? null)
        }
        if (pos.status === 'fulfilled') setPosition(pos.value as Position | null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    syncConducteurMe().catch(() => {})
    load()
  }, [load])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Bienvenue */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <p className="text-primary-200 text-sm">Bienvenue,</p>
        <h2 className="text-2xl font-bold mt-1">{username}</h2>
        <p className="text-primary-100 text-sm mt-1">Interface conducteur — Gestion de flotte</p>
      </div>

      {/* Mon véhicule assigné */}
      {!assignation || !vehicule ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <p className="text-5xl mb-3">🚗</p>
          <p className="text-gray-700 font-semibold text-lg">Aucun véhicule assigné</p>
          <p className="text-gray-400 text-sm mt-2">
            Contactez votre manager pour être assigné à un véhicule
          </p>
        </div>
      ) : (
        <>
          {/* Carte véhicule */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Mon véhicule</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-3xl">
                  🚗
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-900 text-xl">{vehicule.licensePlate}</p>
                  <p className="text-gray-600">{vehicule.brand} {vehicule.model}</p>
                  <p className="text-xs text-gray-400 mt-1">{vehicule.mileage.toLocaleString('fr-FR')} km</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[vehicule.status]}`}>
                {STATUS_LABELS[vehicule.status]}
              </span>
            </div>

            {assignation.dateDepart && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                Assigné depuis le {new Date(assignation.dateDepart).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
            )}
          </div>

          {/* Position GPS */}
          {position ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Position actuelle
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      MàJ {new Date(position.horodatage).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{position.vitesse}</p>
                  <p className="text-xs text-gray-400">km/h</p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/ma-localisation"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors text-center"
        >
          <span className="text-3xl">🗺️</span>
          <p className="text-sm font-medium text-gray-700">Ma Localisation</p>
          <p className="text-xs text-gray-400">Carte GPS en temps réel</p>
        </a>
        <a
          href="/signaler"
          className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl shadow-sm border border-red-100 hover:bg-red-50 transition-colors text-center"
        >
          <span className="text-3xl">🚨</span>
          <p className="text-sm font-medium text-gray-700">Signaler un incident</p>
          <p className="text-xs text-gray-400">Panne ou problème technique</p>
        </a>
      </div>

      {/* Info utile */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Besoin d'aide ?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Pour signaler un problème technique, utilisez le bouton "Signaler un incident"</li>
          <li>• Pour une modification d'assignation, contactez votre manager</li>
          <li>• En cas d'urgence sur route, appelez directement le gestionnaire de flotte</li>
        </ul>
      </div>
    </div>
  )
}
