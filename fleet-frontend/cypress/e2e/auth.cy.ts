/**
 * Tests E2E — Authentification Keycloak
 *
 * 1. Visite sans session → redirection vers Keycloak
 * 2. Login admin_flotte  → arrivée sur /dashboard
 * 3. Nom d'utilisateur affiché dans la navbar
 * 4. Logout → retour sur la page Keycloak
 */
export {}

describe('Authentification Keycloak', () => {
  const KC_URL = Cypress.env('KEYCLOAK_URL') as string
  const REALM  = Cypress.env('REALM') as string

  // ── 1. Redirection vers Keycloak si non authentifié ─────────────────────
  describe('Utilisateur non authentifié', () => {
    beforeEach(() => {
      cy.clearAllCookies()
      cy.clearAllLocalStorage()
      cy.clearAllSessionStorage()
    })

    it('redirige vers la page de login Keycloak', () => {
      cy.visit('/')
      // keycloak.init({ onLoad: 'login-required' }) déclenche une navigation
      // cross-origin → cy.origin obligatoire pour interagir avec localhost:8080
      cy.origin(KC_URL, { args: { realm: REALM } }, ({ realm }) => {
        cy.url().should('include', `/realms/${realm}/protocol/openid-connect/auth`)
        cy.get('#username').should('be.visible')
        cy.get('#password').should('be.visible')
      })
    })
  })

  // ── 2 & 3. Login réussi ──────────────────────────────────────────────────
  describe('Login admin_flotte', () => {
    beforeEach(() => {
      cy.loginKeycloak('admin_flotte', 'Admin1234!')
    })

    it('redirige vers /dashboard après authentification', () => {
      cy.visit('/')
      cy.url().should('include', '/dashboard')
    })

    it("affiche le nom d'utilisateur dans la navbar", () => {
      cy.visit('/dashboard')
      // Navbar.tsx : "Connecté en tant que <span class=font-semibold>{username}</span>"
      cy.get('header').within(() => {
        cy.contains('Connecté en tant que').should('be.visible')
        cy.get('span.font-semibold').should('contain.text', 'admin_flotte')
      })
    })

    it('affiche le rôle actif dans la navbar', () => {
      cy.visit('/dashboard')
      cy.get('header').contains('Rôle actif').should('be.visible')
    })
  })

  // ── 4. Logout ────────────────────────────────────────────────────────────
  describe('Logout', () => {
    it('redirige vers Keycloak après déconnexion', () => {
      cy.loginKeycloak('admin_flotte', 'Admin1234!')
      cy.visit('/dashboard')

      // Navbar.tsx : keycloak.logout({ redirectUri: window.location.origin })
      cy.get('header').contains('button', 'Déconnexion').click()

      // Après logout, l'app (sans session) redirige vers la page Keycloak
      cy.origin(KC_URL, () => {
        cy.url().should('include', 'localhost:8080')
      })
    })
  })
})
