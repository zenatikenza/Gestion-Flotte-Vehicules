import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

const CONDUCTOR_SERVICE_URL =
  process.env.CONDUCTOR_SERVICE_URL || 'http://localhost:8082';

/**
 * Client HTTP vers conductor-service (NestJS, port 8082).
 * Le token JWT est transmis via Authorization pour les endpoints protégés.
 */
@Injectable()
export class ConductorClient {
  private readonly logger = new Logger(ConductorClient.name);

  private authHeaders(token?: string): AxiosRequestConfig {
    return token ? { headers: { Authorization: token } } : {};
  }

  /**
   * Crée un conducteur dans la base de données métier du microservice.
   */
  async create(data: any, token?: string): Promise<any> {
    try {
      const response = await axios.post(
        `${CONDUCTOR_SERVICE_URL}/api/conducteurs`,
        data,
        this.authHeaders(token),
      );
      return response.data;
    } catch (err) {
      this.logger.error(`[conductor-service] create échoué : ${(err as any).message}`);
      throw err; // On propage l'erreur pour que la Gateway soit au courant
    }
  }

  async findAll(token?: string): Promise<any[]> {
    try {
      const { data } = await axios.get(
        `${CONDUCTOR_SERVICE_URL}/api/conducteurs`,
        this.authHeaders(token),
      );
      return data;
    } catch (err) {
      this.logger.error(`[conductor-service] findAll échoué : ${(err as any).message}`);
      return [];
    }
  }

  async findById(id: string, token?: string): Promise<any | null> {
    try {
      const { data } = await axios.get(
        `${CONDUCTOR_SERVICE_URL}/api/conducteurs/${id}`,
        this.authHeaders(token),
      );
      return data;
    } catch (err) {
      this.logger.error(`[conductor-service] findById(${id}) échoué : ${(err as any).message}`);
      return null;
    }
  }

  async findAssignedToVehicle(
    vehicleId: string | number,
    token?: string,
  ): Promise<any | null> {
    const conducteurs = await this.findAll(token);
    const idStr = String(vehicleId);

    const found = conducteurs.find((c: any) =>
      Array.isArray(c.assignations) &&
      c.assignations.some(
        (a: any) => a.vehiculeId === idStr && a.statut === 'EN_COURS',
      ),
    );

    return found ?? null;
  }

  async assigner(
    conducteurId: string,
    vehiculeId: string,
    token?: string,
  ): Promise<any> {
    await axios.post(
      `${CONDUCTOR_SERVICE_URL}/api/conducteurs/${conducteurId}/assigner/${vehiculeId}`,
      {},
      this.authHeaders(token),
    );
    return this.findById(conducteurId, token);
  }
}