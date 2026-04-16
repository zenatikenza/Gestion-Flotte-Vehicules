/**
 * Tests E2E — Contrôle d'accès par rôle (RBAC)
 *
 * Rôles et routes (App.tsx) :
 *  /vehicles           → admin, manager          (technicien → 403)
 *  /maintenance        → admin, manager, technicien ✓
 *  /mes-interventions  → technicien uniquement
 *  /access-denied      → public (pas de ProtectedRoute)
 *
 * Sidebar technicien (Sidebar.tsx) :
 *  Dashboard | Mes Interventions | Mon Historique
 *  (pas de lien Véhicules, pas de lien Maintenance)
 */
export {}

describe("Contrôle d'accès par rôle (RBAC)", () => {

  // ── Rôle technicien ──────────────────────────────────────────────────────
  describe('Rôle technicien_flotte', () => {
    beforeEach(() => {
      cy.loginKeycloak('technicien_flotte', 'Tech1234!')
      cy.visit('/dashboard')
    })

    it('ne voit PAS le lien Véhicules dans la sidebar', () => {
      cy.get('aside nav').within(() => {
        cy.contains('Véhicules').should('not.exist')
      })
    })

    it('ne voit PAS le lien Maintenance dans la sidebar', () => {
      // Le technicien accède via "Mes Interventions", pas "Maintenance"
      cy.get('aside nav').within(() => {
        cy.contains('a', 'Maintenance').should('not.exist')
      })
    })

    it('voit "Mes Interventions" dans la sidebar', () => {
      cy.get('aside nav').within(() => {
        cy.contains('Mes Interventions').should('be.visible')
      })
    })

    it('navigation vers /vehicles → redirigé sur "Accès refusé"', () => {
      // ProtectedRoute redirige vers /access-denied si rôle insuffisant
      cy.visit('/vehicles')
      cy.url().should('include', '/access-denied')
      cy.contains('h1', 'Accès refusé').should('be.visible')
      cy.contains("Vous n'avez pas les permissions nécessaires").should('be.visible')
      cy.contains('button', 'Retour au Dashboard').should('be.visible')
    })

    it('/maintenance EST accessible pour le technicien', () => {
      // App.tsx l.52 : roles={['admin', 'manager', 'technicien']}
      cy.visit('/maintenance')
      cy.url().should('include', '/maintenance')
      cy.contains('Accès refusé').should('not.exist')
    })

    it('/mes-interventions est accessible', () => {
      cy.visit('/mes-interventions')
      cy.url().should('include', '/mes-interventions')
      cy.contains('Accès refusé').should('not.exist')
    })
  })

  // ── Rôle admin — accès complet ───────────────────────────────────────────
  describe('Rôle admin_flotte', () => {
    beforeEach(() => {
      cy.loginKeycloak('admin_flotte', 'Admin1234!')
      cy.visit('/dashboard')
    })

    it('voit les 4 liens admin dans la sidebar', () => {
      cy.get('aside nav').within(() => {
        cy.contains('Dashboard').should('be.visible')
        cy.contains('Utilisateurs').should('be.visible')
        cy.contains('Véhicules').should('be.visible')
        cy.contains('Supervision').should('be.visible')
      })
    })

    it('peut accéder à /vehicles sans redirection', () => {
      cy.visit('/vehicles')
      cy.url().should('include', '/vehicles')
      cy.contains('Accès refusé').should('not.exist')
    })

    it('peut accéder à /utilisateurs sans redirection', () => {
      cy.visit('/utilisateurs')
      cy.url().should('include', '/utilisateurs')
      cy.contains('Accès refusé').should('not.exist')
    })
  })

  // ── Page /access-denied ──────────────────────────────────────────────────
  describe('Page /access-denied', () => {
    it("affiche le message d'accès refusé avec les boutons d'action", () => {
      cy.loginKeycloak('admin_flotte', 'Admin1234!')
      cy.visit('/access-denied')
      cy.contains('h1', 'Accès refusé').should('be.visible')
      cy.contains('button', 'Retour au Dashboard').should('be.visible')
      cy.contains('button', 'Se déconnecter').should('be.visible')
    })
  })
})
