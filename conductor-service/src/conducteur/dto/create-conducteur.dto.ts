import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { CategoriePermis } from '../enums/categorie-permis.enum';

export class CreateConducteurDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  prenom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le numéro de permis est obligatoire' })
  numeroPermis: string;

  @IsEnum(CategoriePermis, {
    message: `La catégorie doit être l'une de : ${Object.values(CategoriePermis).join(', ')}`,
  })
  categoriePermis: CategoriePermis;

  @IsDateString({}, { message: 'La date de validité du permis doit être au format ISO (YYYY-MM-DD)' })
  @IsNotEmpty()
  dateValiditePermis: string;

  @IsOptional()
  @IsString()
  keycloakUserId?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}