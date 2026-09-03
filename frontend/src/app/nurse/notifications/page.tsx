"use client";
import { getApiUrl } from '@/lib/config';
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Bell, CheckCircle, XCircle, Clock, ArrowRightCircle } from 'lucide-react';
import './notifications.css';

const API_URL = getApiUrl();

export default function NurseNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/referrals/my`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // We consider referrals that have been acted upon as notifications
        // specifically targeting ACCEPTED, REJECTED, COMPLETED, and REDIRECTED
        const alerts = data
          .filter((r: any) => ['ACCEPTED', 'REJECTED', 'COMPLETED', 'REDIRECTED'].includes(r.status))
          .map((r: any) => ({
            id: r.id.substring(0, 8),
            patientName: `${r.patient.firstName} ${r.patient.lastName}`,
            status: r.status,
            hospital: r.destFacility?.name || 'Destination',
            time: new Date(r.updatedAt).toLocaleString(),
            note: r.tasks && r.tasks.length > 0 ? r.tasks[0].notes : null,
            isRead: false // Mock read state for UI
          }))
          .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

        setNotifications(alerts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle size={24} className="icon-accepted" />;
      case 'COMPLETED': return <CheckCircle size={24} className="icon-completed" />;
      case 'REJECTED': return <XCircle size={24} className="icon-rejected" />;
      case 'REDIRECTED': return <ArrowRightCircle size={24} className="icon-redirected" />;
      default: return <Bell size={24} className="icon-neutral" />;
    }
  };

  const getTitle = (status: string, hospital: string) => {
    switch (status) {
      case 'ACCEPTED': return `Referral Accepted by ${hospital}`;
      case 'COMPLETED': return `Discharge Summary from ${hospital}`;
      case 'REJECTED': return `Referral Rejected by ${hospital}`;
      case 'REDIRECTED': return `Referral Redirected by ${hospital}`;
      default: return `Update from ${hospital}`;
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications Inbox</h1>
        <p>Feedback and outcome updates for your patient referrals</p>
      </div>

      {loading ? (
        <div className="notifications-loading">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <Bell size={48} className="empty-icon" />
          <h2>No new notifications</h2>
          <p>You will receive updates here when Liaisons respond to your referrals.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n, i) => (
            <div key={`${n.id}-${i}`} className={`notification-card ${n.isRead ? 'read' : 'unread'}`}>
              <div className="notification-icon">
                {getIcon(n.status)}
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {getTitle(n.status, n.hospital)}
                </div>
                <div className="notification-patient">
                  Patient: <strong>{n.patientName}</strong> (Ref #{n.id})
                </div>
                {n.note && (
                  <div className="notification-note">
                    <span className="note-label">Clinical Note:</span> {n.note}
                  </div>
                )}
                <div className="notification-time">
                  <Clock size={12} /> {n.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
