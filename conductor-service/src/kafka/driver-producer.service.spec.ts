/**
 * Tests unitaires — DriverProducerService
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

import { DriverProducerService } from './driver-producer.service';
import { DriverEvent } from './driver-event.dto';

describe('DriverProducerService', () => {
  let service: DriverProducerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DriverProducerService();
  });

  it('devrait instancier le producer Kafka à la construction', () => {
    expect(mockKafkaConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'conductor-service-producer' }),
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

  it('sendEvent — devrait publier l\'événement sur driver-events', async () => {
    const event: DriverEvent = {
      eventType: 'driver.created',
      conducteurId: 'cond-uuid-001',
      nom: 'Dupont',
      vehiculeId: null,
      message: 'Conducteur créé',
    };

    await service.sendEvent(event);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'driver-events',
        messages: expect.arrayContaining([
          expect.objectContaining({ key: 'cond-uuid-001' }),
        ]),
      }),
    );

    // Le timestamp doit être ajouté automatiquement
    const sentPayload = JSON.parse(mockSend.mock.calls[0][0].messages[0].value);
    expect(sentPayload.timestamp).toBeDefined();
    expect(sentPayload.eventType).toBe('driver.created');
  });
});
