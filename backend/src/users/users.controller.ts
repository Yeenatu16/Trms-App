import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))

export class UsersController {
  constructor(private readonly usersService: UsersService) { }
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req: any, @Body() data: any) {
    return this.usersService.updateProfile(req.user.userId, data);
  }

  @Patch('profile/password')
  updatePassword(@Request() req: any, @Body() data: any) {
    return this.usersService.updatePassword(req.user.userId, data);
  }

  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './storage/profiles',
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadPhoto(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    const filePath = `/uploads/profiles/${file.filename}`;
    await this.usersService.updatePhoto(req.user.userId, filePath);
    return { url: filePath };
  }

  @Get()
  @Roles(Role.ADMINISTRATOR)
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles(Role.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() updateUserDto: any, @Request() req: any) {
    return this.usersService.update(id, updateUserDto, req.user.userId, req.ip);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATOR)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.userId, req.ip);
  }
}
