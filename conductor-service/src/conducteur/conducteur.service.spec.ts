import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConducteurService } from './conducteur.service';
import { Conducteur } from './entities/conducteur.entity';
import { Assignation } from './entities/assignation.entity';
import { DriverProducerService } from '../kafka/driver-producer.service';
import { CategoriePermis } from './enums/categorie-permis.enum';
import { StatutAssignation } from './enums/statut-assignation.enum';

// ─── Factories de mocks ────────────────────────────────────────────────────────
const mockConducteurRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockAssignationRepo = () => ({
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockDriverProducer = () => ({
  sendEvent: jest.fn().mockResolvedValue(undefined),
});

// ─── Données de test réutilisables ────────────────────────────────────────────
const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 2);
const futureDateStr = futureDate.toISOString().split('T')[0];

const conducteurDto = {
  nom: 'Dupont',
  prenom: 'Jean',
  numeroPermis: 'P-TEST-001',
  categoriePermis: CategoriePermis.B,
  dateValiditePermis: futureDateStr,
};

const conducteurEntity: Partial<Conducteur> = {
  id: 'uuid-001',
  nom: 'Dupont',
  prenom: 'Jean',
  numeroPermis: 'P-TEST-001',
  categoriePermis: CategoriePermis.B,
  actif: true,
  assignations: [],
};

// ─── Suite de tests ───────────────────────────────────────────────────────────
describe('ConducteurService (unitaire)', () => {
  let service: ConducteurService;
  let conducteurRepo: ReturnType<typeof mockConducteurRepo>;
  let assignationRepo: ReturnType<typeof mockAssignationRepo>;
  let driverProducer: ReturnType<typeof mockDriverProducer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConducteurService,
        {
          provide: getRepositoryToken(Conducteur),
          useFactory: mockConducteurRepo,
        },
        {
          provide: getRepositoryToken(Assignation),
          useFactory: mockAssignationRepo,
        },
        {
          provide: DriverProducerService,
          useFactory: mockDriverProducer,
        },
      ],
    }).compile();

    service = module.get<ConducteurService>(ConducteurService);
    conducteurRepo = module.get(getRepositoryToken(Conducteur));
    assignationRepo = module.get(getRepositoryToken(Assignation));
    driverProducer = module.get(DriverProducerService);
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('devrait retourner la liste de tous les conducteurs', async () => {
      conducteurRepo.find.mockResolvedValue([conducteurEntity, conducteurEntity]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(conducteurRepo.find).toHaveBeenCalledWith({
        relations: ['assignations'],
      });
    });

    it('devrait retourner un tableau vide si aucun conducteur', async () => {
      conducteurRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('devrait retourner le conducteur si trouvé', async () => {
      conducteurRepo.findOne.mockResolvedValue(conducteurEntity);

      const result = await service.findById('uuid-001');

      expect(result).toEqual(conducteurEntity);
      expect(conducteurRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-001' },
        relations: ['assignations'],
      });
    });

    it('devrait lever NotFoundException si le conducteur est absent', async () => {
      conducteurRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('uuid-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── create ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('devrait créer un conducteur avec un permis valide', async () => {
      conducteurRepo.findOne.mockResolvedValue(null); // pas de doublon
      conducteurRepo.create.mockReturnValue(conducteurEntity);
      conducteurRepo.save.mockResolvedValue(conducteurEntity);

      const result = await service.create(conducteurDto);

      expect(result).toEqual(conducteurEntity);
      expect(driverProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'driver.created' }),
      );
    });

    it('devrait lever BadRequestException si la date de permis est expirée', async () => {
      const dtoExpire = { ...conducteurDto, dateValiditePermis: '2020-01-01' };

      await expect(service.create(dtoExpire)).rejects.toThrow(
        BadRequestException,
      );
      expect(conducteurRepo.save).not.toHaveBeenCalled();
    });

    it('devrait lever ConflictException si le numéro de permis est déjà utilisé', async () => {
      conducteurRepo.findOne.mockResolvedValue(conducteurEntity); // doublon existant

      await expect(service.create(conducteurDto)).rejects.toThrow(
        ConflictException,
      );
      expect(conducteurRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('devrait mettre à jour les champs fournis', async () => {
      const updated = { ...conducteurEntity, nom: 'Martin' };
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });
      conducteurRepo.save.mockResolvedValue(updated);

      const result = await service.update('uuid-001', { nom: 'Martin' });

      expect(result.nom).toBe('Martin');
      expect(conducteurRepo.save).toHaveBeenCalled();
    });

    it('devrait lever BadRequestException si la nouvelle date de permis est expirée', async () => {
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });

      await expect(
        service.update('uuid-001', { dateValiditePermis: '2019-06-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever ConflictException si le nouveau numéro de permis est déjà pris', async () => {
      conducteurRepo.findOne
        .mockResolvedValueOnce({ ...conducteurEntity })  // findById
        .mockResolvedValueOnce({ id: 'uuid-autre', numeroPermis: 'P-AUTRE' }); // doublon

      await expect(
        service.update('uuid-001', { numeroPermis: 'P-AUTRE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('devrait lever NotFoundException si le conducteur à modifier est absent', async () => {
      conducteurRepo.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-999', { nom: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('devrait supprimer le conducteur existant', async () => {
      conducteurRepo.findOne.mockResolvedValue(conducteurEntity);
      conducteurRepo.remove.mockResolvedValue(conducteurEntity);

      await service.delete('uuid-001');

      expect(conducteurRepo.remove).toHaveBeenCalledWith(conducteurEntity);
    });

    it('devrait lever NotFoundException si le conducteur à supprimer est absent', async () => {
      conducteurRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('uuid-999')).rejects.toThrow(NotFoundException);
    });
  });

  // ── assigner ──────────────────────────────────────────────────────────────
  describe('assigner', () => {
    it('devrait créer une assignation EN_COURS', async () => {
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });
      assignationRepo.find.mockResolvedValue([]); // pas d'assignation en cours
      const assignation = {
        id: 'assign-001',
        vehiculeId: 'vehicule-uuid-001',
        statut: StatutAssignation.EN_COURS,
      };
      assignationRepo.create.mockReturnValue(assignation);
      assignationRepo.save.mockResolvedValue(assignation);

      const result = await service.assigner('uuid-001', 'vehicule-uuid-001');

      expect(result.statut).toBe(StatutAssignation.EN_COURS);
      expect(driverProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'driver.assigned',
          vehiculeId: 'vehicule-uuid-001',
        }),
      );
    });

    it('devrait clôturer les assignations existantes avant d\'en créer une nouvelle', async () => {
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });
      const ancienne = {
        id: 'assign-old',
        statut: StatutAssignation.EN_COURS,
        dateRetour: null,
      };
      assignationRepo.find.mockResolvedValue([ancienne]);
      assignationRepo.save
        .mockResolvedValueOnce({ ...ancienne, statut: StatutAssignation.TERMINEE }) // clôture
        .mockResolvedValueOnce({ id: 'assign-new', statut: StatutAssignation.EN_COURS }); // nouvelle
      assignationRepo.create.mockReturnValue({ id: 'assign-new', statut: StatutAssignation.EN_COURS });

      await service.assigner('uuid-001', 'vehicule-uuid-002');

      expect(assignationRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  // ── desassigner ───────────────────────────────────────────────────────────
  describe('desassigner', () => {
    it('devrait terminer l\'assignation en cours', async () => {
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });
      const assignation = { id: 'assign-001', statut: StatutAssignation.EN_COURS };
      assignationRepo.find.mockResolvedValue([assignation]);
      assignationRepo.save.mockResolvedValue({
        ...assignation,
        statut: StatutAssignation.TERMINEE,
      });

      await service.desassigner('uuid-001');

      expect(driverProducer.sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'driver.unassigned' }),
      );
    });

    it('devrait lever BadRequestException si aucune assignation en cours', async () => {
      conducteurRepo.findOne.mockResolvedValue({ ...conducteurEntity });
      assignationRepo.find.mockResolvedValue([]); // aucune assignation

      await expect(service.desassigner('uuid-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── findMesAssignations ───────────────────────────────────────────────────
  describe('findMesAssignations', () => {
    it('devrait retourner les assignations du conducteur lié au keycloakUserId', async () => {
      const assignation = { id: 'assign-001', vehiculeId: 'v-001', statut: StatutAssignation.EN_COURS };
      const conducteurAvecAssignation = { ...conducteurEntity, keycloakUserId: 'kc-uuid-001', assignations: [assignation] };
      conducteurRepo.findOne.mockResolvedValue(conducteurAvecAssignation);

      const result = await service.findMesAssignations('kc-uuid-001');

      expect(result).toHaveLength(1);
      expect(result[0].vehiculeId).toBe('v-001');
      expect(conducteurRepo.findOne).toHaveBeenCalledWith({
        where: { keycloakUserId: 'kc-uuid-001' },
        relations: ['assignations'],
      });
    });

    it('devrait retourner un tableau vide si aucun conducteur ne correspond au keycloakUserId', async () => {
      conducteurRepo.findOne.mockResolvedValue(null);

      const result = await service.findMesAssignations('kc-inconnu');

      expect(result).toEqual([]);
    });
  });

  // ── desassignerParVehicule (SAGA) ─────────────────────────────────────────
  describe('desassignerParVehicule', () => {
    it('devrait terminer toutes les assignations du véhicule supprimé', async () => {
      const assignation = {
        id: 'assign-001',
        vehiculeId: 'vehicule-uuid-001',
        statut: StatutAssignation.EN_COURS,
      };
      assignationRepo.find.mockResolvedValue([assignation]);
      assignationRepo.save.mockResolvedValue({
        ...assignation,
        statut: StatutAssignation.TERMINEE,
      });

      await service.desassignerParVehicule('vehicule-uuid-001');

      expect(assignationRepo.save).toHaveBeenCalledTimes(1);
    });

    it('ne devrait rien faire si aucune assignation pour ce véhicule', async () => {
      assignationRepo.find.mockResolvedValue([]);

      await service.desassignerParVehicule('vehicule-inconnu');

      expect(assignationRepo.save).not.toHaveBeenCalled();
    });
  });
});
