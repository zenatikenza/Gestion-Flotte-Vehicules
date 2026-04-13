export interface DriverEvent {
  eventType: string;        // 'driver.created' | 'driver.assigned' | 'driver.unassigned'
  conducteurId: string;
  nom: string;
  vehiculeId: string | null;
  message: string;
  timestamp?: string;
}
