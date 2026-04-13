import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

const LOCALIZATION_SERVICE_URL =
  process.env.LOCALIZATION_SERVICE_URL || 'http://localhost:8084';

export interface PositionDto {
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  horodatage: string;
  enZoneAutorisee: boolean;
}

/**
 * Client HTTP vers localization-service (NestJS, port 8084).
 * Utilisé par le LocationResolver (queries/subscriptions) et le FleetResolver
 * (champ positionActuelle sur FleetVehicle).
 */
@Injectable()
export class LocalizationClient {
  private readonly logger = new Logger(LocalizationClient.name);

  private authHeaders(token?: string): AxiosRequestConfig {
    return token ? { headers: { Authorization: token } } : {};
  }

  /** Retourne la dernière position connue d'un véhicule. */
  async findLatest(vehiculeId: string, token?: string): Promise<PositionDto | null> {
    try {
      const { data } = await axios.get(
        `${LOCALIZATION_SERVICE_URL}/api/positions/${vehiculeId}`,
        this.authHeaders(token),
      );
      return this.mapPosition(data);
    } catch (err) {
      // 404 = véhicule sans position encore — retourner null (pas d'erreur GraphQL)
      if (err?.response?.status === 404) return null;
      this.logger.error(
        `[localization-service] findLatest(${vehiculeId}) échoué : ${err.message}`,
      );
      return null;
    }
  }

  /** Retourne l'historique des positions sur une plage temporelle. */
  async findHistorique(
    vehiculeId: string,
    debut: string,
    fin: string,
    token?: string,
  ): Promise<PositionDto[]> {
    try {
      const { data } = await axios.get(
        `${LOCALIZATION_SERVICE_URL}/api/positions/${vehiculeId}/historique`,
        {
          ...this.authHeaders(token),
          params: { debut, fin },
        },
      );
      return Array.isArray(data) ? data.map(this.mapPosition) : [];
    } catch (err) {
      this.logger.error(
        `[localization-service] findHistorique(${vehiculeId}) échoué : ${err.message}`,
      );
      return [];
    }
  }

  private mapPosition(p: any): PositionDto {
    return {
      vehiculeId:      p.vehiculeId ?? p.vehicule_id,
      latitude:        p.latitude,
      longitude:       p.longitude,
      vitesse:         p.vitesse ?? 0,
      horodatage:      p.horodatage instanceof Date
                         ? p.horodatage.toISOString()
                         : String(p.horodatage),
      enZoneAutorisee: p.enZoneAutorisee ?? p.en_zone_autorisee ?? true,
    };
  }
}
