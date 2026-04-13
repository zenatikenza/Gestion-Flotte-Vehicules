import { Test, TestingModule } from '@nestjs/testing';
import { GeofencingService } from './geofencing.service';

describe('GeofencingService', () => {
  let service: GeofencingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeofencingService],
    }).compile();

    service = module.get<GeofencingService>(GeofencingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── haversine ─────────────────────────────────────────────────────────────

  describe('haversine()', () => {
    it('retourne 0 pour deux points identiques', () => {
      const dist = service.haversine(48.8566, 2.3522, 48.8566, 2.3522);
      expect(dist).toBeCloseTo(0, 5);
    });

    it('calcule la distance Paris → Lyon (~392 km)', () => {
      // Paris (48.8566, 2.3522) → Lyon (45.7640, 4.8357)
      const dist = service.haversine(48.8566, 2.3522, 45.764, 4.8357);
      expect(dist).toBeGreaterThan(380);
      expect(dist).toBeLessThan(410);
    });

    it('calcule la distance Paris → Versailles (~17 km)', () => {
      // Versailles : 48.8014, 2.1301
      const dist = service.haversine(48.8566, 2.3522, 48.8014, 2.1301);
      expect(dist).toBeGreaterThan(14);
      expect(dist).toBeLessThan(20);
    });

    it('est symétrique', () => {
      const d1 = service.haversine(48.8566, 2.3522, 51.5074, -0.1278);
      const d2 = service.haversine(51.5074, -0.1278, 48.8566, 2.3522);
      expect(d1).toBeCloseTo(d2, 3);
    });
  });

  // ── checkPosition ─────────────────────────────────────────────────────────

  describe('checkPosition()', () => {
    it('Paris centre → en zone autorisée', () => {
      const result = service.checkPosition(48.8566, 2.3522);
      expect(result.enZoneAutorisee).toBe(true);
      expect(result.distanceKm).toBeCloseTo(0, 2);
    });

    it('Versailles (17 km) → en zone autorisée', () => {
      const result = service.checkPosition(48.8014, 2.1301);
      expect(result.enZoneAutorisee).toBe(true);
      expect(result.distanceKm).toBeLessThan(50);
    });

    it('point à 49 km → en zone autorisée', () => {
      // ~49 km au nord de Paris : lat += 0.44°
      const result = service.checkPosition(49.29, 2.3522);
      expect(result.enZoneAutorisee).toBe(true);
      expect(result.distanceKm).toBeLessThan(50);
    });

    it('Lyon (392 km) → hors zone', () => {
      const result = service.checkPosition(45.764, 4.8357);
      expect(result.enZoneAutorisee).toBe(false);
      expect(result.distanceKm).toBeGreaterThan(50);
    });

    it('Marseille (~660 km) → hors zone', () => {
      const result = service.checkPosition(43.2965, 5.3698);
      expect(result.enZoneAutorisee).toBe(false);
      expect(result.distanceKm).toBeGreaterThan(50);
    });

    it('retourne la distance correcte', () => {
      const result = service.checkPosition(48.8566, 2.3522);
      expect(typeof result.distanceKm).toBe('number');
      expect(result.distanceKm).toBeGreaterThanOrEqual(0);
    });
  });

  // ── constantes statiques ──────────────────────────────────────────────────

  describe('constantes de zone', () => {
    it('centre = Paris', () => {
      expect(GeofencingService.zoneCenterLat).toBe(48.8566);
      expect(GeofencingService.zoneCenterLon).toBe(2.3522);
    });

    it('rayon = 50 km', () => {
      expect(GeofencingService.zoneRadiusKm).toBe(50);
    });
  });
});
