import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

const MAINTENANCE_SERVICE_URL =
  process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:8083';

/**
 * Client HTTP vers maintenance-service (NestJS, port 8083).
 * Le token JWT est transmis via Authorization pour les endpoints protégés
 * (POST/PUT requièrent technicien ou admin, DELETE requiert admin).
 */
@Injectable()
export class MaintenanceClient {
  private readonly logger = new Logger(MaintenanceClient.name);

  private authHeaders(token?: string): AxiosRequestConfig {
    return token ? { headers: { Authorization: token } } : {};
  }

  async findAll(vehiculeImmat?: string, token?: string): Promise<any[]> {
    try {
      const url = vehiculeImmat
        ? `${MAINTENANCE_SERVICE_URL}/api/interventions?vehiculeImmat=${encodeURIComponent(vehiculeImmat)}`
        : `${MAINTENANCE_SERVICE_URL}/api/interventions`;

      const { data } = await axios.get(url, this.authHeaders(token));
      return data;
    } catch (err) {
      this.logger.error(`[maintenance-service] findAll échoué : ${(err as any).message}`);
      return [];
    }
  }

  async findByImmat(vehiculeImmat: string, token?: string): Promise<any[]> {
    return this.findAll(vehiculeImmat, token);
  }
}
