import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Get,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      // FR-AUTH-04: Audit failed login attempt
      await this.authService.auditLoginFailure(body.email, req.ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    const { access_token, user: userData } = await this.authService.login(user);

    // FR-AUTH-04: Audit successful login
    await this.authService.auditLoginSuccess(user.id, user.email, req.ip);

    res.cookie('Authentication', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Logged in successfully', user: userData, token: access_token };
  }

  /**
   * Public self-registration — ADMINISTRATOR role ONLY.
   * All other user accounts (Nurse, Liaison Officer) must be
   * created by an authenticated Administrator via POST /api/users.
   */
  @Post('signup')
  async signup(
    @Body() body: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { name, email, password, role, authCode } = body;

    if (!name || !email || !password || !authCode) {
      throw new BadRequestException('Name, email, password, and authorization code are required.');
    }

    if (!email.toLowerCase().endsWith('@trms.gov.et')) {
      throw new BadRequestException('Security Policy: Administrator accounts must use an official @trms.gov.et address.');
    }

    const expectedCode = process.env.NODE_ENV === 'production'
      ? process.env.ADMIN_ACCESS_CODE
      : (process.env.ADMIN_ACCESS_CODE || 'TRMS-ADMIN-2026');

    if (!expectedCode || authCode !== expectedCode) {
      throw new BadRequestException('Invalid authorization code.');
    }

    // Enforce: only ADMINISTRATOR may self-register via this public endpoint.
    if (role !== Role.ADMINISTRATOR) {
      throw new ForbiddenException(
        'Public registration is restricted to Administrator accounts. ' +
        'Other user accounts must be created by an Administrator from the Users panel.',
      );
    }

    const user = await this.authService.signup(name, email, password, Role.ADMINISTRATOR);

    // FR-AUTH-04: Audit admin self-registration
    await this.authService.auditSignup(user.id, email, req.ip);

    // Auto-login the new admin immediately
    const { access_token, user: userData } = await this.authService.login(user);

    res.cookie('Authentication', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Administrator account created successfully', user: userData, token: access_token };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('session')
  async getSession(@Req() req: any) {
    if (!req.user) return null;
    
    // Fetch full user details from database to include fields like profilePicture
    const fullUser = await this.authService.validateUserById(req.user.userId);
    if (!fullUser) return null;

    const { access_token } = await this.authService.login(fullUser);
    return { user: fullUser, token: access_token };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: any) {
    // FR-AUTH-04: Audit logout event
    if (req.user?.userId) {
      await this.authService.auditLogout(req.user.userId, req.user.email, req.ip);
    }
    res.clearCookie('Authentication');
    return { message: 'Logged out successfully' };
  }
}
