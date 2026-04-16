import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConducteurService } from './conducteur.service';
import { CreateConducteurDto } from './dto/create-conducteur.dto';
import { UpdateConducteurDto } from './dto/update-conducteur.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/conducteurs')
export class ConducteurController {
  constructor(private readonly conducteurService: ConducteurService) {}

  // ── Lecture — publique (pas d'authentification requise) ───────────────────

  @Get()
  findAll() {
    return this.conducteurService.findAll();
  }

  @Get('me/assignations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('utilisateur', 'admin', 'manager')
  getMesAssignations(@Req() req: Request & { user?: Record<string, unknown> }) {
    const keycloakUserId = req.user?.sub as string;
    return this.conducteurService.findMesAssignations(keycloakUserId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.conducteurService.findById(id);
  }

  // ── Écriture — rôle manager ou admin requis ───────────────────────────────

  @Post()
  //@UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles('admin', 'manager')
  create(@Body() dto: CreateConducteurDto) {
    return this.conducteurService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateConducteurDto) {
    return this.conducteurService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  delete(@Param('id') id: string) {
    return this.conducteurService.delete(id);
  }

  // ── Assignation — rôle manager ou admin requis ────────────────────────────

  @Post(':id/assigner/:vehiculeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  assigner(
    @Param('id') conducteurId: string,
    @Param('vehiculeId') vehiculeId: string,
  ) {
    return this.conducteurService.assigner(conducteurId, vehiculeId);
  }

  @Delete(':id/assigner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  desassigner(@Param('id') conducteurId: string) {
    return this.conducteurService.desassigner(conducteurId);
  }
}
