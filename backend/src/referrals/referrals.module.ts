import { AuthModule } from '../auth/auth.module';
import { Module } from "@nestjs/common";
import { ReferralsController } from "./referrals.controller";
import { ReferralsService } from "./referrals.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [AuthModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
})
export class ReferralsModule {}
