import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    // Nécessaire pour la navigation cross-origin vers Keycloak
    chromeWebSecurity: false,
    env: {
      KEYCLOAK_URL: 'http://localhost:8080',
      REALM: 'FleetManagement',
      CLIENT_ID: 'fleet-frontend',
    },
  },
})
