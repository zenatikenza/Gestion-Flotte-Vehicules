import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Conducteurs from './pages/Conducteurs'
import Maintenance from './pages/Maintenance'
import Localisation from './pages/Localisation'
import Utilisateurs from './pages/Utilisateurs'
import Supervision from './pages/Supervision'
import StatistiquesFlotte from './pages/StatistiquesFlotte'
import Assignations from './pages/Assignations'
import MesInterventions from './pages/MesInterventions'
import MonHistoriqueInterventions from './pages/MonHistoriqueInterventions'
import MaLocalisation from './pages/MaLocalisation'
import Signalement from './pages/Signalement'
import MonHistorique from './pages/MonHistorique'
import AccessDenied from './pages/AccessDenied'
import FeatureFlags from './pages/FeatureFlags'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>

          {/* ── Toutes les routes (le Dashboard route vers la bonne vue selon le rôle) */}
          <Route path="/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'manager', 'technicien', 'utilisateur']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Admin */}
          <Route path="/utilisateurs"
            element={<ProtectedRoute roles={['admin']}><Utilisateurs /></ProtectedRoute>}
          />
          <Route path="/supervision"
            element={<ProtectedRoute roles={['admin']}><Supervision /></ProtectedRoute>}
          />
          <Route path="/feature-flags"
            element={<ProtectedRoute roles={['admin']}><FeatureFlags /></ProtectedRoute>}
          />

          {/* ── Manager */}
          <Route path="/assignations"
            element={<ProtectedRoute roles={['admin', 'manager']}><Assignations /></ProtectedRoute>}
          />
          <Route path="/statistiques-flotte"
            element={<ProtectedRoute roles={['admin', 'manager']}><StatistiquesFlotte /></ProtectedRoute>}
          />
          <Route path="/maintenance"
            element={<ProtectedRoute roles={['admin', 'manager', 'technicien']}><Maintenance /></ProtectedRoute>}
          />
          <Route path="/localisation"
            element={<ProtectedRoute roles={['admin', 'manager', 'technicien']}><Localisation /></ProtectedRoute>}
          />

          {/* ── Admin – accès lecture véhicules et conducteurs */}
          <Route path="/vehicles"
            element={<ProtectedRoute roles={['admin', 'manager']}><Vehicles /></ProtectedRoute>}
          />
          <Route path="/conducteurs"
            element={<ProtectedRoute roles={['admin', 'manager']}><Conducteurs /></ProtectedRoute>}
          />

          {/* ── Technicien */}
          <Route path="/mes-interventions"
            element={<ProtectedRoute roles={['technicien']}><MesInterventions /></ProtectedRoute>}
          />
          <Route path="/mon-historique-interventions"
            element={<ProtectedRoute roles={['technicien']}><MonHistoriqueInterventions /></ProtectedRoute>}
          />

          {/* ── Conducteur */}
          <Route path="/ma-localisation"
            element={<ProtectedRoute roles={['utilisateur']}><MaLocalisation /></ProtectedRoute>}
          />
          <Route path="/signaler"
            element={<ProtectedRoute roles={['utilisateur']}><Signalement /></ProtectedRoute>}
          />
          <Route path="/mon-historique"
            element={<ProtectedRoute roles={['utilisateur']}><MonHistorique /></ProtectedRoute>}
          />

        </Route>
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
