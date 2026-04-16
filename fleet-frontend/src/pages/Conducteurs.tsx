import { useState, useEffect, useCallback } from 'react'
import {
  fetchConducteurs, createConducteur, deleteConducteur,
  fetchVehicles, assignerVehicule,
} from '../api'

interface Conducteur {
  id: string
  nom: string
  prenom: string
  numeroPermis: string
  categoriePermis: string
  dateValiditePermis: string
  actif?: boolean
  assignations?: { vehiculeId: string; statut: string }[]
}

interface Vehicle {
  id: number
  licensePlate: string
  brand: string
  model: string
  status: string
}

const EMPTY_FORM = {
  nom: '',
  prenom: '',
  numeroPermis: '',
  categoriePermis: 'B',
  dateValiditePermis: '',
}

/** Vérifie si le permis expire dans moins de 30 jours */
function isPermisExpireSoon(dateStr: string): boolean {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function isPermisExpire(dateStr: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

export default function Conducteurs() {
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [assignModal, setAssignModal] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [c, v] = await Promise.all([fetchConducteurs(), fetchVehicles()])
      setConducteurs(Array.isArray(c) ? c : [])
      setVehicles(Array.isArray(v) ? v : [])
    } catch (e) {
      setError(`Impossible de charger les données : ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = conducteurs.filter((c) =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    c.numeroPermis.toLowerCase().includes(search.toLowerCase()),
  )

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE')

  function getVehiculeAssigne(c: Conducteur): string | null {
    const active = c.assignations?.find((a) => a.statut === 'EN_COURS')
    return active?.vehiculeId ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Vérifier permis non expiré
    if (isPermisExpire(form.dateValiditePermis)) {
      setActionError('Le permis est déjà expiré. Veuillez saisir une date de validité future.')
      return
    }
    setSaving(true)
    setActionError(null)
    try {
      await createConducteur(form)
      setShowModal(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e) {
      setActionError(`Impossible de créer le conducteur : ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Conducteur) {
    const vehiculeId = getVehiculeAssigne(c)
    if (vehiculeId) {
      const vehicule = vehicles.find((v) => String(v.id) === vehiculeId)
      const immat = vehicule ? vehicule.licensePlate : `véhicule ${vehiculeId}`
      setActionError(
        `Impossible de supprimer ${c.prenom} ${c.nom} : ce conducteur est actuellement assigné au ${immat}. Désassignez-le d'abord.`,
      )
      return
    }
    if (!confirm(`Supprimer le conducteur ${c.prenom} ${c.nom} ?`)) return
    setActionError(null)
    try {
      await deleteConducteur(c.id)
      await load()
    } catch (e) {
      setActionError(`Impossible de supprimer ce conducteur : ${(e as Error).message}`)
    }
  }

  function openAssignModal(conducteurId: string) {
    if (availableVehicles.length === 0) {
      setActionError('Aucun véhicule disponible pour l\'assignation. Tous les véhicules sont en service ou en maintenance.')
      return
    }
    setActionError(null)
    setAssignModal(conducteurId)
    setSelectedVehicle('')
  }

  async function handleAssign() {
    if (!assignModal || !selectedVehicle) return
    setActionError(null)
    try {
      await assignerVehicule(assignModal, selectedVehicle)
      setAssignModal(null)
      setSelectedVehicle('')
      await load()
    } catch (e) {
      setActionError(`Impossible d'assigner le véhicule : ${(e as Error).message}`)
      setAssignModal(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Conducteurs</h2>
        <button
          onClick={() => { setForm(EMPTY_FORM); setActionError(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          + Ajouter un conducteur
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <input
          type="text"
          placeholder="Rechercher (nom, prénom, numéro permis)..."
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
                {['Nom', 'Prénom', 'N° Permis', 'Catégorie', 'Validité permis', 'Véhicule', 'Actions'].map((h) => (
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
                    Aucun conducteur trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const vehiculeId = getVehiculeAssigne(c)
                  const vehicule = vehicles.find((v) => String(v.id) === vehiculeId)
                  const permisExpire = isPermisExpire(c.dateValiditePermis)
                  const permisBientotExpire = isPermisExpireSoon(c.dateValiditePermis)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.nom}</td>
                      <td className="px-4 py-3">{c.prenom}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.numeroPermis}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                          {c.categoriePermis}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.dateValiditePermis ? (
                          <span className={`text-xs font-medium ${
                            permisExpire ? 'text-red-600' :
                            permisBientotExpire ? 'text-amber-600' :
                            'text-gray-500'
                          }`}>
                            {new Date(c.dateValiditePermis).toLocaleDateString('fr-FR')}
                            {permisExpire && ' ⚠️ Expiré'}
                            {permisBientotExpire && ' ⚠️ Expire bientôt'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {vehicule ? (
                          <span className="text-green-600 text-xs font-medium">
                            {vehicule.licensePlate}
                          </span>
                        ) : (
                          <button
                            onClick={() => openAssignModal(c.id)}
                            className="text-primary-600 hover:underline text-xs"
                          >
                            Assigner
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(c)}
                          className={`text-xs font-medium ${
                            vehiculeId
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-500 hover:text-red-700'
                          }`}
                          title={vehiculeId ? 'Désassignez le véhicule avant de supprimer ce conducteur' : undefined}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Nouveau conducteur</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {actionError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                  <input
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">N° de permis</label>
                  <input
                    required
                    value={form.numeroPermis}
                    onChange={(e) => setForm({ ...form, numeroPermis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie permis</label>
                  <select
                    value={form.categoriePermis}
                    onChange={(e) => setForm({ ...form, categoriePermis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {['A', 'B', 'C', 'D', 'BE', 'CE'].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Date de validité du permis
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dateValiditePermis}
                    onChange={(e) => setForm({ ...form, dateValiditePermis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  {form.dateValiditePermis && isPermisExpire(form.dateValiditePermis) && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Cette date est déjà expirée.</p>
                  )}
                  {form.dateValiditePermis && isPermisExpireSoon(form.dateValiditePermis) && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Le permis expire dans moins de 30 jours.</p>
                  )}
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
                  {saving ? 'Enregistrement...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal assignation */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Assigner un véhicule</h3>
            {availableVehicles.length === 0 ? (
              <p className="text-sm text-gray-500 mb-4">
                Aucun véhicule disponible. Tous les véhicules sont actuellement en service ou en maintenance.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  {availableVehicles.length} véhicule(s) disponible(s)
                </p>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4"
                >
                  <option value="">Choisir un véhicule disponible...</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.licensePlate} — {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              {availableVehicles.length > 0 && (
                <button
                  onClick={handleAssign}
                  disabled={!selectedVehicle}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Assigner
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
