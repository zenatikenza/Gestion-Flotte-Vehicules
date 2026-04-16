import { useState, useEffect, useCallback } from 'react'
import {
  fetchVehicles, createVehicle, updateVehicle, deleteVehicle,
  fetchInterventions, annulerIntervention,
} from '../api'

interface Vehicle {
  id: number
  licensePlate: string
  brand: string
  model: string
  mileage: number
  status: 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
}

interface Intervention {
  id: string
  vehiculeImmat: string
  statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'En service',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Hors service',
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  OUT_OF_SERVICE: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = {
  licensePlate: '',
  brand: '',
  model: '',
  mileage: 0,
  status: 'AVAILABLE' as Vehicle['status'],
}

/** Dialogue de confirmation de suppression avec info sur les maintenances actives */
function DeleteConfirmModal({
  vehicle,
  activeInterventions,
  onConfirm,
  onCancel,
  deleting,
}: {
  vehicle: Vehicle
  activeInterventions: Intervention[]
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer le véhicule</h3>
        <p className="text-sm text-gray-600 mb-4">
          Vous allez supprimer le véhicule{' '}
          <strong>{vehicle.licensePlate} — {vehicle.brand} {vehicle.model}</strong>.
        </p>
        {activeInterventions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ {activeInterventions.length} intervention(s) active(s) seront automatiquement{' '}
              <strong>annulée(s)</strong> :
            </p>
            <ul className="mt-2 space-y-1">
              {activeInterventions.map((i) => (
                <li key={i.id} className="text-xs text-amber-700">
                  • {i.id} — statut : {i.statut}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Suppression...' : 'Confirmer la suppression'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [vData, iData] = await Promise.allSettled([fetchVehicles(), fetchInterventions()])
      if (vData.status === 'fulfilled') setVehicles(Array.isArray(vData.value) ? vData.value : [])
      if (iData.status === 'fulfilled') setInterventions(Array.isArray(iData.value) ? iData.value : [])
      if (vData.status === 'rejected') throw vData.reason
    } catch (e) {
      setError(`Impossible de charger les véhicules : ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = vehicles.filter(
    (v) =>
      v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()),
  )

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setActionError(null)
    setShowModal(true)
  }

  function openEdit(v: Vehicle) {
    setEditingId(v.id)
    setForm({ licensePlate: v.licensePlate, brand: v.brand, model: v.model, mileage: v.mileage, status: v.status })
    setActionError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setActionError(null)
    try {
      if (editingId !== null) {
        await updateVehicle(editingId, form)
      } else {
        await createVehicle(form)
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /** Ouvre la modale de confirmation avec info sur les maintenances actives */
  function openDeleteConfirm(v: Vehicle) {
    setActionError(null)
    setDeleteTarget(v)
  }

  /** Annule les maintenances actives puis supprime le véhicule */
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setActionError(null)
    try {
      // 1. Annuler toutes les interventions PLANIFIEE ou EN_COURS pour ce véhicule
      const active = interventions.filter(
        (i) =>
          i.vehiculeImmat === deleteTarget.licensePlate &&
          (i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS'),
      )
      await Promise.allSettled(active.map((i) => annulerIntervention(i.id)))

      // 2. Supprimer le véhicule
      await deleteVehicle(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setActionError(`Impossible de supprimer ce véhicule : ${(e as Error).message}`)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const activeInterventionsForTarget = deleteTarget
    ? interventions.filter(
        (i) =>
          i.vehiculeImmat === deleteTarget.licensePlate &&
          (i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS'),
      )
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Véhicules</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          + Ajouter un véhicule
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <input
          type="text"
          placeholder="Rechercher (immatriculation, marque, modèle)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
                {['Immatriculation', 'Marque', 'Modèle', 'Kilométrage', 'Statut', 'Maintenances actives', 'Actions'].map((h) => (
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
                    Aucun véhicule trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const activeCount = interventions.filter(
                    (i) =>
                      i.vehiculeImmat === v.licensePlate &&
                      (i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS'),
                  ).length
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold">{v.licensePlate}</td>
                      <td className="px-4 py-3">{v.brand}</td>
                      <td className="px-4 py-3">{v.model}</td>
                      <td className="px-4 py-3">{v.mileage.toLocaleString('fr-FR')} km</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[v.status] ?? v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activeCount > 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {activeCount} active(s)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(v)}
                            className="text-primary-600 hover:text-primary-800 font-medium text-xs"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(v)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale création / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">
                {editingId !== null ? 'Modifier le véhicule' : 'Nouveau véhicule'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {actionError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Immatriculation</label>
                  <input
                    required
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Marque</label>
                  <input
                    required
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Modèle</label>
                  <input
                    required
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kilométrage</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle['status'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
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
                  {saving ? 'Enregistrement...' : editingId !== null ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {deleteTarget && (
        <DeleteConfirmModal
          vehicle={deleteTarget}
          activeInterventions={activeInterventionsForTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
