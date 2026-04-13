import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

/**
 * Vérifie que l'utilisateur authentifié possède au moins un des rôles requis.
 * Les rôles Keycloak sont extraits de realm_access.roles dans le token JWT
 * décodé préalablement par JwtAuthGuard et attaché à request.user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de @Roles() déclaré → route publique après JwtAuthGuard
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const realmRoles: string[] = user?.realm_access?.roles ?? [];

    const hasRole = requiredRoles.some((role) => realmRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Droits insuffisants. Rôles requis : ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
