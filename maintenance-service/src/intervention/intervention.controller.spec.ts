import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { InterventionModule } from './intervention.module';
import { KafkaModule } from '../kafka/kafka.module';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Intervention } from './entities/intervention.entity';
import { MaintenanceProducerService } from '../kafka/maintenance-producer.service';
import { TypeIntervention } from './enums/type-intervention.enum';
import { StatutIntervention } from './enums/statut-intervention.enum';

/**
 * Tests d'intégration — PostgreSQL réelle via Testcontainers.
 * MaintenanceProducerService est mocké pour éviter toute dépendance Kafka.
 */
describe('InterventionController (intégration — Testcontainers)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  const mockMaintenanceProducer = { sendEvent: jest.fn().mockResolvedValue(undefined) };

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const interventionPayload = {
    vehiculeImmat: 'TC-INT-001',
    type: TypeIntervention.PREVENTIVE,
    datePlanifiee: futureDateStr,
    technicienId: 'tech-tc-001',
    cout: 120,
    description: 'Vidange + contrôle freins',
  };

  let interventionId: string;

  // ── Setup ─────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('maintenance_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getMappedPort(5432),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [Intervention],
          synchronize: true,
        }),
        KafkaModule,
        InterventionModule,
      ],
    })
      .overrideProvider(MaintenanceProducerService)
      .useValue(mockMaintenanceProducer)
      // Guards JWT mockés — Keycloak non disponible en test
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  }, 90_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  // ── Tests REST ────────────────────────────────────────────────────────────

  it('POST /api/interventions — 201 : crée une intervention', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/interventions')
      .send(interventionPayload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.vehiculeImmat).toBe('TC-INT-001');
    expect(res.body.statut).toBe(StatutIntervention.PLANIFIEE);
    expect(mockMaintenanceProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'maintenance.created' }),
    );
    interventionId = res.body.id;
  });

  it('GET /api/interventions — 200 : liste toutes les interventions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/interventions')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/interventions?vehiculeImmat=TC-INT-001 — 200 : filtre par véhicule', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/interventions?vehiculeImmat=TC-INT-001')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.every((i: any) => i.vehiculeImmat === 'TC-INT-001')).toBe(true);
  });

  it('GET /api/interventions/:id — 200 : retourne l\'intervention existante', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/interventions/${interventionId}`)
      .expect(200);

    expect(res.body.id).toBe(interventionId);
    expect(res.body.type).toBe(TypeIntervention.PREVENTIVE);
  });

  it('GET /api/interventions/:id — 404 : intervention inexistante', async () => {
    await request(app.getHttpServer())
      .get('/api/interventions/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('PUT /api/interventions/:id — 200 : met à jour la description', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/interventions/${interventionId}`)
      .send({ description: 'Remplacement filtres + pneus' })
      .expect(200);

    expect(res.body.description).toBe('Remplacement filtres + pneus');
    expect(mockMaintenanceProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'maintenance.updated' }),
    );
  });

  it('PUT /api/interventions/:id/terminer — 200 : termine l\'intervention', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/interventions/${interventionId}/terminer`)
      .send({ cout: 250 })
      .expect(200);

    expect(res.body.statut).toBe(StatutIntervention.TERMINEE);
    expect(res.body.dateRealisation).toBeDefined();
    expect(mockMaintenanceProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'maintenance.completed' }),
    );
  });

  it('PUT /api/interventions/:id — 400 : impossible de modifier une intervention TERMINEE', async () => {
    await request(app.getHttpServer())
      .put(`/api/interventions/${interventionId}`)
      .send({ description: 'Tentative de modification' })
      .expect(400);
  });

  it('POST /api/interventions — 400 : champs obligatoires manquants', async () => {
    await request(app.getHttpServer())
      .post('/api/interventions')
      .send({ vehiculeImmat: 'XX-000-YY' }) // manque type et datePlanifiee
      .expect(400);
  });

  it('POST /api/interventions (SAGA) — crée une 2e intervention puis l\'annule', async () => {
    // Crée une 2e intervention pour tester l'annulation
    const res = await request(app.getHttpServer())
      .post('/api/interventions')
      .send({ ...interventionPayload, vehiculeImmat: 'TC-INT-002' })
      .expect(201);

    const id2 = res.body.id;

    const annulRes = await request(app.getHttpServer())
      .put(`/api/interventions/${id2}/annuler`)
      .expect(200);

    expect(annulRes.body.statut).toBe(StatutIntervention.ANNULEE);
    expect(mockMaintenanceProducer.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'maintenance.cancelled' }),
    );
  });

  it('DELETE /api/interventions/:id — 204 : supprime l\'intervention TERMINEE', async () => {
    await request(app.getHttpServer())
      .delete(`/api/interventions/${interventionId}`)
      .expect(204);
  });

  it('GET /api/interventions/:id — 404 : intervention supprimée', async () => {
    await request(app.getHttpServer())
      .get(`/api/interventions/${interventionId}`)
      .expect(404);
  });
});
