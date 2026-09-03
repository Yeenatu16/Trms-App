import { getApiUrl } from '@/lib/config';
import { fetchWithAuth } from '@/lib/api';
import { Users, Building2, FileText, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cookies } from 'next/headers';

const AnalyticsCharts = dynamic(() => import('./AnalyticsCharts'), {
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading charts...</div>
});

const API_URL = getApiUrl();

async function getAnalyticsSummary(token?: string) {
  try {
    const res = await fetchWithAuth(`${API_URL}/api/analytics/summary`, { next: { revalidate: 0 } }, token);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('trms_token')?.value;
  const summary = await getAnalyticsSummary(token);

  const kpis = [
    { label: 'Total Users',      value: summary?.totalUsers      ?? 0, icon: Users,     color: 'blue',  trend: '+12%', up: true },
    { label: 'Total Facilities', value: summary?.totalFacilities ?? 0, icon: Building2, color: 'teal',  trend: '+2',   up: true },
    { label: 'Total Referrals',  value: summary?.totalReferrals  ?? 0, icon: FileText,  color: 'amber', trend: '+18%', up: true },
    { label: 'Active Services',  value: summary?.totalServices   ?? 0, icon: Activity,  color: 'green', trend: 'Stable', up: true },
  ];

  const statusData = summary?.referralsByStatus
    ? Object.entries(summary.referralsByStatus).map(([status, count]) => ({ status, count: count as number }))
    : [];

  const facilityData = summary?.referralsByFacility
    ? summary.referralsByFacility.slice(0, 8)
    : [];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Overview</h1>
          <p className="page-subtitle">Real-time network performance and referral metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card card-hover">
            <div className="kpi-header">
              <div className={`kpi-icon ${kpi.color}`}><kpi.icon size={20} /></div>
              <div className={`kpi-delta ${kpi.up ? 'up' : 'down'}`}>
                {kpi.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpi.trend}
              </div>
            </div>
            <div className="kpi-value">{kpi.value.toLocaleString()}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <AnalyticsCharts 
        statusData={statusData} 
        facilityData={facilityData} 
        summary={summary} 
      />
    </div>
  );
}
