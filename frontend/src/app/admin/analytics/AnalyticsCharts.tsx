"use client";
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface AnalyticsChartsProps {
  statusData: { status: string; count: number }[];
  facilityData: { facility: string; count: number }[];
  summary: any;
}

export default function AnalyticsCharts({ statusData, facilityData, summary }: AnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null; // Avoid hydration mismatch on heavy charts

  return (
    <>
      {/* Charts */}
      <div className="charts-grid-main">
        {/* Referrals by Status */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Referrals by Status</h3>
          <div className="chart-container">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="status" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="table-empty" style={{ height: 300 }}>No referral data yet.</div>
            )}
          </div>
        </div>

        {/* Referrals by Facility */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Referrals by Facility</h3>
          <div className="chart-container">
            {facilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={facilityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="facility" type="category" width={120} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="table-empty" style={{ height: 300 }}>No facility data yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      {summary?.referralsByPriority && (
        <div className="chart-wrapper">
          <h3 className="chart-title">Referral Priority Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280} debounce={100}>
              <PieChart>
                <Pie
                  data={Object.entries(summary.referralsByPriority).map(([priority, count]) => ({ priority, count }))}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="priority"
                >
                  {Object.entries(summary.referralsByPriority).map(([priority], index) => {
                    const fill = priority === 'EMERGENCY' ? '#ef4444' : priority === 'URGENT' ? '#f59e0b' : '#10b981';
                    return <Cell key={index} fill={fill} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
