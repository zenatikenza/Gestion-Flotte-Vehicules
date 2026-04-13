import { Test, TestingModule } from '@nestjs/testing';
import { VehicleEventConsumer } from './vehicle-event.consumer';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

const mockRun = jest.fn();
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      subscribe: mockSubscribe,
      run: mockRun,
    }),
  })),
}));

describe('VehicleEventConsumer', () => {
  let consumer: VehicleEventConsumer;
  let gpsSimulator: jest.Mocked<GpsSimulatorService>;

  /** Helper : simule la réception d'un message Kafka */
  let capturedHandler: (ctx: { message: { value: Buffer } }) => Promise<void>;

  beforeEach(async () => {
    mockRun.mockImplementation(async ({ eachMessage }) => {
      capturedHandler = eachMessage;
    });

    gpsSimulator = {
      addVehicle: jest.fn(),
      removeVehicle: jest.fn(),
      getActiveVehicleIds: jest.fn().mockReturnValue([]),
      setPositionService: jest.fn(),
      tick: jest.fn(),
      randomOffset: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleEventConsumer,
        { provide: GpsSimulatorService, useValue: gpsSimulator },
      ],
    }).compile();

    consumer = module.get<VehicleEventConsumer>(VehicleEventConsumer);
    await consumer.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('souscrit au topic vehicle-events', () => {
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'vehicle-events' }),
    );
  });

  // ── traitement des événements ─────────────────────────────────────────────

  const sendEvent = async (event: object) => {
    await capturedHandler({
      message: { value: Buffer.from(JSON.stringify(event)) },
    });
  };

  it('vehicle_created → addVehicle()', async () => {
    await sendEvent({ event_type: 'vehicle_created', vehicle_id: 'v-001' });
    expect(gpsSimulator.addVehicle).toHaveBeenCalledWith('v-001');
  });

  it('VEHICLE_CREATED (camelCase) → addVehicle()', async () => {
    await sendEvent({ eventType: 'VEHICLE_CREATED', vehiculeId: 'v-002' });
    expect(gpsSimulator.addVehicle).toHaveBeenCalledWith('v-002');
  });

  it('vehicle_deleted → removeVehicle()', async () => {
    await sendEvent({ event_type: 'vehicle_deleted', vehicle_id: 'v-003' });
    expect(gpsSimulator.removeVehicle).toHaveBeenCalledWith('v-003');
  });

  it('vehicle_updated statut AVAILABLE → addVehicle()', async () => {
    await sendEvent({
      event_type: 'vehicle_updated',
      vehicle_id: 'v-004',
      status: 'AVAILABLE',
    });
    expect(gpsSimulator.addVehicle).toHaveBeenCalledWith('v-004');
  });

  it('vehicle_updated statut MAINTENANCE → removeVehicle()', async () => {
    await sendEvent({
      event_type: 'vehicle_updated',
      vehicle_id: 'v-005',
      status: 'MAINTENANCE',
    });
    expect(gpsSimulator.removeVehicle).toHaveBeenCalledWith('v-005');
  });

  it(`événement inconnu → ne lève pas d'erreur`, async () => {
    await expect(
      sendEvent({ event_type: 'unknown_event', vehicle_id: 'v-006' }),
    ).resolves.not.toThrow();
    expect(gpsSimulator.addVehicle).not.toHaveBeenCalled();
    expect(gpsSimulator.removeVehicle).not.toHaveBeenCalled();
  });

  it(`message JSON invalide → ne lève pas d'erreur`, async () => {
    await expect(
      capturedHandler({ message: { value: Buffer.from('not-json') } }),
    ).resolves.not.toThrow();
  });

  it(`vehiculeId absent → ne lève pas d'erreur`, async () => {
    await expect(
      sendEvent({ event_type: 'vehicle_created' }),
    ).resolves.not.toThrow();
  });

  // ── lifecycle ─────────────────────────────────────────────────────────────

  it('se déconnecte à la destruction du module', async () => {
    await consumer.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
