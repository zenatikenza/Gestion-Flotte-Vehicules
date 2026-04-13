import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { TypeIntervention } from '../enums/type-intervention.enum';
import { StatutIntervention } from '../enums/statut-intervention.enum';

export class UpdateInterventionDto {
  @IsOptional()
  @IsString()
  vehiculeImmat?: string;

  @IsOptional()
  @IsString()
  technicienId?: string;

  @IsOptional()
  @IsEnum(TypeIntervention)
  type?: TypeIntervention;

  @IsOptional()
  @IsDateString()
  datePlanifiee?: string;

  @IsOptional()
  @IsDateString()
  dateRealisation?: string;

  @IsOptional()
  @IsEnum(StatutIntervention)
  statut?: StatutIntervention;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
