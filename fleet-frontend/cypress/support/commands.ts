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
 * cy.session() met en cache la session : l'étape de login n'est exécutée
 * qu'une seule fois par suite de tests, les appels suivants sont instantanés.
 *
 * Prérequis Keycloak : le client « fleet-frontend » doit avoir
 * « Direct Access Grants » activé (standard pour les environnements de dev).
 */

// export {} rend ce fichier un module TypeScript — requis pour que
// la déclaration dans index.d.ts soit reconnue correctement.
export {}

const KC_TOKEN_URL = (): string =>
  `${Cypress.env('KEYCLOAK_URL')}/realms/${Cypress.env('REALM')}/protocol/openid-connect/token`

Cypress.Commands.add('loginKeycloak', (username: string, password: string) => {
  cy.session(
    // Clé de cache : une session par paire (username, password)
    [username, password],
    () => {
      // ── Étape 1 : obtenir un token via grant direct (pas de navigateur) ──
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

        // ── Étape 2 : visiter l'app en injectant les tokens avant le init ──
        cy.visit('/', {
          onBeforeLoad(win: Cypress.AUTWindow) {
            // main.tsx lit cette propriété AVANT d'appeler keycloak.init()
            ;(win as Window & { __cypress_tokens__?: typeof tokens }).__cypress_tokens__ = tokens
          },
        })

        // L'app s'initialise avec les tokens → redirige vers /dashboard
        cy.url().should('include', '/dashboard')
      })
    },
    {
      // Validation : la session est encore valide si le dashboard charge
      validate() {
        cy.visit('/dashboard')
        cy.url().should('include', '/dashboard')
      },
    },
  )
})
