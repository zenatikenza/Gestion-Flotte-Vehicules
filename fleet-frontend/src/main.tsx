import React from 'react'
import ReactDOM from 'react-dom/client'
import keycloak from './keycloak'
import App from './App'
import './index.css'
import './i18n'

// Support injection de token Cypress (test uniquement — ignoré en production).
// Priorité : window.__cypress_tokens__ (onBeforeLoad) > localStorage (_cy_kc_tokens).
// localStorage est restauré par cy.session à chaque test, ce qui permet à main.tsx
// de trouver les tokens sans onBeforeLoad sur chaque cy.visit.
function getCypressTokens(): { token: string; refreshToken: string; idToken: string } | undefined {
  const fromWindow = (window as any).__cypress_tokens__
  if (fromWindow) return fromWindow
  try {
    const raw = localStorage.getItem('_cy_kc_tokens')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return undefined
}

const _cypressTokens = getCypressTokens()

keycloak
  .init({
    onLoad: 'login-required',
    checkLoginIframe: false,
    pkceMethod: _cypressTokens ? undefined : 'S256',
    ...(_cypressTokens ?? {}),
  })
  .then((authenticated) => {
    if (!authenticated) {
      keycloak.login()
      return
    }

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((err) => {
    console.error('Keycloak init failed:', err)
    document.getElementById('root')!.innerHTML =
      '<div style="padding:2rem;color:red">Erreur d\'authentification Keycloak. Vérifiez que Keycloak est démarré sur http://localhost:8080</div>'
  })
