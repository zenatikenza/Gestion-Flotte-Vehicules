export interface MaintenanceEvent {
  eventType:
    | 'maintenance.created'
    | 'maintenance.updated'
    | 'maintenance.completed'
    | 'maintenance.cancelled';
  interventionId: string;
  vehicle_id: number;    
  vehicleImmat: string; 
  type: string;
  statut: string;
  message: string;
  timestamp?: string;
}