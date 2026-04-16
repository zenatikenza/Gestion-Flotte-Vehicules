import { useState, useEffect, useCallback } from 'react'
import {
  fetchInterventions, createIntervention, terminerIntervention,
  annulerIntervention, deleteIntervention, fetchVehicles,
} from '../api'

interface Intervention {
  id: string
  vehiculeImmat: string
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'URGENCE'
  datePlanifiee: string
  description?: string
  cout?: number
  statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
  technicienId?: string
}

interface Vehicle {
  id: number
  licensePlate: string
}

const STATUT_LABELS = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const STATUT_COLORS = {
  PLANIFIEE: 'bg-blue-100 text-blue-700',
  EN_COURS: 'bg-yellow-100 text-yellow-700',
  TERMINEE: 'bg-green-100 text-green-700',
  ANNULEE: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS = {
  PREVENTIVE: 'Préventive',
  CORRECTIVE: 'Corrective',
  URGENCE: 'Urgence',
}

const EMPTY_FORM = {
  vehiculeImmat: '',
  type: 'PREVENTIVE' as Intervention['type'],
  datePlanifiee: new Date().toISOString().split('T')[0],
  description: '',
  cout: 0,
}

/** Raisons lisibles pour les actions refusées selon le statut */
function actionRefuseeMessage(action: string, statut: string): string {
  const s = STATUT_LABELS[statut as keyof typeof STATUT_LABELS] ?? statut
  const reasons: Record<string, string> = {
    terminer: `Impossible de terminer une intervention au statut "${s}". Seules les interventions planifiées ou en cours peuvent être terminées.`,
    annuler: `Impossible d'annuler une intervention au statut "${s}". Seules les interventions planifiées ou en cours peuvent être annulées.`,
    supprimer: `Impossible de supprimer une intervention au statut "${s}". Annulez-la d'abord avant de la supprimer.`,
  }
  return reasons[action] ?? `Action impossible sur une intervention au statut "${s}".`
}

export default function Maintenance() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('ALL')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [data, vData] = await Promise.all([fetchInterventions(), fetchVehicles()])
      setInterventions(Array.isArray(data) ? data : [])
      setVehicles(Array.isArray(vData) ? vData : [])
    } catch (e) {
      setError(`Impossible de charger les interventions : ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = interventions.filter(
    (i) => filterStatut === 'ALL' || i.statut === filterStatut,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setActionError(null)
    try {
      await createIntervention({
        ...form,
        datePlanifiee: form.datePlanifiee,
        cout: form.cout || undefined,
        description: form.description || undefined,
      })
      setShowModal(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setActionError(`Impossible de créer l'intervention : ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTerminer(i: Intervention) {
    if (i.statut !== 'PLANIFIEE' && i.statut !== 'EN_COURS') {
      setActionError(actionRefuseeMessage('terminer', i.statut))
      return
    }
    setActionError(null)
    try {
      await terminerIntervention(i.id)
      await load()
    } catch (e) {
      setActionError(`Impossible de terminer l'intervention : ${(e as Error).message}`)
    }
  }

  async function handleAnnuler(i: Intervention) {
    if (i.statut !== 'PLANIFIEE' && i.statut !== 'EN_COURS') {
      setActionError(actionRefuseeMessage('annuler', i.statut))
      return
    }
    if (!confirm(`Annuler l'intervention ${i.id} ?`)) return
    setActionError(null)
    try {
      await annulerIntervention(i.id)
      await load()
    } catch (e) {
      setActionError(`Impossible d'annuler l'intervention : ${(e as Error).message}`)
    }
  }

  async function handleDelete(i: Intervention) {
    if (i.statut === 'EN_COURS') {
      setActionError(actionRefuseeMessage('supprimer', i.statut))
      return
    }
    if (!confirm(`Supprimer définitivement l'intervention ${i.id} ?`)) return
    setActionError(null)
    try {
      await deleteIntervention(i.id)
      await load()
    } catch (e) {
      setActionError(`Impossible de supprimer l'intervention : ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Maintenance</h2>
        <button
          onClick={() => { setForm(EMPTY_FORM); setActionError(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          + Nouvelle intervention
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2 flex-wrap">
        {['ALL', 'PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatut === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'Toutes' : STATUT_LABELS[s as keyof typeof STATUT_LABELS]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
            {error} — <button onClick={load} className="underline">Réessayer</button>
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Véhicule', 'Type', 'Description', 'Date planifiée', 'Statut', 'Coût', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Aucune intervention trouvée
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{i.vehiculeImmat}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        i.type === 'URGENCE' ? 'bg-red-100 text-red-700' :
                        i.type === 'CORRECTIVE' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {TYPE_LABELS[i.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{i.description ?? '—'}</td>
                    <td className="px-4 py-3">{new Date(i.datePlanifiee).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[i.statut]}`}>
                        {STATUT_LABELS[i.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {i.cout != null ? `${i.cout.toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {(i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS') && (
                          <button
                            onClick={() => handleTerminer(i)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            Terminer
                          </button>
                        )}
                        {(i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS') && (
                          <button
                            onClick={() => handleAnnuler(i)}
                            className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                          >
                            Annuler
                          </button>
                        )}
                        {i.statut !== 'EN_COURS' && (
                          <button
                            onClick={() => handleDelete(i)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Supprimer
                          </button>
                        )}
                        {i.statut === 'EN_COURS' && (
                          <span
                            className="text-gray-300 text-xs font-medium cursor-not-allowed"
                            title="Impossible de supprimer une intervention en cours — terminez-la ou annulez-la d'abord"
                          >
                            Supprimer
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Nouvelle intervention</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {actionError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Immatriculation du véhicule
                </label>
                <select
                  required
                  value={form.vehiculeImmat}
                  onChange={(e) => setForm({ ...form, vehiculeImmat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Choisir un véhicule...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.licensePlate}>{v.licensePlate}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Intervention['type'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date planifiée</label>
                  <input
                    type="date"
                    required
                    value={form.datePlanifiee}
                    onChange={(e) => setForm({ ...form, datePlanifiee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  rows={3}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Coût estimé (€)</label>
                <input
                  type="number"
                  min={0}
                  value={form.cout}
                  onChange={(e) => setForm({ ...form, cout: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
