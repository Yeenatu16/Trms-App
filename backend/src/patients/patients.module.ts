import { AuthModule } from '../auth/auth.module';
import { Module } from "@nestjs/common";
import { PatientsController } from "./patients.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [PatientsController],
  providers: [PrismaService],
})
export class PatientsModule {}
