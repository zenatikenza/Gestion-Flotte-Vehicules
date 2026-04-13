import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

describe('PositionController', () => {
  let controller: PositionController;

  const mockService = {
    findLatest: jest.fn(),
    findByRange: jest.fn(),
    findAllLatest: jest.fn(),
    savePosition: jest.fn(),
  };

  const mockSimulator = {
    addVehicle: jest.fn(),
    removeVehicle: jest.fn(),
    getActiveVehicleIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionController],
      providers: [
        { provide: PositionService, useValue: mockService },
        { provide: GpsSimulatorService, useValue: mockSimulator },
      ],
    }).compile();

    controller = module.get<PositionController>(PositionController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── GET /:vehiculeId ──────────────────────────────────────────────────────

  describe('findLatest()', () => {
    it('retourne la dernière position du véhicule', async () => {
      const pos = { id: 'p1', vehiculeId: 'v-001', latitude: 48.8 };
      mockService.findLatest.mockResolvedValue(pos);

      const result = await controller.findLatest('v-001');
      expect(result).toEqual(pos);
      expect(mockService.findLatest).toHaveBeenCalledWith('v-001');
    });

    it('propage NotFoundException du service', async () => {
      mockService.findLatest.mockRejectedValue(new NotFoundException());
      await expect(controller.findLatest('inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  // ── GET /:vehiculeId/historique ───────────────────────────────────────────

  describe('findHistorique()', () => {
    const debut = '2026-04-12T00:00:00Z';
    const fin   = '2026-04-12T23:59:59Z';

    it(`retourne l'historique sur la période`, async () => {
      const positions = [{ id: 'p1' }, { id: 'p2' }];
      mockService.findByRange.mockResolvedValue(positions);

      const result = await controller.findHistorique('v-001', debut, fin);
      expect(result).toEqual(positions);
      expect(mockService.findByRange).toHaveBeenCalledWith(
        'v-001',
        new Date(debut),
        new Date(fin),
      );
    });

    it('lève BadRequestException si debut manquant', () => {
      expect(() => controller.findHistorique('v-001', '', fin)).toThrow(BadRequestException);
    });

    it('lève BadRequestException si fin manquant', () => {
      expect(() => controller.findHistorique('v-001', debut, '')).toThrow(BadRequestException);
    });

    it('lève BadRequestException si dates invalides', () => {
      expect(() => controller.findHistorique('v-001', 'not-a-date', 'also-not')).toThrow(BadRequestException);
    });

    it('lève BadRequestException si debut >= fin', () => {
      expect(() => controller.findHistorique('v-001', fin, debut)).toThrow(BadRequestException);
    });
  });

  // ── GET / ─────────────────────────────────────────────────────────────────

  describe('findAllLatest()', () => {
    it('retourne toutes les dernières positions', async () => {
      const positions = [{ vehiculeId: 'v-001' }, { vehiculeId: 'v-002' }];
      mockService.findAllLatest.mockResolvedValue(positions);

      const result = await controller.findAllLatest();
      expect(result).toHaveLength(2);
    });
  });

  // ── POST / ────────────────────────────────────────────────────────────────

  describe('savePosition()', () => {
    it('sauvegarde une position injectée manuellement', async () => {
      const dto = { vehiculeId: 'v-001', latitude: 48.8566, longitude: 2.3522 };
      const saved = { id: 'pos-1', ...dto };
      mockService.savePosition.mockResolvedValue(saved);

      const result = await controller.savePosition(dto as any);
      expect(result).toEqual(saved);
      expect(mockService.savePosition).toHaveBeenCalledWith(dto);
    });
  });

  // ── POST /simulateur/vehicules ────────────────────────────────────────────

  describe('addVehiculeSimulateur()', () => {
    it('enregistre le véhicule dans le simulateur et retourne un message', () => {
      const result = controller.addVehiculeSimulateur('1');
      expect(mockSimulator.addVehicle).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Véhicule 1 enregistré dans le simulateur GPS' });
    });

    it('lève BadRequestException si vehiculeId est absent', () => {
      expect(() => controller.addVehiculeSimulateur('')).toThrow(BadRequestException);
      expect(mockSimulator.addVehicle).not.toHaveBeenCalled();
    });
  });
});
