import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

/**
 * Contrôleur REST du localization-service.
 *
 * Endpoints :
 *   GET  /api/positions/:vehiculeId                → dernière position
 *   GET  /api/positions/:vehiculeId/historique     → historique sur période
 *   GET  /api/positions                            → toutes les dernières positions
 *   POST /api/positions                            → injection manuelle (tests / debug)
 *   POST /api/positions/simulateur/vehicules       → enregistrement manuel dans le simulateur GPS
 */
@Controller('api/positions')
export class PositionController {
  constructor(
    private readonly positionService: PositionService,
    private readonly gpsSimulatorService: GpsSimulatorService,
  ) {}

  /** Dernière position connue d'un véhicule */
  @Get(':vehiculeId')
  findLatest(@Param('vehiculeId') vehiculeId: string) {
    return this.positionService.findLatest(vehiculeId);
  }

  /**
   * Historique des positions sur une période.
   * @param debut  ISO 8601 (ex : 2026-04-12T00:00:00Z)
   * @param fin    ISO 8601
   */
  @Get(':vehiculeId/historique')
  findHistorique(
    @Param('vehiculeId') vehiculeId: string,
    @Query('debut') debut: string,
    @Query('fin') fin: string,
  ) {
    if (!debut || !fin) {
      throw new BadRequestException(
        'Les paramètres debut et fin (ISO 8601) sont obligatoires',
      );
    }

    const debutDate = new Date(debut);
    const finDate = new Date(fin);

    if (isNaN(debutDate.getTime()) || isNaN(finDate.getTime())) {
      throw new BadRequestException('Dates invalides — format attendu : ISO 8601');
    }

    if (debutDate >= finDate) {
      throw new BadRequestException('debut doit être antérieur à fin');
    }

    return this.positionService.findByRange(vehiculeId, debutDate, finDate);
  }

  /** Toutes les dernières positions (une par véhicule actif) */
  @Get()
  findAllLatest() {
    return this.positionService.findAllLatest();
  }

  /** Injection manuelle d'une position (debug / tests d'intégration) */
  @Post()
  savePosition(@Body() dto: CreatePositionDto) {
    return this.positionService.savePosition(dto);
  }

  /**
   * Enregistre manuellement un véhicule dans le simulateur GPS.
   * Une fois enregistré, le simulateur génère une nouvelle position toutes les 5 s.
   *
   * @example POST /api/positions/simulateur/vehicules  { "vehiculeId": "1" }
   */
  @Post('simulateur/vehicules')
  addVehiculeSimulateur(@Body('vehiculeId') vehiculeId: string) {
    if (!vehiculeId) {
      throw new BadRequestException('vehiculeId est obligatoire');
    }
    this.gpsSimulatorService.addVehicle(vehiculeId);
    return { message: `Véhicule ${vehiculeId} enregistré dans le simulateur GPS` };
  }
}
