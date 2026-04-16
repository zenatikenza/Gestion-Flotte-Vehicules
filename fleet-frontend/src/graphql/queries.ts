import { gql } from '@apollo/client'

export const GET_VEHICLES = gql`
  query GetVehicles {
    vehicles {
      id
      immatriculation
      marque
      modele
      annee
      statut
      kilometrage
      conducteurId
    }
  }
`

export const GET_VEHICLE = gql`
  query GetVehicle($id: ID!) {
    vehicle(id: $id) {
      id
      immatriculation
      marque
      modele
      annee
      statut
      kilometrage
      conducteurId
    }
  }
`

export const GET_CONDUCTEURS = gql`
  query GetConducteurs {
    conducteurs {
      id
      nom
      prenom
      email
      telephone
      permisCategorie
      vehiculeId
    }
  }
`

export const GET_CONDUCTEUR = gql`
  query GetConducteur($id: ID!) {
    conducteur(id: $id) {
      id
      nom
      prenom
      email
      telephone
      permisCategorie
      vehiculeId
    }
  }
`

export const GET_MAINTENANCES = gql`
  query GetMaintenances {
    maintenances {
      id
      vehiculeId
      type
      description
      dateIntervention
      statut
      technicienId
      cout
    }
  }
`

export const GET_MAINTENANCES_BY_VEHICLE = gql`
  query GetMaintenancesByVehicle($vehiculeId: ID!) {
    maintenancesByVehicle(vehiculeId: $vehiculeId) {
      id
      vehiculeId
      type
      description
      dateIntervention
      statut
      cout
    }
  }
`

export const GET_POSITIONS = gql`
  query GetPositions {
    positions {
      vehiculeId
      latitude
      longitude
      vitesse
      horodatage
    }
  }
`

export const GET_LAST_POSITION = gql`
  query GetLastPosition($vehiculeId: ID!) {
    lastPosition(vehiculeId: $vehiculeId) {
      vehiculeId
      latitude
      longitude
      vitesse
      horodatage
    }
  }
`

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalVehicules
      vehiculesDisponibles
      vehiculesEnService
      vehiculesEnMaintenance
      totalConducteurs
      maintenancesEnCours
    }
  }
`
