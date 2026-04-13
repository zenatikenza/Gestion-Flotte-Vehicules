import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Entité GPS — stockée dans PostgreSQL (localization_db).
 *
 * Compatibilité TimescaleDB :
 *   En production, transformer cette table en hypertable avec :
 *     SELECT create_hypertable('position', 'horodatage');
 *   La colonne `horodatage` (TIMESTAMPTZ) devient l'axe de partitionnement
 *   temporel, optimisant les requêtes de type "range scan" sur les données GPS.
 *
 * L'index sur (vehiculeId, horodatage) accélère les requêtes
 * historiquePositions(vehiculeId, debut, fin).
 */
@Entity('position')
@Index(['vehiculeId', 'horodatage'])
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vehicule_id' })
  vehiculeId: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  /** Vitesse en km/h (simulée) */
  @Column({ type: 'double precision', default: 0 })
  vitesse: number;

  /** Indique si le véhicule est dans la zone géofencing autorisée */
  @Column({ name: 'en_zone_autorisee', default: true })
  enZoneAutorisee: boolean;

  /**
   * Horodatage de la mesure GPS (TIMESTAMPTZ).
   * Clé de partitionnement TimescaleDB en prod.
   */
  @CreateDateColumn({ name: 'horodatage', type: 'timestamptz' })
  horodatage: Date;
}
