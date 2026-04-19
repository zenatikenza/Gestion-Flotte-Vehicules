import { getToken, getUserId } from './keycloak'

const VEHICLE_URL = 'http://127.0.0.1:8081/api/vehicles'
const CONDUCTOR_URL = 'http://127.0.0.1:8082/api/conducteurs'
const MAINTENANCE_URL = 'http://127.0.0.1:8083/api/interventions'
const POSITION_URL = 'http://127.0.0.1:8084/api/positions'

/** Messages d'erreur lisibles par statut HTTP */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Requête invalide — vérifiez les données saisies.',
  401: 'Session expirée — rechargez la page pour vous reconnecter.',
  403: "Accès refusé — vous n'avez pas les droits nécessaires pour cette action.",
  404: 'Ressource introuvable.',
  409: "Conflit — cet élément existe déjà ou est lié à d'autres données.",
  422: 'Données invalides — vérifiez les champs obligatoires.',
  500: 'Erreur serveur interne — réessayez dans quelques instants.',
  503: 'Service temporairement indisponible.',
}

async function parseError(res: Response, context: string): Promise<Error> {
  const friendly = HTTP_ERROR_MESSAGES[res.status]
  try {
    const body = await res.json()
    const detail = body?.message || body?.error || body?.detail || body?.errorMessage
    if (detail) return new Error(detail)
  } catch { /* ignore parse error */ }
  return new Error(friendly ?? `${context} : erreur ${res.status}`)
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}

// ── Vehicles ────────────────────────────────────────────────────────────────

export async function fetchVehicles() {
  const res = await authFetch(VEHICLE_URL)
  if (!res.ok) throw await parseError(res, 'Chargement des véhicules')
  return res.json()
}

export async function fetchVehicle(id: string | number) {
  const res = await authFetch(`${VEHICLE_URL}/${id}`)
  if (!res.ok) throw await parseError(res, 'Chargement du véhicule')
  return res.json()
}

export async function createVehicle(data: {
  licensePlate: string
  brand: string
  model: string
  mileage: number
  status: string
}) {
  const res = await authFetch(VEHICLE_URL, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, 'Création du véhicule')
  return res.json()
}

