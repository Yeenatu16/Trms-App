import { AuthModule } from '../auth/auth.module';
import { Module } from "@nestjs/common";
import { DirectoryController } from "./directory.controller";
import { DirectoryService } from "./directory.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [DirectoryController],
  providers: [DirectoryService, PrismaService],
})
export class DirectoryModule {}
