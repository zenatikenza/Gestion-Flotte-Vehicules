import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: 'http://127.0.0.1:8080',
  realm: 'FleetManagement',
  clientId: 'fleet-frontend',
})

export default keycloak

export function getUserRoles(): string[] {
  if (!keycloak.tokenParsed) return []
  const realmRoles: string[] = keycloak.tokenParsed.realm_access?.roles ?? []
  return realmRoles.filter((r) =>
    ['admin', 'manager', 'technicien', 'utilisateur'].includes(r)
  )
}

export function hasRole(role: string): boolean {
  return getUserRoles().includes(role)
}

export function hasAnyRole(roles: string[]): boolean {
  const userRoles = getUserRoles()
  return roles.some((r) => userRoles.includes(r))
}

export function getUsername(): string {
  return keycloak.tokenParsed?.preferred_username ?? ''
}

export function getToken(): string {
  return keycloak.token ?? ''
}

export function getUserId(): string {
  return keycloak.tokenParsed?.sub ?? ''
}
