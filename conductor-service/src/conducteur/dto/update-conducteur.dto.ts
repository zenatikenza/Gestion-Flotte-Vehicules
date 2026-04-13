import { PartialType } from '@nestjs/mapped-types';
import { CreateConducteurDto } from './create-conducteur.dto';

export class UpdateConducteurDto extends PartialType(CreateConducteurDto) {}
