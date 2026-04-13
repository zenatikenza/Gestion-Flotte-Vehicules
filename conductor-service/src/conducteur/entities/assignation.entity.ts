import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StatutAssignation } from '../enums/statut-assignation.enum';
import { Conducteur } from './conducteur.entity';

@Entity('assignation')
export class Assignation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Référence logique (pas de FK SQL) — le véhicule est dans un autre service
 @Column() 
 vehiculeId: string;

  @ManyToOne(() => Conducteur, (conducteur) => conducteur.assignations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conducteur_id' })
  conducteur: Conducteur;

  @Column({ type: 'timestamptz' })
  dateDepart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateRetour: Date;

  @Column({
    type: 'enum',
    enum: StatutAssignation,
    default: StatutAssignation.EN_COURS,
  })
  statut: StatutAssignation;

  @CreateDateColumn()
  createdAt: Date;
}
