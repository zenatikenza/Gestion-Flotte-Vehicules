/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Authentifie l'utilisateur via Keycloak (ROPC — sans UI de login).
     * La session est mise en cache par cy.session() entre les tests.
     *
     * @example cy.loginKeycloak('admin_flotte', 'Admin1234!')
     */
    loginKeycloak(username: string, password: string): void
  }
}
