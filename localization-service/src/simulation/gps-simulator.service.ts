import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

/** Point de départ par défaut : Paris */
const PARIS_LAT = 48.8566;
const PARIS_LON = 2.3522;

/** Variation max par tick en degrés (≈ 1.1 km à Paris) */
const MAX_DELTA_DEG = 0.01;

/** Vitesse simulée max en km/h */
const MAX_SPEED_KMH = 90;

interface VehicleState {
  lat: number;
  lon: number;
}

/**
 * Simulateur GPS.
 *
 * Toutes les 5 secondes, génère une nouvelle position pour chaque véhicule actif
 * en appliquant une variation aléatoire de ±0.01° max (mouvement réaliste).
 * Délègue la persistance et les alertes géofencing à PositionService,
 * injecté via un setter pour éviter la dépendance circulaire au démarrage.
 */
@Injectable()
export class GpsSimulatorService {
  private readonly logger = new Logger(GpsSimulatorService.name);

  /** Véhicules actifs : vehiculeId → état courant */
  private readonly activeVehicles = new Map<string, VehicleState>();

  /** Référence vers PositionService — injectée via setPositionService() */
  private positionService: any;

  setPositionService(svc: any) {
    this.positionService = svc;
  }

  /**
   * Enregistre un véhicule comme actif.
   * Position initiale : Paris + léger offset aléatoire pour varier les départs.
   */
  addVehicle(vehiculeId: string): void {
    if (!this.activeVehicles.has(vehiculeId)) {
      this.activeVehicles.set(vehiculeId, {
        lat: PARIS_LAT + this.randomOffset(),
        lon: PARIS_LON + this.randomOffset(),
      });
      this.logger.log(`[GPS] Véhicule ${vehiculeId} ajouté à la simulation`);
    }
  }

  /** Retire un véhicule de la simulation (ex : suppression ou désactivation). */
  removeVehicle(vehiculeId: string): void {
    this.activeVehicles.delete(vehiculeId);
    this.logger.log(`[GPS] Véhicule ${vehiculeId} retiré de la simulation`);
  }

  /** Retourne les IDs des véhicules actuellement simulés (usage tests). */
  getActiveVehicleIds(): string[] {
    return Array.from(this.activeVehicles.keys());
  }

  /**
   * Tick GPS toutes les 5 secondes.
   * Pour chaque véhicule actif :
   *   1. Applique un déplacement aléatoire ±MAX_DELTA_DEG
   *   2. Génère une vitesse simulée aléatoire
   *   3. Délègue la sauvegarde + alertes à PositionService
   */
  @Interval(5000)
  async tick(): Promise<void> {
    if (!this.positionService || this.activeVehicles.size === 0) return;

    for (const [vehiculeId, state] of this.activeVehicles) {
      const newLat = state.lat + this.randomOffset();
      const newLon = state.lon + this.randomOffset();
      const vitesse = Math.random() * MAX_SPEED_KMH;

      // Mise à jour de l'état local
      this.activeVehicles.set(vehiculeId, { lat: newLat, lon: newLon });

      try {
        await this.positionService.savePosition({
          vehiculeId,
          latitude: newLat,
          longitude: newLon,
          vitesse: Math.round(vitesse * 10) / 10,
        });
      } catch (err) {
        this.logger.error(
          `[GPS] Erreur sauvegarde position ${vehiculeId} : ${err.message}`,
        );
      }
    }
  }

  /**
   * Génère un offset aléatoire dans [-MAX_DELTA_DEG, +MAX_DELTA_DEG].
   * Exposé comme méthode pour faciliter les tests unitaires.
   */
  randomOffset(): number {
    return (Math.random() - 0.5) * 2 * MAX_DELTA_DEG;
  }
}
