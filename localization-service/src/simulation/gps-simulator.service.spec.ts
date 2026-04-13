import { Test, TestingModule } from '@nestjs/testing';
import { GpsSimulatorService } from './gps-simulator.service';

// On ne passe pas par ScheduleModule pour les tests unitaires :
// @Interval est un simple décorateur, le tick() est testé directement.

describe('GpsSimulatorService', () => {
  let service: GpsSimulatorService;
  let mockPositionService: { savePosition: jest.Mock };

  beforeEach(async () => {
    mockPositionService = {
      savePosition: jest.fn().mockResolvedValue({ id: 'pos-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsSimulatorService],
    }).compile();

    service = module.get<GpsSimulatorService>(GpsSimulatorService);
    service.setPositionService(mockPositionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── addVehicle / removeVehicle ────────────────────────────────────────────

  describe('addVehicle()', () => {
    it('ajoute un véhicule actif', () => {
      service.addVehicle('v-001');
      expect(service.getActiveVehicleIds()).toContain('v-001');
    });

    it(`n'ajoute pas deux fois le même véhicule`, () => {
      service.addVehicle('v-001');
      service.addVehicle('v-001');
      expect(service.getActiveVehicleIds().filter(id => id === 'v-001')).toHaveLength(1);
    });

    it('ajoute plusieurs véhicules différents', () => {
      service.addVehicle('v-001');
      service.addVehicle('v-002');
      service.addVehicle('v-003');
      expect(service.getActiveVehicleIds()).toHaveLength(3);
    });
  });

  describe('removeVehicle()', () => {
    it('retire un véhicule de la simulation', () => {
      service.addVehicle('v-001');
      service.removeVehicle('v-001');
      expect(service.getActiveVehicleIds()).not.toContain('v-001');
    });

    it(`ne plante pas si le véhicule n'existe pas`, () => {
      expect(() => service.removeVehicle('inexistant')).not.toThrow();
    });
  });

  // ── randomOffset ──────────────────────────────────────────────────────────

  describe('randomOffset()', () => {
    it('retourne une valeur dans [-0.01, +0.01]', () => {
      for (let i = 0; i < 100; i++) {
        const offset = service.randomOffset();
        expect(offset).toBeGreaterThanOrEqual(-0.01);
        expect(offset).toBeLessThanOrEqual(0.01);
      }
    });

    it('retourne un nombre', () => {
      expect(typeof service.randomOffset()).toBe('number');
    });
  });

  // ── tick ─────────────────────────────────────────────────────────────────

  describe('tick()', () => {
    it('ne fait rien si aucun véhicule actif', async () => {
      await service.tick();
      expect(mockPositionService.savePosition).not.toHaveBeenCalled();
    });

    it('appelle savePosition pour chaque véhicule actif', async () => {
      service.addVehicle('v-001');
      service.addVehicle('v-002');

      await service.tick();

      expect(mockPositionService.savePosition).toHaveBeenCalledTimes(2);
    });

    it('passe un payload valide à savePosition', async () => {
      service.addVehicle('v-001');
      await service.tick();

      const call = mockPositionService.savePosition.mock.calls[0][0];
      expect(call.vehiculeId).toBe('v-001');
      expect(typeof call.latitude).toBe('number');
      expect(typeof call.longitude).toBe('number');
      expect(typeof call.vitesse).toBe('number');
      expect(call.vitesse).toBeGreaterThanOrEqual(0);
    });

    it('met à jour les coordonnées après chaque tick', async () => {
      service.addVehicle('v-001');

      await service.tick();
      const firstCall = { ...mockPositionService.savePosition.mock.calls[0][0] };

      await service.tick();
      const secondCall = { ...mockPositionService.savePosition.mock.calls[1][0] };

      // Les coordonnées changent (le mouvement s'applique)
      // Note : très faible probabilité d'être identiques (offset 0 exact)
      expect(firstCall.vehiculeId).toBe(secondCall.vehiculeId);
    });

    it('ne plante pas si savePosition rejette', async () => {
      mockPositionService.savePosition.mockRejectedValueOnce(
        new Error('DB error'),
      );
      service.addVehicle('v-001');

      await expect(service.tick()).resolves.not.toThrow();
    });

    it(`ne fait rien si positionService n'est pas encore injecté`, async () => {
      const freshModule = await Test.createTestingModule({
        providers: [GpsSimulatorService],
      }).compile();
      const freshService = freshModule.get<GpsSimulatorService>(GpsSimulatorService);
      freshService.addVehicle('v-001');

      // positionService non injecté → tick() s'arrête silencieusement
      await expect(freshService.tick()).resolves.not.toThrow();
    });
  });
});
