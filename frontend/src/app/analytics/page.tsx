"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import './page.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

interface ComprehensiveData {
  volumeByFacility: { facility: string; count: number }[];
  volumeByDepartment: { department: string; count: number }[];
  routingRates: { status: string; count: number }[];
  priorityVolume: { priority: string; count: number }[];
  demographics: {
    bySex: { sex: string; count: number }[];
    byAge: { ageBracket: string; count: number }[];
  };
  metrics: {
    avgTurnaroundHours: number;
    offlineSyncDelay: string;
    noShowRate: string;
  };
}

interface BarItemProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

function BarItem({ label, value, max, color }: BarItemProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-item">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div 
          className="bar-fill" 
          style={{ width: `${pct}%`, background: color ? color : undefined }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/api/analytics/comprehensive`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/api/analytics/summary`).then(r => r.ok ? r.json() : null)
    ])
      .then(([comp, summ]) => {
        if (comp) setData(comp);
        if (summ) setSummaryData(summ);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="analytics-container"><p>Loading comprehensive analytics…</p></div>;
  if (!data || !summaryData) return <div className="analytics-container"><p>Failed to load analytics data.</p></div>;

  const maxFacility = Math.max(...data.volumeByFacility.map(d => d.count), 1);
  const maxDept = Math.max(...data.volumeByDepartment.map(d => d.count), 1);
  const maxStatus = Math.max(...data.routingRates.map(s => s.count), 1);
  const maxPriority = Math.max(...data.priorityVolume.map(p => p.count), 1);
  const maxSex = Math.max(...data.demographics.bySex.map(p => p.count), 1);
  const maxAge = Math.max(...data.demographics.byAge.map(p => p.count), 1);

  return (
    <div className="analytics-container">
      <h1 className="page-title gradient-text">Analytics Dashboard</h1>
      <p className="page-subtitle">Comprehensive operational visibility and demographic metrics</p>

      {/* KPI tiles */}
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="kpi-tile-value">{summaryData.total}</div>
          <div className="kpi-tile-label">Total Referrals</div>
        </div>
        <div className="kpi-tile highlight-success">
          <div className="kpi-tile-value">{summaryData.accepted}</div>
          <div className="kpi-tile-label">Accepted Volume</div>
        </div>
        <div className="kpi-tile highlight-danger">
          <div className="kpi-tile-value">{summaryData.rejectionRate}</div>
          <div className="kpi-tile-label">Rejection Rate</div>
        </div>
        <div className="kpi-tile highlight-warning">
          <div className="kpi-tile-value">{data.metrics.avgTurnaroundHours}h</div>
          <div className="kpi-tile-label">Avg Turnaround Time</div>
        </div>
        <div className="kpi-tile highlight-info">
          <div className="kpi-tile-value">{data.metrics.offlineSyncDelay}</div>
          <div className="kpi-tile-label">Avg Offline Sync Delay</div>
        </div>
        <div className="kpi-tile highlight-neutral">
          <div className="kpi-tile-value">{data.metrics.noShowRate}</div>
          <div className="kpi-tile-label">Patient No-Show Rate</div>
        </div>
      </div>

      <div className="charts-grid charts-three-col">
        {/* Routing Rates / Status */}
        <div className="chart-card">
          <h2 className="chart-title">Status/Routing Rates</h2>
          <div className="bar-chart">
            {data.routingRates.map(s => {
               let color = 'linear-gradient(90deg, var(--primary), var(--secondary))';
               if(s.status === 'ACCEPTED' || s.status === 'COMPLETED') color = 'linear-gradient(90deg, #10b981, #059669)';
               if(s.status === 'REJECTED') color = 'linear-gradient(90deg, #ef4444, #dc2626)';
               return <BarItem key={s.status} label={s.status} value={s.count} max={maxStatus} color={color} />
            })}
          </div>
        </div>

        {/* Priority Volume */}
        <div className="chart-card">
          <h2 className="chart-title">Emergency vs Routine</h2>
          <div className="bar-chart">
            {data.priorityVolume.map(p => {
               let color = undefined;
               if(p.priority === 'EMERGENCY') color = 'linear-gradient(90deg, #ef4444, #dc2626)';
               if(p.priority === 'URGENT') color = 'linear-gradient(90deg, #f59e0b, #d97706)';
               if(p.priority === 'ROUTINE') color = 'linear-gradient(90deg, #10b981, #059669)';
               return <BarItem key={p.priority} label={p.priority} value={p.count} max={maxPriority} color={color} />;
            })}
          </div>
        </div>
        
        {/* Destinations */}
        <div className="chart-card">
          <h2 className="chart-title">Top Receivers (Facilities)</h2>
          <div className="bar-chart">
            {data.volumeByFacility.slice(0, 5).map((f, i) => (
              <BarItem key={i} label={f.facility} value={f.count} max={maxFacility} />
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Department / Reasons */}
        <div className="chart-card">
          <h2 className="chart-title">Volume by Department / Reason</h2>
          <div className="bar-chart">
            {data.volumeByDepartment.map(d => (
              <BarItem key={d.department} label={d.department} value={d.count} max={maxDept} color={'linear-gradient(90deg, #6366f1, #4f46e5)'} />
            ))}
          </div>
        </div>

        {/* Demographics */}
        <div className="chart-card">
          <h2 className="chart-title">Patient Demographics</h2>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div className="bar-chart" style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>By Gender</h3>
              {data.demographics.bySex.map(sg => (
                <BarItem key={sg.sex} label={sg.sex} value={sg.count} max={maxSex} color={'linear-gradient(90deg, #8b5cf6, #7c3aed)'} />
              ))}
            </div>
            <div className="bar-chart" style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>By Age Bracket</h3>
              {data.demographics.byAge.map(ag => (
                <BarItem key={ag.ageBracket} label={ag.ageBracket} value={ag.count} max={maxAge} color={'linear-gradient(90deg, #0ea5e9, #0284c7)'} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
