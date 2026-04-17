/**
 * Commande Cypress : cy.loginKeycloak(username, password)
 *
 * Stratégie : ROPC (Resource Owner Password Credentials)
 * ─────────────────────────────────────────────────────
 * 1. cy.request POST /token  → récupère access_token, refresh_token, id_token
 *    directement depuis Keycloak, sans passer par le navigateur.
 * 2. cy.visit('/')  avec onBeforeLoad qui écrit window.__cypress_tokens__
 *    avant que main.tsx ne s'exécute.
 * 3. main.tsx lit __cypress_tokens__ et les passe à keycloak.init()
 *    → Keycloak utilise les tokens fournis, ne redirige plus vers la page de login.
 *
 * Les tokens sont aussi stockés dans localStorage (_cy_kc_tokens) afin que
 * validate() puisse les réinjecter sans refaire de requête réseau.
 *
 * Prérequis Keycloak : le client « fleet-frontend » doit avoir
 * « Direct Access Grants » activé (standard pour les environnements de dev).
 */

export {}

const KC_TOKEN_URL = (): string =>
  `${Cypress.env('KEYCLOAK_URL')}/realms/${Cypress.env('REALM')}/protocol/openid-connect/token`

const STORAGE_KEY = '_cy_kc_tokens'

Cypress.Commands.add('loginKeycloak', (username: string, password: string) => {
  cy.session(
    [username, password],
    () => {
      cy.request({
        method: 'POST',
        url: KC_TOKEN_URL(),
        form: true,
        body: {
          grant_type: 'password',
          client_id: Cypress.env('CLIENT_ID'),
          username,
          password,
          scope: 'openid profile',
        },
        failOnStatusCode: true,
      }).then(({ body }) => {
        const tokens = {
          token: body.access_token as string,
          refreshToken: body.refresh_token as string,
          idToken: body.id_token as string,
        }

        cy.visit('/', {
          onBeforeLoad(win: Cypress.AUTWindow) {
            ;(win as Window & { __cypress_tokens__?: typeof tokens }).__cypress_tokens__ = tokens
            // Stocker en localStorage : cy.session le capture et le restaure avant
            // chaque test — main.tsx lit _cy_kc_tokens sans onBeforeLoad explicite.
            win.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
            win.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
          },
        })

        cy.url().should('include', '/dashboard')
      })
    },
    {
      validate() {
        // localStorage est déjà restauré par cy.session — main.tsx lira _cy_kc_tokens
        // depuis localStorage directement, pas besoin d'onBeforeLoad.
        cy.visit('/dashboard')
        cy.url().should('include', '/dashboard')
      },
    },
  )
})
