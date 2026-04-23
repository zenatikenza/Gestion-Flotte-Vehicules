import { useState } from 'react'
import { getFlags, setFlag, resetFlags, type FeatureFlags } from '../features/featureFlags'

interface FlagMeta {
  key: keyof FeatureFlags
  label: string
  description: string
  icon: string
}

const FLAG_META: FlagMeta[] = [
  {
    key: 'gpsSimulatorEnabled',
    label: 'Simulateur GPS',
    description: 'Active le simulateur GPS automatique pour les véhicules sans position réelle.',
    icon: '📡',
  },
  {
    key: 'geofencingAlertsEnabled',
    label: 'Alertes Géofencing',
    description: 'Affiche le cercle de géofencing et les alertes hors-zone sur la carte.',
    icon: '🗺️',
  },
  {
    key: 'maintenanceSignalEnabled',
    label: 'Signalement conducteur',
    description: 'Permet aux conducteurs de signaler des incidents via la page Signaler.',
    icon: '🚨',
  },
  {
    key: 'darkModeEnabled',
    label: 'Mode sombre',
    description: 'Active le thème sombre dans l\'interface (fonctionnalité future).',
    icon: '🌙',
  },
  {
    key: 'advancedStatsEnabled',
    label: 'Statistiques avancées',
    description: 'Affiche des statistiques supplémentaires sur le tableau de bord.',
    icon: '📊',
  },
]

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(getFlags)

  function toggle(key: keyof FeatureFlags) {
    const newVal = !flags[key]
    setFlag(key, newVal)
    setFlags((prev) => ({ ...prev, [key]: newVal }))
  }

  function handleReset() {
    resetFlags()
    setFlags(getFlags())
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags — Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Activez ou désactivez des fonctionnalités sans déploiement. Stocké dans le navigateur.
          </p>
        </div>
        <button
          onClick={handleReset}
          aria-label="Réinitialiser tous les feature flags aux valeurs par défaut"
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-300 font-medium"
        >
          🔄 Réinitialiser les valeurs par défaut
        </button>
      </div>

      <div className="space-y-3">
        {FLAG_META.map(({ key, label, description, icon }) => {
          const active = flags[key]
          return (
            <div
              key={key}
              className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-5 border border-gray-100"
            >
              <span className="text-3xl flex-shrink-0">{icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {active ? 'ACTIF' : 'INACTIF'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                aria-label={`${active ? 'Désactiver' : 'Activer'} ${label}`}
                aria-pressed={active}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  active ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    active ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>ℹ️ Note :</strong> Les changements sont appliqués immédiatement et persistent dans le navigateur
        (localStorage). Rechargez la page concernée pour voir l'effet sur les fonctionnalités actives.
      </div>
    </div>
  )
}
