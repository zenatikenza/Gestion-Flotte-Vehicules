import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { StatutIntervention } from '../enums/statut-intervention.enum';
import { TypeIntervention } from '../enums/type-intervention.enum';

@Entity()
export class Intervention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehiculeImmat: string; // <--- VÉRIFIE BIEN CETTE LIGNE

  @Column({ nullable: true })
  technicienId: string;

  @Column({ type: 'enum', enum: TypeIntervention })
  type: TypeIntervention;

  @Column({ type: 'timestamp' })
  datePlanifiee: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateRealisation: Date;

  @Column({ type: 'enum', enum: StatutIntervention, default: StatutIntervention.PLANIFIEE })
  statut: StatutIntervention;

  @Column({ type: 'float', nullable: true })
  cout: number;

  @Column({ nullable: true })
  description: string;
}