export async function updateVehicle(id: string | number, data: object) {
  const res = await authFetch(`${VEHICLE_URL}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, 'Modification du véhicule')
  return res.json()
}

export async function deleteVehicle(id: string | number) {
  const res = await authFetch(`${VEHICLE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await parseError(res, 'Suppression du véhicule')
}

// ── Conducteurs ──────────────────────────────────────────────────────────────

export async function fetchConducteurs() {
  const res = await authFetch(CONDUCTOR_URL)
  if (!res.ok) throw await parseError(res, 'Chargement des conducteurs')
  return res.json()
}

export async function createConducteur(data: {
  nom: string
  prenom: string
  numeroPermis: string
  categoriePermis: string
  dateValiditePermis: string
  keycloakUserId?: string
}) {
  const res = await authFetch(CONDUCTOR_URL, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, 'Création du conducteur')
  return res.json()
}

export async function updateConducteur(id: string, data: object) {
  const res = await authFetch(`${CONDUCTOR_URL}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, 'Modification du conducteur')
  return res.json()
}

export async function deleteConducteur(id: string) {
  const res = await authFetch(`${CONDUCTOR_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await parseError(res, 'Suppression du conducteur')
}

export async function fetchMesAssignations() {
  const res = await authFetch(`${CONDUCTOR_URL}/me/assignations`)
  if (!res.ok) throw await parseError(res, 'Chargement de mes assignations')
  return res.json()
}

export async function syncConducteurMe(): Promise<void> {
  await authFetch(`${CONDUCTOR_URL}/me/sync`, { method: 'PUT' })
}

export async function assignerVehicule(conducteurId: string, vehiculeId: string) {
  const res = await authFetch(`${CONDUCTOR_URL}/${conducteurId}/assigner/${vehiculeId}`, {
    method: 'POST',
  })
  if (!res.ok) throw await parseError(res, 'Assignation du véhicule')
  return res.json()
}

export async function desassignerConducteur(conducteurId: string) {
  const res = await authFetch(`${CONDUCTOR_URL}/${conducteurId}/assigner`, { method: 'DELETE' })
  if (!res.ok) throw await parseError(res, 'Désassignation du conducteur')
}

// ── Maintenance ──────────────────────────────────────────────────────────────

export async function fetchInterventions() {
  const res = await authFetch(MAINTENANCE_URL)
  if (!res.ok) throw await parseError(res, 'Chargement des interventions')
  return res.json()
}

export async function fetchInterventionsSignalees() {
  const res = await authFetch(`${MAINTENANCE_URL}?statut=SIGNALEE`)
  if (!res.ok) throw await parseError(res, 'Chargement des alertes')
  return res.json()
}

export async function fetchMesInterventions() {
  const myId = getUserId()
  const res = await authFetch(`${MAINTENANCE_URL}?technicienId=${myId}`)
  if (!res.ok) throw await parseError(res, 'Chargement de mes interventions')
  return res.json()
}

export async function createIntervention(data: {
  vehiculeImmat: string
  type: string
  datePlanifiee: string
  description?: string
  cout?: number
  technicienId?: string
}) {
  const res = await authFetch(MAINTENANCE_URL, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, "Création de l'intervention")
  return res.json()
}

export async function signalerIntervention(data: {
  vehiculeImmat: string
  description: string
  type?: string
}) {
  const res = await authFetch(`${MAINTENANCE_URL}/signalement`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await parseError(res, 'Envoi du signalement')
  return res.json()
}

export async function updateIntervention(id: string, data: object) {
  const res = await authFetch(`${MAINTENANCE_URL}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) throw await parseError(res, "Modification de l'intervention")
  return res.json()
}

export async function demarrerIntervention(
  id: string,
  technicienInfo?: { technicienNom?: string; technicienPrenom?: string },
) {
  const res = await authFetch(`${MAINTENANCE_URL}/${id}/demarrer`, {
    method: 'PUT',
    body: JSON.stringify(technicienInfo ?? {}),
  })
  if (!res.ok) throw await parseError(res, "Démarrage de l'intervention")
  return res.json()
}

export async function terminerIntervention(
  id: string,
  technicienInfo?: { cout?: number; technicienNom?: string; technicienPrenom?: string },
) {
  const res = await authFetch(`${MAINTENANCE_URL}/${id}/terminer`, {
    method: 'PUT',
    body: JSON.stringify(technicienInfo ?? {}),
  })
  if (!res.ok) throw await parseError(res, "Clôture de l'intervention")
  return res.json()
}

export async function annulerIntervention(id: string) {
  const res = await authFetch(`${MAINTENANCE_URL}/${id}/annuler`, { method: 'PUT' })
  if (!res.ok) throw await parseError(res, "Annulation de l'intervention")
  return res.json()
}

export async function deleteIntervention(id: string) {
  const res = await authFetch(`${MAINTENANCE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await parseError(res, "Suppression de l'intervention")
}

// ── Positions ────────────────────────────────────────────────────────────────

export async function fetchPositions() {
  const res = await authFetch(POSITION_URL)
  if (!res.ok) throw await parseError(res, 'Chargement des positions')
  return res.json()
}

export async function fetchPositionVehicule(vehiculeId: string | number) {
  const res = await authFetch(`${POSITION_URL}/${vehiculeId}`)
  if (res.status === 404) return null
  if (!res.ok) throw await parseError(res, 'Chargement de la position')
  return res.json()
}

export async function activerSimulateurGPS(vehiculeId: string) {
  const res = await authFetch(`${POSITION_URL}/simulateur/vehicules`, {
    method: 'POST',
    body: JSON.stringify({ vehiculeId }),
  })
  if (!res.ok) throw await parseError(res, 'Activation GPS')
  return res.json()
}

// ── Admin — Keycloak via api-gateway GraphQL ─────────────────────────────────
// Nécessite que l'api-gateway soit démarrée avec le nouveau schéma GraphQL.

const GRAPHQL_URL = 'http://127.0.0.1:3000/graphql'

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken()
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`api-gateway: erreur ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data as T
}

export async function fetchTechniciens() {
  const users = await fetchAdminUsers() as Array<{ id: string; username: string; firstName?: string; lastName?: string; realmRoles?: string[] }>
  return users.filter((u) => u.realmRoles?.includes('technicien'))
}

export async function fetchAdminUsers() {
  const data = await gqlFetch<{ adminUsers: unknown[] }>(`
    query { adminUsers { id username email firstName lastName enabled realmRoles } }
  `)
  return data.adminUsers
}

export async function gqlCreateUser(input: {
  username: string
  email: string
  firstName?: string
  lastName?: string
  password: string
  roles: string[]
  numeroPermis?: string
  categoriePermis?: string
  dateValiditePermis?: string
}) {
  const data = await gqlFetch<{ createUser: unknown }>(`
    mutation CreateUser(
      $username: String!, $email: String!, $firstName: String, $lastName: String,
      $password: String!, $roles: [String!]!,
      $numeroPermis: String, $categoriePermis: String, $dateValiditePermis: String
    ) {
      createUser(
        username: $username, email: $email, firstName: $firstName, lastName: $lastName,
        password: $password, roles: $roles,
        numeroPermis: $numeroPermis, categoriePermis: $categoriePermis, dateValiditePermis: $dateValiditePermis
      ) {
        id username email firstName lastName enabled realmRoles
      }
    }
  `, input as Record<string, unknown>)
  return data.createUser
}

export async function gqlToggleUser(userId: string, enabled: boolean) {
  const data = await gqlFetch<{ toggleUser: unknown }>(`
    mutation ToggleUser($userId: ID!, $enabled: Boolean!) {
      toggleUser(userId: $userId, enabled: $enabled) { id username enabled }
    }
  `, { userId, enabled })
  return data.toggleUser
}

export async function gqlResetPassword(userId: string, newPassword: string) {
  const data = await gqlFetch<{ resetPassword: boolean }>(`
    mutation ResetPassword($userId: ID!, $newPassword: String!) {
      resetPassword(userId: $userId, newPassword: $newPassword)
    }
  `, { userId, newPassword })
  return data.resetPassword
}
