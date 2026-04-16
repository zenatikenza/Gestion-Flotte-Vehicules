import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ConducteurModule } from './conducteur.module';
import { KafkaModule } from '../kafka/kafka.module';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Conducteur } from './entities/conducteur.entity';
import { Assignation } from './entities/assignation.entity';
import { DriverProducerService } from '../kafka/driver-producer.service';
import { VehicleEventConsumer } from '../kafka/vehicle-event.consumer';
import { CategoriePermis } from './enums/categorie-permis.enum';
import { StatutAssignation } from './enums/statut-assignation.enum';

/**
 * Tests d'intégration — PostgreSQL réelle via Testcontainers.
 * DriverProducerService et VehicleEventConsumer sont mockés pour éviter
 * toute dépendance à un broker Kafka en environnement de test.
 */
describe('ConducteurController (intégration — Testcontainers)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  // Mocks Kafka
  const mockDriverProducer = { sendEvent: jest.fn().mockResolvedValue(undefined) };
  const mockVehicleConsumer = {
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  // Date de validité dans le futur
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const conducteurPayload = {
    nom: 'Dupont',
    prenom: 'Jean',
    numeroPermis: 'TC-INT-001',
    categoriePermis: CategoriePermis.B,
    dateValiditePermis: futureDateStr,
  };

  // ID récupéré après la création, partagé entre les tests
  let conducteurId: string;

  // ── Setup ─────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Démarre un conteneur PostgreSQL éphémère
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('conductor_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Connexion à la vraie BDD du container
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getMappedPort(5432),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [Conducteur, Assignation],
          synchronize: true,
        }),
        // KafkaModule doit être importé pour que DriverProducerService soit
        // enregistré dans le graphe de modules — sans cela @Global() n'a aucun
        // effet et overrideProvider() ne peut pas intercepter le provider.
        // useValue dans les overrides ci-dessous empêche toute vraie connexion Kafka.
        KafkaModule,
        ConducteurModule,
      ],
    })
      // Kafka mocké — pas besoin de broker en test
      .overrideProvider(DriverProducerService)
      .useValue(mockDriverProducer)
      .overrideProvider(VehicleEventConsumer)
      .useValue(mockVehicleConsumer)
      // Guards JWT mockés — Keycloak non disponible en test
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  }, 90_000); // timeout généreux pour le pull de l'image Docker

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  // ── Tests REST (ordonnés, état partagé via conducteurId) ──────────────────

  it('POST /api/conducteurs — 201 : crée un conducteur', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/conducteurs')
      .send(conducteurPayload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.nom).toBe('Dupont');
    expect(res.body.prenom).toBe('Jean');
    expect(res.body.numeroPermis).toBe('TC-INT-001');
    expect(mockDriverProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'driver.created' }),
    );
    conducteurId = res.body.id;
  });

  it('GET /api/conducteurs — 200 : liste tous les conducteurs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/conducteurs')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/conducteurs/:id — 200 : retourne le conducteur existant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/conducteurs/${conducteurId}`)
      .expect(200);

    expect(res.body.id).toBe(conducteurId);
    expect(res.body.categoriePermis).toBe(CategoriePermis.B);
  });

  it('GET /api/conducteurs/:id — 404 : conducteur inexistant', async () => {
    await request(app.getHttpServer())
      .get('/api/conducteurs/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('PUT /api/conducteurs/:id — 200 : met à jour le nom', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/conducteurs/${conducteurId}`)
      .send({ nom: 'Martin' })
      .expect(200);

    expect(res.body.nom).toBe('Martin');
    expect(res.body.id).toBe(conducteurId);
  });

  it('POST /api/conducteurs/:id/assigner/:vehiculeId — 201 : assigne un véhicule', async () => {
    const vehiculeId = '550e8400-e29b-41d4-a716-446655440000';

    const res = await request(app.getHttpServer())
      .post(`/api/conducteurs/${conducteurId}/assigner/${vehiculeId}`)
      .expect(201);

    expect(res.body.vehiculeId).toBe(vehiculeId);
    expect(res.body.statut).toBe(StatutAssignation.EN_COURS);
    expect(mockDriverProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'driver.assigned' }),
    );
  });

  it('DELETE /api/conducteurs/:id/assigner — 204 : désassigne le conducteur', async () => {
    await request(app.getHttpServer())
      .delete(`/api/conducteurs/${conducteurId}/assigner`)
      .expect(204);

    expect(mockDriverProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'driver.unassigned' }),
    );
  });

  it('DELETE /api/conducteurs/:id/assigner — 400 : aucune assignation en cours', async () => {
    // Le conducteur vient d'être désassigné, une 2e tentative doit échouer
    await request(app.getHttpServer())
      .delete(`/api/conducteurs/${conducteurId}/assigner`)
      .expect(400);
  });

  it('POST /api/conducteurs — 409 : numéro de permis déjà enregistré', async () => {
    await request(app.getHttpServer())
      .post('/api/conducteurs')
      .send({ ...conducteurPayload, prenom: 'Autre' }) // même permis TC-INT-001
      .expect(409);
  });

  it('POST /api/conducteurs — 400 : permis expiré', async () => {
    await request(app.getHttpServer())
      .post('/api/conducteurs')
      .send({ ...conducteurPayload, numeroPermis: 'TC-EXP-001', dateValiditePermis: '2020-01-01' })
      .expect(400);
  });

  it('POST /api/conducteurs — 400 : champs obligatoires manquants', async () => {
    await request(app.getHttpServer())
      .post('/api/conducteurs')
      .send({ nom: 'Incomplet' }) // manque prenom, numeroPermis, etc.
      .expect(400);
  });

  it('GET /api/conducteurs/me/assignations — 200 : retourne tableau vide si aucun conducteur lié', async () => {
    // Aucun conducteur ne possède ce keycloakUserId → tableau vide attendu
    // Le guard est mocké donc le header Authorization est ignoré
    const res = await request(app.getHttpServer())
      .get('/api/conducteurs/me/assignations')
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
  });

  it('DELETE /api/conducteurs/:id — 204 : supprime le conducteur', async () => {
    await request(app.getHttpServer())
      .delete(`/api/conducteurs/${conducteurId}`)
      .expect(204);
  });

  it('GET /api/conducteurs/:id — 404 : conducteur supprimé', async () => {
    await request(app.getHttpServer())
      .get(`/api/conducteurs/${conducteurId}`)
      .expect(404);
  });
});
