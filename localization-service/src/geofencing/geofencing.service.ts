import { Injectable } from '@nestjs/common';

/** Centre de la zone autorisée : Paris */
const ZONE_CENTER_LAT = 48.8566;
const ZONE_CENTER_LON = 2.3522;

/** Rayon autorisé en kilomètres */
const ZONE_RADIUS_KM = 50;

/** Rayon moyen de la Terre en km */
const EARTH_RADIUS_KM = 6371;

export interface GeofencingResult {
  enZoneAutorisee: boolean;
  distanceKm: number;
}

/**
 * Service de géofencing.
 *
 * Zone autorisée : cercle de 50 km autour de Paris (48.8566, 2.3522).
 * Si un véhicule dépasse ce rayon, une alerte est publiée sur le topic
 * Kafka `system-notifications` par le LocationProducerService.
 */
@Injectable()
export class GeofencingService {
  /**
   * Calcule la distance entre deux points GPS via la formule Haversine,
   * puis détermine si le point est dans la zone autorisée.
   *
   * @param lat  Latitude du véhicule
   * @param lon  Longitude du véhicule
   * @returns    { enZoneAutorisee, distanceKm }
   */
  checkPosition(lat: number, lon: number): GeofencingResult {
    const distanceKm = this.haversine(
      lat,
      lon,
      ZONE_CENTER_LAT,
      ZONE_CENTER_LON,
    );
    return {
      enZoneAutorisee: distanceKm <= ZONE_RADIUS_KM,
      distanceKm,
    };
  }

  /**
   * Formule Haversine — distance orthodromique entre deux coordonnées GPS.
   * Retourne la distance en kilomètres.
   */
  haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  /** Expose les constantes de zone pour les tests */
  static get zoneCenterLat() { return ZONE_CENTER_LAT; }
  static get zoneCenterLon() { return ZONE_CENTER_LON; }
  static get zoneRadiusKm()  { return ZONE_RADIUS_KM; }
}
