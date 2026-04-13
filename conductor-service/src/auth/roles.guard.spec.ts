/**
 * Tests unitaires — RolesGuard
 *
 * Vérifie que les rôles extraits de realm_access.roles (Keycloak)
 * permettent ou interdisent l'accès aux endpoints protégés.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

// ── Helper ────────────────────────────────────────────────────────────────────

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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector as any);
  });

  // ── Pas de restriction ────────────────────────────────────────────────────

  it('retourne true si aucun rôle n\'est requis (tableau vide)', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(buildContext(['admin']))).toBe(true);
  });

  it('retourne true si @Roles() n\'est pas déclaré (undefined)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(['manager']))).toBe(true);
  });

  // ── Accès autorisé ────────────────────────────────────────────────────────

  it('retourne true si l\'utilisateur possède le rôle admin', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    expect(guard.canActivate(buildContext(['admin']))).toBe(true);
  });

  it('retourne true si l\'utilisateur possède le rôle manager', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    expect(guard.canActivate(buildContext(['manager', 'utilisateur']))).toBe(true);
  });

  // ── Accès refusé ──────────────────────────────────────────────────────────

  it('lève ForbiddenException si l\'utilisateur ne possède aucun rôle requis', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    expect(() => guard.canActivate(buildContext(['technicien']))).toThrow(
      ForbiddenException,
    );
  });

  it('lève ForbiddenException si l\'utilisateur n\'a aucun rôle', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(buildContext([]))).toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si request.user est undefined (token non décodé)', () => {
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
