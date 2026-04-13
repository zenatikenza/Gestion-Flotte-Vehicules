import { Test, TestingModule } from '@nestjs/testing';
import { LocationProducerService } from './location-producer.service';

// Mock KafkaJS au niveau du module
const mockSend = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      send: mockSend,
    }),
  })),
  Partitioners: { LegacyPartitioner: jest.fn() },
}));

describe('LocationProducerService', () => {
  let service: LocationProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationProducerService],
    }).compile();

    service = module.get<LocationProducerService>(LocationProducerService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('se connecte au démarrage du module', () => {
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  // ── sendLocationUpdate ────────────────────────────────────────────────────

  describe('sendLocationUpdate()', () => {
    const baseEvent = {
      vehiculeId: 'v-001',
      latitude: 48.8566,
      longitude: 2.3522,
      vitesse: 60,
      enZoneAutorisee: true,
      horodatage: new Date().toISOString(),
    };

    it('publie sur le topic location-updates', async () => {
      await service.sendLocationUpdate(baseEvent);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'location-updates' }),
      );
    });

    it('utilise vehiculeId comme clé de message', async () => {
      await service.sendLocationUpdate(baseEvent);
      const call = mockSend.mock.calls[0][0];
      expect(call.messages[0].key).toBe('v-001');
    });

    it('sérialise le payload en JSON', async () => {
      await service.sendLocationUpdate(baseEvent);
      const call = mockSend.mock.calls[0][0];
      const parsed = JSON.parse(call.messages[0].value);
      expect(parsed.vehiculeId).toBe('v-001');
      expect(parsed.latitude).toBe(48.8566);
      expect(parsed.enZoneAutorisee).toBe(true);
    });
  });

  // ── sendGeofencingAlert ───────────────────────────────────────────────────

  describe('sendGeofencingAlert()', () => {
    const alertEvent = {
      vehiculeId: 'v-002',
      latitude: 45.764,
      longitude: 4.8357,
      distanceKm: 392.5,
      message: 'Véhicule v-002 hors zone',
      severity: 'CRITICAL' as const,
      timestamp: new Date().toISOString(),
    };

    it('publie sur le topic system-notifications', async () => {
      await service.sendGeofencingAlert(alertEvent);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'system-notifications' }),
      );
    });

    it('inclut le type GEOFENCING_ALERT dans le payload', async () => {
      await service.sendGeofencingAlert(alertEvent);
      const call = mockSend.mock.calls[0][0];
      const parsed = JSON.parse(call.messages[0].value);
      expect(parsed.type).toBe('GEOFENCING_ALERT');
      expect(parsed.severity).toBe('CRITICAL');
    });

    it('utilise vehiculeId comme clé', async () => {
      await service.sendGeofencingAlert(alertEvent);
      const call = mockSend.mock.calls[0][0];
      expect(call.messages[0].key).toBe('v-002');
    });
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  it('se déconnecte à la destruction du module', async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
