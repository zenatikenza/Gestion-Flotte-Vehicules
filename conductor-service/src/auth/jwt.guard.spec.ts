/**
 * Tests unitaires — JwtAuthGuard
 *
 * jwks-rsa et jsonwebtoken sont mockés intégralement pour éviter
 * tout appel réseau vers Keycloak en environnement de test.
 */

// Les variables préfixées « mock » sont hoistées par Jest au même titre
// que jest.mock() lui-même — elles sont donc accessibles dans les factories.
const mockGetSigningKey = jest.fn();
const mockVerify = jest.fn();

jest.mock('jwks-rsa', () => () => ({ getSigningKey: mockGetSigningKey }));
jest.mock('jsonwebtoken', () => ({ verify: mockVerify }));

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

// ── Helper ────────────────────────────────────────────────────────────────────

function buildContext(authHeader?: string): ExecutionContext {
  const req: any = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    jest.clearAllMocks();
  });

  // ── Header manquant ───────────────────────────────────────────────────────

  it('lève UnauthorizedException si le header Authorization est absent', async () => {
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lève UnauthorizedException si le header ne commence pas par "Bearer "', async () => {
    await expect(
      guard.canActivate(buildContext('Basic dXNlcjpwYXNz')),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── Token valide ──────────────────────────────────────────────────────────

  it('résout true et attache le user décodé quand le token est valide', async () => {
    const decoded = { sub: 'user-1', realm_access: { roles: ['admin'] } };
    const mockKey = { getPublicKey: () => 'public-key' };

    // jwks-rsa retourne la clé publique (couvre la branche success de getSigningKey)
    mockGetSigningKey.mockImplementation((_kid: string, cb: Function) => {
      cb(null, mockKey);
    });

    // jwt.verify appelle getKey puis invoque le callback final avec le token décodé
    mockVerify.mockImplementation(
      (_token: string, getKey: Function, _opts: any, finalCb: Function) => {
        getKey({ kid: 'test-kid' }, (_err: any, _key: any) => {
          finalCb(null, decoded);
        });
      },
    );

    const ctx = buildContext('Bearer valid.jwt.token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).user).toEqual(decoded);
  });

  // ── Erreur JWKS ───────────────────────────────────────────────────────────

  it('lève UnauthorizedException si la récupération de la clé JWKS échoue', async () => {
    // jwks-rsa renvoie une erreur (couvre la branche "if (err)" de getSigningKey)
    mockGetSigningKey.mockImplementation((_kid: string, cb: Function) => {
      cb(new Error('JWKS fetch failed'));
    });

    mockVerify.mockImplementation(
      (_token: string, getKey: Function, _opts: any, finalCb: Function) => {
        getKey({ kid: 'test-kid' }, (err: any, _key: any) => {
          // L'erreur JWKS est propagée comme erreur de vérification
          finalCb(err, null);
        });
      },
    );

    await expect(
      guard.canActivate(buildContext('Bearer some.token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── Signature invalide ────────────────────────────────────────────────────

  it('lève UnauthorizedException si jwt.verify signale un token invalide', async () => {
    const mockKey = { getPublicKey: () => 'public-key' };

    mockGetSigningKey.mockImplementation((_kid: string, cb: Function) => {
      cb(null, mockKey);
    });

    mockVerify.mockImplementation(
      (_token: string, getKey: Function, _opts: any, finalCb: Function) => {
        getKey({ kid: 'test-kid' }, (_err: any, _key: any) => {
          finalCb(new Error('invalid signature'), null);
        });
      },
    );

    await expect(
      guard.canActivate(buildContext('Bearer tampered.token')),
    ).rejects.toThrow(UnauthorizedException);
  });
});
