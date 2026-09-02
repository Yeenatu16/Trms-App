import { AuthModule } from '../auth/auth.module';
import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaService } from "../prisma/prisma.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuthModule,AuditModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
