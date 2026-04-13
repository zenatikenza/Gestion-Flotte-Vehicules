import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksRsa = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'GestionFlotteM1';

const jwksClient = jwksRsa({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(
  header: jwt.JwtHeader,
  callback: jwt.SigningKeyCallback,
): void {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token JWT manquant ou invalide');
    }

    const token = authHeader.slice(7);

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        { algorithms: ['RS256'] },
        (err, decoded) => {
          if (err) {
            return reject(new UnauthorizedException('Token JWT invalide ou expiré'));
          }
          (request as any).user = decoded;
          resolve(true);
        },
      );
    });
  }
}
