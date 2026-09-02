import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let token = null;
          // Prefer Authorization header (explicit Bearer token from the frontend)
          if (request?.headers?.authorization) {
            token = request.headers.authorization.split(' ')[1];
          }
          // Fall back to HttpOnly cookie if no header token
          if (!token && request?.cookies?.['Authentication']) {
            token = request.cookies['Authentication'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'trms-super-secret-jwt-key-change-in-production',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      facilityId: payload.facilityId,
    };
  }
}
