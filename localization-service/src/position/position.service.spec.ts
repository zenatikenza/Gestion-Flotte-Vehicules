import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PositionService } from './position.service';
import { Position } from './entities/position.entity';
import { GeofencingService } from '../geofencing/geofencing.service';
import { LocationProducerService } from '../kafka/location-producer.service';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

describe('PositionService', () => {
  let service: PositionService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockGeofencing = {
    checkPosition: jest.fn(),
  };

  const mockProducer = {
    sendLocationUpdate: jest.fn().mockResolvedValue(undefined),
    sendGeofencingAlert: jest.fn().mockResolvedValue(undefined),
  };

  const mockSimulator = {
    setPositionService: jest.fn(),
    addVehicle: jest.fn(),
    removeVehicle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        { provide: getRepositoryToken(Position), useValue: mockRepository },
        { provide: GeofencingService,            useValue: mockGeofencing },
        { provide: LocationProducerService,      useValue: mockProducer },
        { provide: GpsSimulatorService,          useValue: mockSimulator },
      ],
    }).compile();

    service = module.get<PositionService>(PositionService);

    // Simule onModuleInit
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit() injecte le service dans le simulateur', () => {
    expect(mockSimulator.setPositionService).toHaveBeenCalledWith(service);
  });

  // ── savePosition ──────────────────────────────────────────────────────────

  describe('savePosition()', () => {
    const dto = { vehiculeId: 'v-001', latitude: 48.8566, longitude: 2.3522, vitesse: 50 };
    const savedEntity = {
      id: 'pos-uuid',
      vehiculeId: 'v-001',
      latitude: 48.8566,
      longitude: 2.3522,
      vitesse: 50,
      enZoneAutorisee: true,
      horodatage: new Date('2026-04-12T10:00:00Z'),
    };

    beforeEach(() => {
      mockGeofencing.checkPosition.mockReturnValue({ enZoneAutorisee: true, distanceKm: 5 });
      mockRepository.create.mockReturnValue(savedEntity);
      mockRepository.save.mockResolvedValue(savedEntity);
    });

    it('sauvegarde la position avec le statut géofencing', async () => {
      const result = await service.savePosition(dto);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(result.enZoneAutorisee).toBe(true);
    });

    it('publie sur location-updates', async () => {
      await service.savePosition(dto);
      expect(mockProducer.sendLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehiculeId: 'v-001',
          latitude: 48.8566,
          enZoneAutorisee: true,
        }),
      );
    });

    it(`ne publie pas d'alerte géofencing si en zone`, async () => {
      await service.savePosition(dto);
      expect(mockProducer.sendGeofencingAlert).not.toHaveBeenCalled();
    });

    it('publie une alerte géofencing si hors zone', async () => {
      mockGeofencing.checkPosition.mockReturnValue({
        enZoneAutorisee: false,
        distanceKm: 400,
      });
      mockRepository.create.mockReturnValue({ ...savedEntity, enZoneAutorisee: false });
      mockRepository.save.mockResolvedValue({ ...savedEntity, enZoneAutorisee: false });

      await service.savePosition({ ...dto, latitude: 45.764, longitude: 4.8357 });

      expect(mockProducer.sendGeofencingAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          vehiculeId: 'v-001',
          severity: 'CRITICAL',
        }),
      );
    });

    it('alerte WARNING si distance entre 50 et 100 km', async () => {
      mockGeofencing.checkPosition.mockReturnValue({
        enZoneAutorisee: false,
        distanceKm: 75,
      });
      mockRepository.create.mockReturnValue({ ...savedEntity, enZoneAutorisee: false });
      mockRepository.save.mockResolvedValue({ ...savedEntity, enZoneAutorisee: false });

      await service.savePosition(dto);

      expect(mockProducer.sendGeofencingAlert).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'WARNING' }),
      );
    });

    it('vitesse par défaut à 0 si non fournie', async () => {
      await service.savePosition({ vehiculeId: 'v-001', latitude: 48.8, longitude: 2.3 });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vitesse: 0 }),
      );
    });
  });

  // ── findLatest ────────────────────────────────────────────────────────────

  describe('findLatest()', () => {
    it('retourne la dernière position', async () => {
      const pos = { id: 'p1', vehiculeId: 'v-001', latitude: 48.8 };
      mockRepository.findOne.mockResolvedValue(pos);

      const result = await service.findLatest('v-001');
      expect(result).toEqual(pos);
      expect(mockRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vehiculeId: 'v-001' },
          order: { horodatage: 'DESC' },
        }),
      );
    });

    it('lève NotFoundException si aucune position', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findLatest('inexistant')).rejects.toThrow(NotFoundException);
    });
  });

  // ── findByRange ───────────────────────────────────────────────────────────

  describe('findByRange()', () => {
    it('retourne les positions dans la plage temporelle', async () => {
      const positions = [
        { id: 'p1', vehiculeId: 'v-001', latitude: 48.8 },
        { id: 'p2', vehiculeId: 'v-001', latitude: 48.85 },
      ];
      mockRepository.find.mockResolvedValue(positions);

      const debut = new Date('2026-04-12T00:00:00Z');
      const fin   = new Date('2026-04-12T23:59:59Z');
      const result = await service.findByRange('v-001', debut, fin);

      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vehiculeId: 'v-001' }),
          order: { horodatage: 'ASC' },
        }),
      );
    });

    it('retourne un tableau vide si aucune position', async () => {
      mockRepository.find.mockResolvedValue([]);
      const result = await service.findByRange('v-001', new Date(), new Date());
      expect(result).toEqual([]);
    });
  });

  // ── findAllLatest ─────────────────────────────────────────────────────────

  describe('findAllLatest()', () => {
    it('exécute une query builder et retourne les positions', async () => {
      const positions = [{ id: 'p1', vehiculeId: 'v-001' }];
      const mockQB = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(positions),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.findAllLatest();
      expect(result).toEqual(positions);
    });
  });
});
