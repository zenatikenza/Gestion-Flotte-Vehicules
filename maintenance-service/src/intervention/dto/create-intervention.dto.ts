import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { TypeIntervention } from '../enums/type-intervention.enum';

export class CreateInterventionDto {
  @IsString()
  @IsNotEmpty()
  vehiculeImmat: string;

  @IsEnum(TypeIntervention)
  @IsNotEmpty()
  type: TypeIntervention;

  @IsDateString()
  @IsNotEmpty()
  datePlanifiee: string;

  @IsOptional()
  @IsString()
  technicienId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @IsOptional()
  @IsString()
  description?: string;
}