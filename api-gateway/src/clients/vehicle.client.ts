import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

const VEHICLE_SERVICE_URL =
  process.env.VEHICLE_SERVICE_URL || 'http://localhost:8081';

/**
 * Client HTTP vers vehicle-service (Spring Boot, port 8081).
 * Le token JWT est transmis tel quel via le header Authorization afin que
 * Spring Security puisse valider les droits sur les endpoints protégés.
 */
@Injectable()
export class VehicleClient {
  private readonly logger = new Logger(VehicleClient.name);

  private authHeaders(token?: string): AxiosRequestConfig {
    return token ? { headers: { Authorization: token } } : {};
  }

  async findAll(token?: string): Promise<any[]> {
    try {
      const { data } = await axios.get(
        `${VEHICLE_SERVICE_URL}/api/vehicles`,
        this.authHeaders(token),
      );
      return data.map(this.mapVehicle);
    } catch (err) {
      this.logger.error(`[vehicle-service] findAll échoué : ${err.message}`);
      return [];
    }
  }

  async findById(id: string, token?: string): Promise<any | null> {
    try {
      const { data } = await axios.get(
        `${VEHICLE_SERVICE_URL}/api/vehicles/${id}`,
        this.authHeaders(token),
      );
      return this.mapVehicle(data);
    } catch (err) {
      this.logger.error(`[vehicle-service] findById(${id}) échoué : ${err.message}`);
      return null;
    }
  }

  private mapVehicle(v: any) {
    return {
      id:              v.id,
      immatriculation: v.licensePlate,
      marque:          v.brand,
      modele:          v.model,
      statut:          v.status,
      kilometrage:     v.mileage,
      _id:             v.id,
      _licensePlate:   v.licensePlate,
    };
  }
}
