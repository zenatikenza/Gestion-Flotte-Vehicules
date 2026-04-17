// Types alignés sur les vrais modèles des microservices

// vehicle-service (Spring Boot)
export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'

export interface Vehicle {
  id: number
  licensePlate: string
  brand: string
  model: string
  mileage: number
  status: VehicleStatus
}

// conductor-service (NestJS)
export interface Conducteur {
  id: string
  nom: string
  prenom: string
  numeroPermis: string
  categoriePermis: string
  dateValiditePermis: string
  actif?: boolean
  assignations?: { vehiculeId: string; statut: string }[]
}

// maintenance-service (NestJS)
export type StatutIntervention = 'SIGNALEE' | 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
export type TypeIntervention = 'PREVENTIVE' | 'CORRECTIVE' | 'URGENCE'

export interface Intervention {
  id: string
  vehiculeImmat: string
  type: TypeIntervention
  datePlanifiee: string
  dateRealisation?: string
  dateTraitement?: string
  description?: string
  cout?: number
  statut: StatutIntervention
  technicienId?: string
  technicienNom?: string
  technicienPrenom?: string
}

// localization-service (NestJS)
export interface Position {
  vehiculeId: string
  latitude: number
  longitude: number
  vitesse: number
  horodatage: string
}

export type UserRole = 'admin' | 'manager' | 'technicien' | 'utilisateur'
