import { useState, useEffect, useCallback } from 'react'

const SERVICES = [
  { label: 'Vehicle Service', url: 'http://localhost:8081/actuator/health', port: '8081' },
  { label: 'Conductor Service', url: 'http://localhost:8082/health', port: '8082' },
  { label: 'Maintenance Service', url: 'http://localhost:8083/health', port: '8083' },
  { label: 'Localization Service', url: 'http://localhost:8084/health', port: '8084' },
  { label: 'API Gateway (GraphQL)', url: 'http://localhost:3000/health', port: '3000' },
  { label: 'Keycloak', url: 'http://localhost:8080/health/ready', port: '8080' },
  { label: 'Jaeger UI', url: 'http://localhost:16686/', port: '16686' },
]

type ServiceStatus = 'checking' | 'up' | 'down'

export default function Supervision() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({})
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkAll = useCallback(async () => {
    const newStatuses: Record<string, ServiceStatus> = {}
    for (const s of SERVICES) { newStatuses[s.label] = 'checking' }
    setStatuses({ ...newStatuses })

    await Promise.all(
      SERVICES.map(async (svc) => {
        try {
          // Utilisation de mode: 'no-cors' pour bypasser les restrictions du navigateur
          // Si le service répond, la promesse est résolue (même si on ne peut pas lire le body)
          await fetch(svc.url, { 
            method: 'GET', 
            mode: 'no-cors', 
            signal: AbortSignal.timeout(3000) 
          })
          newStatuses[svc.label] = 'up'
        } catch (error) {
          // Si le service est éteint ou injoignable, on tombe ici
          newStatuses[svc.label] = 'down'
        }
        setStatuses((prev) => ({ ...prev, [svc.label]: newStatuses[svc.label] }))
      })
    )
    setLastCheck(new Date())
  }, [])

  useEffect(() => {
    checkAll()
    const t = setInterval(checkAll, 30000)
    return () => clearInterval(t)
  }, [checkAll])

  const upCount = Object.values(statuses).filter((s) => s === 'up').length
  const downCount = Object.values(statuses).filter((s) => s === 'down').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Supervision des microservices</h2>
        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-xs text-gray-400">MàJ {lastCheck.toLocaleTimeString('fr-FR')}</span>
          )}
          <button
            onClick={checkAll}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
          >
            Vérifier maintenant
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-l-4 border-green-400">
          <p className="text-3xl font-bold text-green-600">{upCount}</p>
          <p className="text-xs text-gray-500 mt-1">Service(s) UP</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-l-4 border-red-400">
          <p className="text-3xl font-bold text-red-600">{downCount}</p>
          <p className="text-xs text-gray-500 mt-1">Service(s) DOWN</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border-l-4 border-gray-300">
          <p className="text-3xl font-bold text-gray-600">{SERVICES.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total services</p>
        </div>
      </div>

      {/* État de chaque service */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">État des services</h3>
        <div className="space-y-3">
          {SERVICES.map((svc) => {
            const status = statuses[svc.label] ?? 'checking'
            return (
              <div key={svc.label} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'up' ? 'bg-green-400' :
                    status === 'down' ? 'bg-red-400' :
                    'bg-yellow-300 animate-pulse'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-800">{svc.label}</p>
                    <p className="text-xs text-gray-400 font-mono">:{svc.port}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  status === 'up' ? 'bg-green-100 text-green-700' :
                  status === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {status === 'up' ? '● UP' : status === 'down' ? '● DOWN' : '● Vérification...'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Liens utiles */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Outils de monitoring</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="http://localhost:16686"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-medium text-gray-800">Jaeger Tracing UI</p>
              <p className="text-xs text-gray-500">Traces OpenTelemetry — port 16686</p>
            </div>
          </a>
          <a
            href="http://localhost:8080/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">🔑</span>
            <div>
              <p className="font-medium text-gray-800">Keycloak Admin Console</p>
              <p className="text-xs text-gray-500">Gestion des realms — port 8080</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}