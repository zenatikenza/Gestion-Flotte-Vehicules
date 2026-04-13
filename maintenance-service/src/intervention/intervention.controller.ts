import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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

@Controller('api/interventions')
export class InterventionController {
  constructor(private readonly interventionService: InterventionService) {}

  // ── Lecture — publique ────────────────────────────────────────────────────

  @Get()
  findAll(@Query('vehiculeImmat') vehiculeImmat?: string) {
    if (vehiculeImmat) {
      return this.interventionService.findByVehicule(vehiculeImmat);
    }
    return this.interventionService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.interventionService.findById(id);
  }

  // ── Création / mise à jour — rôle technicien ou admin requis ─────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'technicien')
  create(@Body() dto: CreateInterventionDto) {
    return this.interventionService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'technicien')
  update(@Param('id') id: string, @Body() dto: UpdateInterventionDto) {
    return this.interventionService.update(id, dto);
  }

  @Put(':id/terminer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'technicien')
  terminer(
    @Param('id') id: string,
    @Body('cout') cout?: number,
  ) {
    return this.interventionService.terminer(id, cout);
  }

  @Put(':id/annuler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'technicien')
  annuler(@Param('id') id: string) {
    return this.interventionService.annuler(id);
  }

  // ── Suppression — rôle admin uniquement ───────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.interventionService.delete(id);
  }
}
