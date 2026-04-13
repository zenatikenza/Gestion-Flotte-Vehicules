import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { PositionService } from './position.service';

interface VehicleRequest {
  vehiculeId: string;
}

interface HistoryRequest {
  vehiculeId: string;
  debut: string;
  fin: string;
}

interface PositionResponse {
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  horodatage: string;
  enZoneAutorisee: boolean;
}

/**
 * Contrôleur gRPC du localization-service.
 *
 * Méthodes exposées (définies dans proto/localization.proto) :
 *   - GetCurrentPosition  : retourne la dernière position d'un véhicule (unaire)
 *   - StreamPositions     : streaming server-side — émet les positions en continu
 *   - GetPositionHistory  : retourne la liste des positions sur une période (unaire)
 *
 * Usage typique : un client interne (ex. tableau de bord) se connecte en gRPC
 * pour obtenir un flux temps réel sans passer par HTTP polling.
 * Le frontend public utilise la Subscription GraphQL de l'api-gateway à la place.
 */
@Controller()
export class PositionGrpcController {
  private readonly logger = new Logger(PositionGrpcController.name);

  /** Sujets RxJS par vehiculeId pour le streaming server-side */
  private readonly streams = new Map<string, Subject<PositionResponse>>();

  constructor(private readonly positionService: PositionService) {}

  /** Retourne la dernière position connue (appel unaire gRPC) */
  @GrpcMethod('LocalizationService', 'GetCurrentPosition')
  async getCurrentPosition(data: VehicleRequest): Promise<PositionResponse> {
    const position = await this.positionService.findLatest(data.vehiculeId);
    return this.toGrpcResponse(position);
  }

  /**
   * Streaming server-side — retourne un Observable qui émet les positions
   * en temps réel pour le véhicule demandé.
   *
   * Le Subject associé au vehiculeId est alimenté par pushPosition(),
   * appelé depuis PositionService à chaque nouvelle position GPS simulée.
   */
  @GrpcMethod('LocalizationService', 'StreamPositions')
  streamPositions(data: VehicleRequest): Observable<PositionResponse> {
    const { vehiculeId } = data;

    if (!this.streams.has(vehiculeId)) {
      this.streams.set(vehiculeId, new Subject<PositionResponse>());
      this.logger.log(`[gRPC] Nouveau stream ouvert pour véhicule ${vehiculeId}`);
    }

    return this.streams.get(vehiculeId).asObservable();
  }

  /** Retourne l'historique des positions sur une période (appel unaire gRPC) */
  @GrpcMethod('LocalizationService', 'GetPositionHistory')
  async getPositionHistory(
    data: HistoryRequest,
  ): Promise<{ positions: PositionResponse[] }> {
    const positions = await this.positionService.findByRange(
      data.vehiculeId,
      new Date(data.debut),
      new Date(data.fin),
    );
    return { positions: positions.map(this.toGrpcResponse) };
  }

  /**
   * Pousse une position dans le stream gRPC actif pour un véhicule.
   * Appelé par PositionService après chaque sauvegarde.
   */
  pushPosition(position: PositionResponse): void {
    const subject = this.streams.get(position.vehiculeId);
    if (subject) {
      subject.next(position);
    }
  }

  private toGrpcResponse(position: any): PositionResponse {
    return {
      vehiculeId:       position.vehiculeId,
      latitude:         position.latitude,
      longitude:        position.longitude,
      vitesse:          position.vitesse,
      horodatage:       position.horodatage instanceof Date
                          ? position.horodatage.toISOString()
                          : String(position.horodatage),
      enZoneAutorisee:  position.enZoneAutorisee,
    };
  }
}
