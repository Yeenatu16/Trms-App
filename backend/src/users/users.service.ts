import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        facilityId: true,
        department: true,
        phone: true,
        sex: true,
        age: true,
        occupationDate: true,
        createdAt: true,
        facility: {
          select: { name: true },
        },
      },
    });
  }

  async create(data: any) {
    if (!data.email) throw new BadRequestException('Email is required');
    if (!data.password) throw new BadRequestException('Password is required');
    if (!data.role) throw new BadRequestException('Role is required');

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // Role-specific facility logic
    let facilityId = data.facilityId || null;
    if (facilityId === '') facilityId = null;

    if ((data.role === Role.LIAISON_OFFICER || data.role === Role.NURSE) && !facilityId) {
      throw new BadRequestException(`${data.role === Role.NURSE ? 'Nurses' : 'Liaison Officers'} must be assigned to a facility`);
    }

    // Validate facilityId if provided
    if (facilityId) {
      const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
      if (!facility) throw new BadRequestException('Invalid facility ID');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as Role,
        department: data.department || null,
        facilityId,
        phone: data.phone || null,
        sex: data.sex || 'UNKNOWN',
        age: data.age ? parseInt(String(data.age)) : null,
        occupationDate: data.occupationDate ? new Date(data.occupationDate) : null,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, facilityId: true },
    });
  }

  async update(id: string, data: any, adminId?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'role',
      'status',
      'facilityId',
      'department',
      'phone',
      'sex',
      'age',
      'occupationDate',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Handle status enum if passed incorrectly
    if (updateData.status === '') delete updateData.status;

    // Standardize empty strings to null for optional fields
    if (updateData.facilityId === '') updateData.facilityId = null;
    if (updateData.department === '') updateData.department = null;
    if (updateData.phone === '') updateData.phone = null;

    // Role-specific facility logic for updates
    const finalRole = updateData.role || user.role;
    if (finalRole === Role.NURSE || finalRole === Role.LIAISON_OFFICER) {
      if (Object.keys(data).includes('facilityId') && !updateData.facilityId) {
        throw new BadRequestException(`${finalRole === Role.NURSE ? 'Nurses' : 'Liaison Officers'} must be assigned to a facility`);
      }
    }

    if (updateData.occupationDate) {
      updateData.occupationDate = new Date(updateData.occupationDate);
    }

    if (updateData.age) {
      updateData.age = parseInt(String(updateData.age));
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, status: true, role: true, facilityId: true },
    });

    if (adminId) {
      await this.auditService.log({
        userId: adminId,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: id,
        details: `Updated user fields`,
        ipAddress,
      });
    }

    return updatedUser;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { facility: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateProfile(id: string, data: any) {
    const allowedFields = ['firstName', 'lastName', 'phone', 'sex', 'age', 'department'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (updateData.age) updateData.age = parseInt(String(updateData.age));

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updatePassword(id: string, data: any) {
    const { currentPassword, newPassword } = data;
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current and new passwords are required');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ForbiddenException('Current password is incorrect');
    }

    this.validatePasswordPolicy(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        lastPasswordChange: new Date()
      },
    });
  }

  async updatePhoto(id: string, filePath: string) {
    return this.prisma.user.update({
      where: { id },
      data: { profilePicture: filePath },
    });
  }

  async remove(id: string, adminId?: string, ipAddress?: string) {
    if (adminId && id === adminId) {
      throw new BadRequestException('Administrators cannot delete their own active account.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    await this.prisma.user.delete({ where: { id } });

    if (adminId) {
      await this.auditService.log({
        userId: adminId,
        action: 'DELETE_USER',
        resource: 'User',
        resourceId: id,
        details: `Permanently deleted user: ${user.email} (${user.role})`,
        ipAddress,
      });
    }

    return { success: true };
  }

  private validatePasswordPolicy(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }
  }
}
