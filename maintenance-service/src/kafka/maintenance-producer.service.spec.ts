/**
 * Tests unitaires — MaintenanceProducerService
 * kafkajs est mocké pour éviter toute connexion à un broker réel.
 */

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSend = jest.fn().mockResolvedValue(undefined);
const mockProducerInstance = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  send: mockSend,
};
const mockKafkaProducer = jest.fn().mockReturnValue(mockProducerInstance);
const mockKafkaConstructor = jest.fn().mockReturnValue({ producer: mockKafkaProducer });

jest.mock('kafkajs', () => ({
  Kafka: mockKafkaConstructor,
  Partitioners: { LegacyPartitioner: 'LegacyPartitioner' },
}));

import { MaintenanceProducerService } from './maintenance-producer.service';
import { MaintenanceEvent } from './maintenance-event.dto';

describe('MaintenanceProducerService', () => {
  let service: MaintenanceProducerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceProducerService();
  });

  it('devrait instancier le producer Kafka à la construction', () => {
    expect(mockKafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'maintenance-service-producer' }),
    );
    expect(mockKafkaProducer).toHaveBeenCalled();
  });

  it('onModuleInit — devrait connecter le producer', async () => {
    await service.onModuleInit();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy — devrait déconnecter le producer', async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('sendEvent — devrait publier l\'événement sur maintenance-alerts', async () => {
    const event: MaintenanceEvent = {
      eventType: 'maintenance.created',
      interventionId: 'int-uuid-001',
      vehicle_id: 0,
      vehicleImmat: 'AB-123-CD',
      type: 'PREVENTIVE',
      statut: 'PLANIFIEE',
      message: 'Intervention créée',
    };

    await service.sendEvent(event);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'maintenance-alerts',
        messages: expect.arrayContaining([
          expect.objectContaining({ key: 'int-uuid-001' }),
        ]),
      }),
    );

    const sentPayload = JSON.parse(mockSend.mock.calls[0][0].messages[0].value);
    expect(sentPayload.timestamp).toBeDefined();
    expect(sentPayload.eventType).toBe('maintenance.created');
    expect(sentPayload.vehicleImmat).toBe('AB-123-CD');
  });
});
