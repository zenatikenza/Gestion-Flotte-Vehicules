import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InterventionService } from './intervention.service';
import { Intervention } from './entities/intervention.entity';
import { MaintenanceProducerService } from '../kafka/maintenance-producer.service';
import { TypeIntervention } from './enums/type-intervention.enum';
import { StatutIntervention } from './enums/statut-intervention.enum';

// ─── Factories de mocks ────────────────────────────────────────────────────────
const mockInterventionRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockMaintenanceProducer = () => ({
  sendEvent: jest.fn().mockResolvedValue(undefined),
});

// ─── Données de test réutilisables ────────────────────────────────────────────
const futureDate = new Date();
futureDate.setMonth(futureDate.getMonth() + 1);
const futureDateStr = futureDate.toISOString().split('T')[0];

const createDto = {
  vehiculeImmat: 'AB-123-CD',
  type: TypeIntervention.PREVENTIVE,
  datePlanifiee: futureDateStr,
  technicienId: 'tech-001',
  cout: 150,
  description: 'Vidange + filtres',
};

const interventionEntity: Partial<Intervention> = {
  id: 'uuid-int-001',
  vehiculeImmat: 'AB-123-CD',
  type: TypeIntervention.PREVENTIVE,
  statut: StatutIntervention.PLANIFIEE,
  technicienId: 'tech-001',
  cout: 150,
  description: 'Vidange + filtres',
};

