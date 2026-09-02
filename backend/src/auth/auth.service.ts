import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async validateUserById(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id || user.userId,
      role: user.role,
      facilityId: user.facilityId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async signup(name: string, email: string, pass: string, role: Role) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
      },
    });

    const { passwordHash: _, ...result } = newUser;
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FR-AUTH-04: Audit helpers — kept in AuthService to avoid circular deps
  // ────────────────────────────────────────────────────────────────────────────

  async auditLoginSuccess(userId: string, email: string, ipAddress?: string) {
    await this.prisma.auditEvent.create({
      data: {
        userId,
        action: 'LOGIN_SUCCESS',
        resource: 'Auth',
        resourceId: userId,
        details: `User ${email} signed in successfully.`,
        ipAddress: ipAddress ?? null,
      },
    });
  }

  async auditLoginFailure(email: string, ipAddress?: string) {
    await this.prisma.auditEvent.create({
      data: {
        userId: null,
        action: 'LOGIN_FAILURE',
        resource: 'Auth',
        resourceId: null,
        details: `Failed login attempt for email: ${email}`,
        ipAddress: ipAddress ?? null,
      },
    });
  }

  async auditLogout(userId: string, email: string, ipAddress?: string) {
    await this.prisma.auditEvent.create({
      data: {
        userId,
        action: 'LOGOUT',
        resource: 'Auth',
        resourceId: userId,
        details: `User ${email} signed out.`,
        ipAddress: ipAddress ?? null,
      },
    });
  }

  async auditSignup(userId: string, email: string, ipAddress?: string) {
    await this.prisma.auditEvent.create({
      data: {
        userId,
        action: 'ADMIN_SELF_REGISTRATION',
        resource: 'Auth',
        resourceId: userId,
        details: `New administrator account registered: ${email}`,
        ipAddress: ipAddress ?? null,
      },
    });
  }
}
