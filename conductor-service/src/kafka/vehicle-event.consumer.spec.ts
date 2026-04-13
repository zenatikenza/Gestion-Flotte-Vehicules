/**
 * Tests unitaires — VehicleEventConsumer
 * kafkajs est mocké pour éviter toute connexion broker.
 * ConducteurService est mocké pour isoler le consumer.
 */

let eachMessageHandler: (ctx: any) => Promise<void>;

const mockConsumerConnect = jest.fn().mockResolvedValue(undefined);
const mockConsumerSubscribe = jest.fn().mockResolvedValue(undefined);
const mockConsumerDisconnect = jest.fn().mockResolvedValue(undefined);
const mockConsumerRun = jest.fn().mockImplementation(async ({ eachMessage }) => {
  eachMessageHandler = eachMessage;
});
const mockConsumerInstance = {
  connect: mockConsumerConnect,
  subscribe: mockConsumerSubscribe,
  run: mockConsumerRun,
  disconnect: mockConsumerDisconnect,
};
const mockKafkaConsumer = jest.fn().mockReturnValue(mockConsumerInstance);
const mockKafkaConstructor = jest.fn().mockReturnValue({ consumer: mockKafkaConsumer });

jest.mock('kafkajs', () => ({
  Kafka: mockKafkaConstructor,
}));

import { VehicleEventConsumer } from './vehicle-event.consumer';
import { ConducteurService } from '../conducteur/conducteur.service';

describe('VehicleEventConsumer', () => {
  let consumer: VehicleEventConsumer;
  let conducteurService: jest.Mocked<Pick<ConducteurService, 'desassignerParVehicule'>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    conducteurService = {
      desassignerParVehicule: jest.fn().mockResolvedValue(undefined),
    };
    consumer = new VehicleEventConsumer(conducteurService as any);
    await consumer.onModuleInit();
  });

  it('onModuleInit — devrait connecter et s\'abonner à vehicle-events', () => {
    expect(mockConsumerConnect).toHaveBeenCalledTimes(1);
    expect(mockConsumerSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'vehicle-events' }),
    );
    expect(mockConsumerRun).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy — devrait déconnecter le consumer', async () => {
    await consumer.onModuleDestroy();
    expect(mockConsumerDisconnect).toHaveBeenCalledTimes(1);
  });

  it('eachMessage — devrait appeler desassignerParVehicule sur vehicle_deleted', async () => {
    const message = {
      value: Buffer.from(
        JSON.stringify({ event_type: 'vehicle_deleted', vehicle_id: 42 }),
      ),
    };

    await eachMessageHandler({ message });

    expect(conducteurService.desassignerParVehicule).toHaveBeenCalledWith('42');
  });

  it('eachMessage — ne devrait pas appeler desassignerParVehicule pour un autre event_type', async () => {
    const message = {
      value: Buffer.from(
        JSON.stringify({ event_type: 'vehicle_created', vehicle_id: 1 }),
      ),
    };

    await eachMessageHandler({ message });

    expect(conducteurService.desassignerParVehicule).not.toHaveBeenCalled();
  });

  it('eachMessage — ne devrait pas appeler desassignerParVehicule si vehicle_id est absent', async () => {
    const message = {
      value: Buffer.from(JSON.stringify({ event_type: 'vehicle_deleted' })),
    };

    await eachMessageHandler({ message });

    expect(conducteurService.desassignerParVehicule).not.toHaveBeenCalled();
  });

  it('eachMessage — devrait absorber les erreurs de parsing sans crash', async () => {
    const message = { value: Buffer.from('invalid-json{{{') };

    // Ne doit pas lever d'exception
    await expect(eachMessageHandler({ message })).resolves.toBeUndefined();
  });
});
