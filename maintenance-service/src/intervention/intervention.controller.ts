import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InterventionService } from './intervention.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TypeIntervention } from './enums/type-intervention.enum';
import { StatutIntervention } from './enums/statut-intervention.enum';

@Controller('api/interventions')
export class InterventionController {
  constructor(private readonly interventionService: InterventionService) {}

  // ── Lecture ───────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @Query('vehiculeImmat') vehiculeImmat?: string,
    @Query('statut') statut?: string,
    @Query('technicienId') technicienId?: string,
  ) {
    if (vehiculeImmat) {
      return this.interventionService.findByVehicule(vehiculeImmat);
    }
    return this.interventionService.findAll({
      statut: statut as StatutIntervention | undefined,
      technicienId,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.interventionService.findById(id);
  }

  // ── Création — admin ou manager ───────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() dto: CreateInterventionDto) {
    return this.interventionService.create(dto);
  }

  // ── Signalement conducteur — tous les rôles authentifiés ─────────────────

  @Post('signalement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'technicien', 'utilisateur')
  signaler(
    @Body()
    body: {
      vehiculeImmat: string;
      description: string;
      type?: TypeIntervention;
    },
  ) {
    const dto: CreateInterventionDto = {
      vehiculeImmat: body.vehiculeImmat,
      type: body.type ?? TypeIntervention.CORRECTIVE,
      datePlanifiee: new Date().toISOString(),
      description: body.description,
      statut: StatutIntervention.SIGNALEE,
    };
    return this.interventionService.create(dto);
  }

  // ── Mise à jour — admin, manager (planification), technicien (exécution) ──

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'technicien')
  update(@Param('id') id: string, @Body() dto: UpdateInterventionDto) {
    return this.interventionService.update(id, dto);
  }

  @Put(':id/demarrer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'technicien')
  demarrer(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { nom, prenom } = this.extractNameFromToken(authHeader);
    return this.interventionService.demarrer(id, nom, prenom);
  }

  @Put(':id/terminer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'technicien')
  terminer(
    @Param('id') id: string,
    @Body() body: { cout?: number },
    @Headers('authorization') authHeader: string,
  ) {
    const { nom, prenom } = this.extractNameFromToken(authHeader);
    return this.interventionService.terminer(id, body.cout, nom, prenom);
  }

  private extractNameFromToken(authHeader: string): { nom: string; prenom: string } {
    try {
      const token = authHeader?.replace('Bearer ', '') ?? '';
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
      const nom = payload.family_name || payload.preferred_username || payload.sub || '';
      const prenom = payload.given_name || '';
      return { nom, prenom };
    } catch {
      return { nom: '', prenom: '' };
    }
  }

  @Put(':id/annuler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager', 'technicien')
  annuler(@Param('id') id: string) {
    return this.interventionService.annuler(id);
  }

  // ── Suppression — admin uniquement ────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.interventionService.delete(id);
  }
}
