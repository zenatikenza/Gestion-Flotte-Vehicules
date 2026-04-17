import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import axios from 'axios';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'FleetManagement';
const KC_ADMIN_USERNAME = process.env.KC_ADMIN_USERNAME || 'admin';
const KC_ADMIN_PASSWORD = process.env.KC_ADMIN_PASSWORD || 'admin';

/**
 * Client d'administration Keycloak.
 * Toutes les opérations de gestion des utilisateurs transitent par ce client.
 * Le token admin est mis en cache 30 secondes pour limiter les appels à Keycloak.
 */
@Injectable()
export class KeycloakAdminClient {
  private readonly logger = new Logger(KeycloakAdminClient.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  // ── Token admin (cache 30 s) ───────────────────────────────────────────────

  private async getAdminToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: KC_ADMIN_USERNAME,
      password: KC_ADMIN_PASSWORD,
    });

    const { data } = await axios.post(
      `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.cachedToken = data.access_token as string;
    // Cache 30 s (expire_in - buffer)
    this.tokenExpiresAt = now + 30_000;
    return this.cachedToken;
  }

  private async adminHeaders() {
    const token = await this.getAdminToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // ── Vérification du rôle admin sur le token appelant ─────────────────────

  private assertRoles(ctx: any, allowedRoles: string[]): void {
    const authHeader: string = ctx?.req?.headers?.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) throw new ForbiddenException('Token manquant');

    try {
      const parts = token.split('.');
      if (parts.length < 2) throw new Error('Token malformé');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      const roles: string[] = payload?.realm_access?.roles ?? [];
      const hasRole = allowedRoles.some((r) => roles.includes(r));
      if (!hasRole) {
        throw new ForbiddenException(`Accès réservé aux rôles : ${allowedRoles.join(', ')}`);
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Token invalide');
    }
  }

  assertAdmin(ctx: any): void {
    this.assertRoles(ctx, ['admin']);
  }

  assertAdminOrManager(ctx: any): void {
    this.assertRoles(ctx, ['admin', 'manager']);
  }

  // ── CRUD utilisateurs Keycloak ────────────────────────────────────────────

  async listUsers(): Promise<any[]> {
    try {
      const headers = await this.adminHeaders();
      const { data } = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?max=200`,
        headers,
      );

      // Enrichir avec les rôles realm de chaque utilisateur
      const users = await Promise.all(
        (data as any[]).map(async (u: any) => {
          try {
            const rolesHeaders = await this.adminHeaders();
            const { data: roles } = await axios.get(
              `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${u.id}/role-mappings/realm`,
              rolesHeaders,
            );
            return { ...u, realmRoles: (roles as any[]).map((r: any) => r.name) };
          } catch {
            return { ...u, realmRoles: [] };
          }
        }),
      );

      return users;
    } catch (err) {
      this.logger.error(`listUsers échoué : ${(err as any).message}`);
      return [];
    }
  }

  async createUser(input: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password: string;
    roles: string[];
  }): Promise<any> {
    const headers = await this.adminHeaders();

    // 1. Créer l'utilisateur
    const createRes = await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
      {
        username: input.username,
        email: input.email,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        enabled: true,
        credentials: [{ type: 'password', value: input.password, temporary: false }],
      },
      headers,
    );

    // Récupérer l'ID depuis le header Location
    const location: string = createRes.headers['location'] ?? '';
    const userId = location.split('/').pop();
    if (!userId) throw new Error('Impossible de récupérer l\'ID du nouvel utilisateur');

    // 2. Assigner les rôles realm
    if (input.roles.length > 0) {
      await this.assignRoles(userId, input.roles);
    }

    return this.getUserById(userId);
  }

  async toggleUser(userId: string, enabled: boolean): Promise<any> {
    const headers = await this.adminHeaders();
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`,
      { enabled },
      headers,
    );
    return this.getUserById(userId);
  }

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    const headers = await this.adminHeaders();
    await axios.put(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/reset-password`,
      { type: 'password', value: newPassword, temporary: false },
      headers,
    );
    return true;
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  private async getUserById(userId: string): Promise<any> {
    const headers = await this.adminHeaders();
    const { data } = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`,
      headers,
    );
    return data;
  }

  private async assignRoles(userId: string, roleNames: string[]): Promise<void> {
    const headers = await this.adminHeaders();

    // Récupérer les rôles realm disponibles pour obtenir leurs IDs
    const { data: availableRoles } = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles`,
      headers,
    );

    const rolesToAssign = (availableRoles as any[]).filter((r: any) =>
      roleNames.includes(r.name),
    );

    if (rolesToAssign.length === 0) return;

    const assignHeaders = await this.adminHeaders();
    await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
      rolesToAssign,
      assignHeaders,
    );
  }
}