// ─── Suite de tests ───────────────────────────────────────────────────────────
describe('InterventionService (unitaire)', () => {
  let service: InterventionService;
  let interventionRepo: ReturnType<typeof mockInterventionRepo>;
  let maintenanceProducer: ReturnType<typeof mockMaintenanceProducer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterventionService,
        {
          provide: getRepositoryToken(Intervention),
          useFactory: mockInterventionRepo,
        },
        {
          provide: MaintenanceProducerService,
          useFactory: mockMaintenanceProducer,
        },
      ],
    }).compile();

    service = module.get<InterventionService>(InterventionService);
    interventionRepo = module.get(getRepositoryToken(Intervention));
    maintenanceProducer = module.get(MaintenanceProducerService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('devrait retourner la liste de toutes les interventions', async () => {
      interventionRepo.find.mockResolvedValue([interventionEntity, interventionEntity]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(interventionRepo.find).toHaveBeenCalledWith({
        order: { datePlanifiee: 'ASC' },
      });
    });

    it('devrait retourner un tableau vide si aucune intervention', async () => {
      interventionRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('devrait retourner l\'intervention si trouvée', async () => {
      interventionRepo.findOne.mockResolvedValue(interventionEntity);

      const result = await service.findById('uuid-int-001');

      expect(result).toEqual(interventionEntity);
      expect(interventionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-int-001' },
      });
    });

    it('devrait lever NotFoundException si l\'intervention est absente', async () => {
      interventionRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('uuid-inconnu')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findByVehicule ────────────────────────────────────────────────────────
  describe('findByVehicule', () => {
    it('devrait retourner les interventions filtrées par immatriculation', async () => {
      interventionRepo.find.mockResolvedValue([interventionEntity]);

      const result = await service.findByVehicule('AB-123-CD');

      expect(result).toHaveLength(1);
      expect(interventionRepo.find).toHaveBeenCalledWith({
        where: { vehiculeImmat: 'AB-123-CD' },
        order: { datePlanifiee: 'ASC' },
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('devrait créer une intervention avec statut PLANIFIEE', async () => {
      interventionRepo.create.mockReturnValue(interventionEntity);
      interventionRepo.save.mockResolvedValue(interventionEntity);

      const result = await service.create(createDto);

      expect(result).toEqual(interventionEntity);
      expect(maintenanceProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'maintenance.created' }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('devrait mettre à jour une intervention PLANIFIEE', async () => {
      const updated = { ...interventionEntity, description: 'Remplacement pneus' };
      interventionRepo.findOne.mockResolvedValue({ ...interventionEntity });
      interventionRepo.save.mockResolvedValue(updated);

      const result = await service.update('uuid-int-001', { description: 'Remplacement pneus' });

      expect(result.description).toBe('Remplacement pneus');
      expect(maintenanceProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'maintenance.updated' }),
      );
    });

    it('devrait lever BadRequestException si l\'intervention est TERMINEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.TERMINEE,
      });

      await expect(
        service.update('uuid-int-001', { description: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si l\'intervention est ANNULEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.ANNULEE,
      });

      await expect(
        service.update('uuid-int-001', { description: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si l\'intervention à modifier est absente', async () => {
      interventionRepo.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-999', { description: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── terminer ──────────────────────────────────────────────────────────────
  describe('terminer', () => {
    it('devrait terminer une intervention EN_COURS avec un coût', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.EN_COURS,
      });
      const terminee = { ...interventionEntity, statut: StatutIntervention.TERMINEE, cout: 200 };
      interventionRepo.save.mockResolvedValue(terminee);

      const result = await service.terminer('uuid-int-001', 200);

      expect(result.statut).toBe(StatutIntervention.TERMINEE);
      expect(maintenanceProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'maintenance.completed' }),
      );
    });

    it('devrait terminer une intervention PLANIFIEE', async () => {
      interventionRepo.findOne.mockResolvedValue({ ...interventionEntity });
      interventionRepo.save.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.TERMINEE,
      });

      await service.terminer('uuid-int-001');

      expect(interventionRepo.save).toHaveBeenCalled();
    });

    it('devrait lever BadRequestException si l\'intervention est déjà TERMINEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.TERMINEE,
      });

      await expect(service.terminer('uuid-int-001')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si l\'intervention est ANNULEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.ANNULEE,
      });

      await expect(service.terminer('uuid-int-001')).rejects.toThrow(BadRequestException);
    });
  });

  // ── annuler ───────────────────────────────────────────────────────────────
  describe('annuler', () => {
    it('devrait annuler une intervention PLANIFIEE', async () => {
      interventionRepo.findOne.mockResolvedValue({ ...interventionEntity });
      interventionRepo.save.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.ANNULEE,
      });

      const result = await service.annuler('uuid-int-001');

      expect(result.statut).toBe(StatutIntervention.ANNULEE);
      expect(maintenanceProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'maintenance.cancelled' }),
      );
    });

    it('devrait lever BadRequestException si l\'intervention est TERMINEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.TERMINEE,
      });

      await expect(service.annuler('uuid-int-001')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si l\'intervention est déjà ANNULEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.ANNULEE,
      });

      await expect(service.annuler('uuid-int-001')).rejects.toThrow(BadRequestException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('devrait supprimer une intervention PLANIFIEE', async () => {
      interventionRepo.findOne.mockResolvedValue({ ...interventionEntity });
      interventionRepo.remove.mockResolvedValue(interventionEntity);

      await service.delete('uuid-int-001');

      expect(interventionRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'uuid-int-001' }),
      );
    });

    it('devrait supprimer une intervention TERMINEE', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.TERMINEE,
      });
      interventionRepo.remove.mockResolvedValue(interventionEntity);

      await service.delete('uuid-int-001');

      expect(interventionRepo.remove).toHaveBeenCalled();
    });

    it('devrait lever BadRequestException si l\'intervention est EN_COURS', async () => {
      interventionRepo.findOne.mockResolvedValue({
        ...interventionEntity,
        statut: StatutIntervention.EN_COURS,
      });

      await expect(service.delete('uuid-int-001')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si l\'intervention à supprimer est absente', async () => {
      interventionRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('uuid-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ── annulerParVehicule (SAGA) ──────────────────────────────────────────────
  describe('annulerParVehicule', () => {
    it('devrait annuler toutes les interventions actives du véhicule supprimé', async () => {
      const interventions = [
        { ...interventionEntity, statut: StatutIntervention.PLANIFIEE },
        { ...interventionEntity, id: 'uuid-int-002', statut: StatutIntervention.EN_COURS },
      ];
      interventionRepo.find.mockResolvedValue(interventions);
      interventionRepo.save.mockResolvedValue({});

      await service.annulerParVehicule('AB-123-CD');

      expect(interventionRepo.save).toHaveBeenCalledTimes(2);
    });

    it('ne devrait rien faire si aucune intervention active pour ce véhicule', async () => {
      interventionRepo.find.mockResolvedValue([]);

      await service.annulerParVehicule('XX-999-ZZ');

      expect(interventionRepo.save).not.toHaveBeenCalled();
    });
  });
});
