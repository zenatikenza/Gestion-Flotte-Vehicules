import { IsNumber, IsString, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  vehiculeId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vitesse?: number;

  @IsBoolean()
  @IsOptional()
  enZoneAutorisee?: boolean;
}
