import React from 'react'
import ReactDOM from 'react-dom/client'
import keycloak from './keycloak'
import App from './App'
import './index.css'

// Support injection de token Cypress (test uniquement — ignoré en production)
const _cypressTokens = (window as any).__cypress_tokens__ as
  | { token: string; refreshToken: string; idToken: string }
  | undefined

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
