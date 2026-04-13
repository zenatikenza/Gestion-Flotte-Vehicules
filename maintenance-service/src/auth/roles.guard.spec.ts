/**
 * Tests unitaires — RolesGuard
 *
 * Vérifie que les rôles extraits de realm_access.roles (Keycloak)
 * permettent ou interdisent l'accès aux endpoints protégés.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function buildContext(realmRoles?: string[]): ExecutionContext {
  const user = realmRoles !== undefined
    ? { realm_access: { roles: realmRoles } }
    : undefined;

  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector as any);
  });

  it('retourne true si aucun rôle n\'est requis (tableau vide)', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(buildContext(['admin']))).toBe(true);
  });

  it('retourne true si @Roles() n\'est pas déclaré (undefined)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(['technicien']))).toBe(true);
  });

  it('retourne true si l\'utilisateur possède le rôle admin', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'technicien']);
    expect(guard.canActivate(buildContext(['admin']))).toBe(true);
  });

  it('retourne true si l\'utilisateur possède le rôle technicien', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'technicien']);
    expect(guard.canActivate(buildContext(['technicien', 'utilisateur']))).toBe(true);
  });

  it('lève ForbiddenException si l\'utilisateur ne possède aucun rôle requis', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'technicien']);
    expect(() => guard.canActivate(buildContext(['manager']))).toThrow(
      ForbiddenException,
    );
  });

  it('lève ForbiddenException si l\'utilisateur n\'a aucun rôle', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(buildContext([]))).toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si request.user est undefined', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('lève ForbiddenException si realm_access est absent du token', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'u1' } }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
