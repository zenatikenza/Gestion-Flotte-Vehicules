import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { firstValueFrom, take, toArray } from 'rxjs';
import { PositionGrpcController } from './position.grpc.controller';
import { PositionService } from './position.service';

describe('PositionGrpcController', () => {
  let controller: PositionGrpcController;

  const mockPositionService = {
    findLatest: jest.fn(),
    findByRange: jest.fn(),
  };

  const positionEntity = {
    vehiculeId: 'v-001',
    latitude: 48.8566,
    longitude: 2.3522,
    vitesse: 60,
    horodatage: new Date('2026-04-13T00:00:00Z'),
    enZoneAutorisee: true,
  };

  const expectedGrpc = {
    vehiculeId: 'v-001',
    latitude: 48.8566,
    longitude: 2.3522,
    vitesse: 60,
    horodatage: '2026-04-13T00:00:00.000Z',
    enZoneAutorisee: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionGrpcController],
      providers: [
        { provide: PositionService, useValue: mockPositionService },
      ],
    }).compile();

    controller = module.get<PositionGrpcController>(PositionGrpcController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── getCurrentPosition ────────────────────────────────────────────────────

  describe('getCurrentPosition()', () => {
    it('retourne la dernière position formatée gRPC', async () => {
      mockPositionService.findLatest.mockResolvedValue(positionEntity);

      const result = await controller.getCurrentPosition({ vehiculeId: 'v-001' });

      expect(result).toEqual(expectedGrpc);
      expect(mockPositionService.findLatest).toHaveBeenCalledWith('v-001');
    });

    it('propage NotFoundException si véhicule inconnu', async () => {
      mockPositionService.findLatest.mockRejectedValue(new NotFoundException());

      await expect(
        controller.getCurrentPosition({ vehiculeId: 'inconnu' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── streamPositions ───────────────────────────────────────────────────────

  describe('streamPositions()', () => {
    it('retourne un Observable', () => {
      const obs = controller.streamPositions({ vehiculeId: 'v-001' });
      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe('function');
    });

    it('réutilise le même Subject pour un vehiculeId déjà ouvert', async () => {
      const received1: any[] = [];
      const received2: any[] = [];

      controller.streamPositions({ vehiculeId: 'v-002' }).subscribe(v => received1.push(v));
      controller.streamPositions({ vehiculeId: 'v-002' }).subscribe(v => received2.push(v));

      controller.pushPosition({ ...expectedGrpc, vehiculeId: 'v-002' });

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      expect(received1[0]).toEqual(received2[0]);
    });

    it('crée des streams distincts pour des véhicules différents', () => {
      const obs1 = controller.streamPositions({ vehiculeId: 'v-003' });
      const obs2 = controller.streamPositions({ vehiculeId: 'v-004' });
      expect(obs1).not.toBe(obs2);
    });

    it('émet les positions poussées via pushPosition()', async () => {
      const obs = controller.streamPositions({ vehiculeId: 'v-005' });
      const collected = firstValueFrom(obs.pipe(take(2), toArray()));

      controller.pushPosition({ ...expectedGrpc, vehiculeId: 'v-005' });
      controller.pushPosition({ ...expectedGrpc, vehiculeId: 'v-005', latitude: 48.9 });

      const values = await collected;
      expect(values).toHaveLength(2);
      expect(values[0].vehiculeId).toBe('v-005');
      expect(values[1].latitude).toBe(48.9);
    });
  });

  // ── getPositionHistory ────────────────────────────────────────────────────

  describe('getPositionHistory()', () => {
    it('retourne la liste des positions formatées gRPC', async () => {
      const entities = [positionEntity, { ...positionEntity, latitude: 48.9 }];
      mockPositionService.findByRange.mockResolvedValue(entities);

      const result = await controller.getPositionHistory({
        vehiculeId: 'v-001',
        debut: '2026-04-13T00:00:00Z',
        fin: '2026-04-13T23:59:59Z',
      });

      expect(result.positions).toHaveLength(2);
      expect(result.positions[0]).toEqual(expectedGrpc);
      expect(result.positions[1].latitude).toBe(48.9);
      expect(mockPositionService.findByRange).toHaveBeenCalledWith(
        'v-001',
        new Date('2026-04-13T00:00:00Z'),
        new Date('2026-04-13T23:59:59Z'),
      );
    });

    it('retourne un tableau vide si aucune position', async () => {
      mockPositionService.findByRange.mockResolvedValue([]);

      const result = await controller.getPositionHistory({
        vehiculeId: 'v-001',
        debut: '2026-04-13T00:00:00Z',
        fin: '2026-04-13T23:59:59Z',
      });

      expect(result.positions).toEqual([]);
    });
  });

  // ── pushPosition ──────────────────────────────────────────────────────────

  describe('pushPosition()', () => {
    it(`ne fait rien si le stream du véhicule n'existe pas`, () => {
      expect(() =>
        controller.pushPosition({ ...expectedGrpc, vehiculeId: 'inexistant' }),
      ).not.toThrow();
    });

    it('convertit horodatage string en string ISO', async () => {
      const entityWithStringDate = {
        ...positionEntity,
        horodatage: '2026-04-13T00:00:00.000Z' as any,
      };
      mockPositionService.findLatest.mockResolvedValue(entityWithStringDate);

      const result = await controller.getCurrentPosition({ vehiculeId: 'v-001' });
      expect(typeof result.horodatage).toBe('string');
      expect(result.horodatage).toBe('2026-04-13T00:00:00.000Z');
    });
  });
});
