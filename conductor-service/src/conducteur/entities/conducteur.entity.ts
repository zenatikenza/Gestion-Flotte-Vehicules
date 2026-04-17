import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { CategoriePermis } from '../enums/categorie-permis.enum';
import { Assignation } from './assignation.entity';

@Entity('conducteur')
export class Conducteur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  keycloakUserId: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  numeroPermis: string;

  @Column({ type: 'enum', enum: CategoriePermis })
  categoriePermis: CategoriePermis;

  @Column({ type: 'date' })
  dateValiditePermis: Date;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Assignation, (assignation) => assignation.conducteur, {
    cascade: true,
  })
  assignations: Assignation[];
}
