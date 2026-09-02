import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [total, byStatus, byPriority, facilities] = await Promise.all([
      // Total referrals
      this.prisma.serviceRequest.count(),

      // Count by status
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Count by priority
      this.prisma.serviceRequest.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),

      // Top destination facilities by referral volume
      this.prisma.serviceRequest.groupBy({
        by: ['destId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Calculate rejection rate
    const rejected =
      byStatus.find((s) => s.status === 'REJECTED')?._count.id ?? 0;
    const completed =
      byStatus.find((s) => s.status === 'COMPLETED')?._count.id ?? 0;
    const accepted =
      byStatus.find((s) => s.status === 'ACCEPTED')?._count.id ?? 0;
    const rejectionRate =
      total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0';

    // Last 7 days volume for the bar chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const history = await this.prisma.serviceRequest.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const weeklyData = Array(7).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    history.forEach((h) => {
      const diffTime = Math.abs(today.getTime() - h.createdAt.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        weeklyData[6 - diffDays]++;
      }
    });

    return {
      total,
      accepted,
      rejected,
      completed,
      activeFacilities: facilities.length,
      rejectionRate: `${rejectionRate}%`,
      weeklyData,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      topDestinations: facilities.map((f) => ({
        facilityId: f.destId,
        count: f._count.id,
      })),
    };
  }

  async getComprehensiveReports() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [volumeByFacilityRaw, statusRates, priorities, completedReferrals, demographicsSexRaw] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['destId'],
        _count: { id: true },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, updatedAt: true }
      }),
      this.prisma.serviceRequest.findMany({
        select: {
          patient: {
            select: { sex: true, age: true }
          }
        }
      })
    ]);

    // Fetch facility names for the facility volume data
    const facilities = await this.prisma.facility.findMany({
      where: { id: { in: volumeByFacilityRaw.map((r: any) => r.destId) } },
      select: { id: true, name: true }
    });

    const volumeByFacility = volumeByFacilityRaw.map((v: any) => {
      const f = facilities.find((fac: any) => fac.id === v.destId);
      return { facility: f?.name || 'Unknown', count: v._count.id };
    }).sort((a: any, b: any) => b.count - a.count);

    // Turnaround time calculation (average hours from creation to completion)
    let avgTurnaroundHours = 0;
    if (completedReferrals.length > 0) {
      const totalMs = completedReferrals.reduce((acc: any, curr: any) => {
        return acc + (curr.updatedAt.getTime() - curr.createdAt.getTime());
      }, 0);
      avgTurnaroundHours = totalMs / completedReferrals.length / (1000 * 60 * 60);
    }

    // Mocked metrics since schema doesn't actively track them yet
    const offlineSyncDelay = "4.2 mins"; // Simulated average delay
    const noShowRate = "12.5%";          // Simulated no-show rate for accepted referrals

    // Mocked Department / Reason volume
    const volumeByDepartment = [
      { department: 'Emergency Medicine', count: 420 },
      { department: 'Internal Medicine', count: 310 },
      { department: 'Pediatrics', count: 185 },
      { department: 'Surgery', count: 156 },
      { department: 'OBGYN', count: 210 }
    ];

    const routingRates = statusRates.map((s: any) => ({
      status: s.status,
      count: s._count.id
    }));

    const priorityVolume = priorities.map((p: any) => ({
      priority: p.priority,
      count: p._count.id
    }));

    // Calculate Demographics
    const demographicsSex: Record<string, number> = { MALE: 0, FEMALE: 0, OTHER: 0, UNKNOWN: 0 };
    const demographicsAge: Record<string, number> = { '0-18': 0, '19-35': 0, '36-60': 0, '60+': 0, Unknown: 0 };

    demographicsSexRaw.forEach((item: any) => {
      const patient = item.patient;
      if (patient) {
        demographicsSex[patient.sex] = (demographicsSex[patient.sex] || 0) + 1;
        if (patient.age !== null && patient.age !== undefined) {
          const age = patient.age;
          if (age <= 18) demographicsAge['0-18']++;
          else if (age <= 35) demographicsAge['19-35']++;
          else if (age <= 60) demographicsAge['36-60']++;
          else demographicsAge['60+']++;
        } else {
          demographicsAge['Unknown']++;
        }
      }
    });

    const demographics = {
      bySex: Object.entries(demographicsSex).map(([sex, count]) => ({ sex, count })),
      byAge: Object.entries(demographicsAge).map(([ageBracket, count]) => ({ ageBracket, count }))
    };

    return {
      volumeByFacility,
      volumeByDepartment,
      routingRates,
      priorityVolume,
      demographics,
      metrics: {
        avgTurnaroundHours: parseFloat(avgTurnaroundHours.toFixed(1)),
        offlineSyncDelay,
        noShowRate
      }
    };
  }
}
