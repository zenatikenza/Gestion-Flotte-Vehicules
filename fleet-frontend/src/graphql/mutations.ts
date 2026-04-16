import { gql } from '@apollo/client'

export const CREATE_VEHICLE = gql`
  mutation CreateVehicle($input: CreateVehicleInput!) {
    createVehicle(input: $input) {
      id
      immatriculation
      marque
      modele
      annee
      statut
      kilometrage
    }
  }
`

export const UPDATE_VEHICLE = gql`
  mutation UpdateVehicle($id: ID!, $input: UpdateVehicleInput!) {
    updateVehicle(id: $id, input: $input) {
      id
      immatriculation
      marque
      modele
      annee
      statut
      kilometrage
    }
  }
`

export const DELETE_VEHICLE = gql`
  mutation DeleteVehicle($id: ID!) {
    deleteVehicle(id: $id)
  }
`

export const CREATE_CONDUCTEUR = gql`
  mutation CreateConducteur($input: CreateConducteurInput!) {
    createConducteur(input: $input) {
      id
      nom
      prenom
      email
      telephone
      permisCategorie
    }
  }
`

export const UPDATE_CONDUCTEUR = gql`
  mutation UpdateConducteur($id: ID!, $input: UpdateConducteurInput!) {
    updateConducteur(id: $id, input: $input) {
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

export const DELETE_CONDUCTEUR = gql`
  mutation DeleteConducteur($id: ID!) {
    deleteConducteur(id: $id)
  }
`

export const ASSIGN_VEHICLE = gql`
  mutation AssignVehicle($conducteurId: ID!, $vehiculeId: ID!) {
    assignVehicle(conducteurId: $conducteurId, vehiculeId: $vehiculeId) {
      id
      vehiculeId
    }
  }
`

export const CREATE_MAINTENANCE = gql`
  mutation CreateMaintenance($input: CreateMaintenanceInput!) {
    createMaintenance(input: $input) {
      id
      vehiculeId
      type
      description
      dateIntervention
      statut
    }
  }
`

export const UPDATE_MAINTENANCE = gql`
  mutation UpdateMaintenance($id: ID!, $input: UpdateMaintenanceInput!) {
    updateMaintenance(id: $id, input: $input) {
      id
      statut
      cout
    }
  }
`

export const DELETE_MAINTENANCE = gql`
  mutation DeleteMaintenance($id: ID!) {
    deleteMaintenance(id: $id)
  }
`
