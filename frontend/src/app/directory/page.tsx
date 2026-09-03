"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, RefreshCw, Plus, Edit2, Hospital } from 'lucide-react';
import './directory.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

const SERVICE_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Fully Functional',
  LIMITED_CAPACITY: 'Limited Capacity',
  UNAVAILABLE: 'Unavailable',
};

const SERVICE_STATUS_BADGES: Record<string, string> = {
  OPERATIONAL: 'badge-active',
  LIMITED_CAPACITY: 'badge-warning',
  UNAVAILABLE: 'badge-inactive',
};

export default function ClinicalRegistry() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // Form States
  const [formData, setFormData] = useState({
    bedsTotal: 0,
    bedsAvailable: 0,
    currentWaitlist: 0,
    status: 'OPERATIONAL'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/directory/facilities`);
      if (res.ok) {
        setFacilities(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isLiaison = user?.role === 'LIAISON_OFFICER';

  const handleOpenEdit = (fac: any, svc: any) => {
    setSelectedFacility(fac);
    setSelectedService(svc);
    setFormData({
      bedsTotal: svc.bedsTotal || 0,
      bedsAvailable: svc.bedsAvailable || 0,
      currentWaitlist: svc.specialistQueues?.[0]?.currentWaitlist || svc.waitlistCount || 0,
      status: svc.status
    });
    setActiveModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeModal === 'edit') {
        // Parallel updates for status and beds
        await Promise.all([
          fetchWithAuth(`${API_URL}/api/directory/service/${selectedService.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: formData.status })
          }),
          fetchWithAuth(`${API_URL}/api/directory/service/${selectedService.id}/capacity`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bedsTotal: formData.bedsTotal, bedsAvailable: formData.bedsAvailable })
          })
        ]);
        setActiveModal(null);
        fetchData();
      }
    } catch (err) {
      alert('Failed to save registry updates.');
    }
  };

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.services.some((s: any) => (s.clinicalService?.name || s.serviceCategory || '').toLowerCase().includes(search.toLowerCase()))
    );
  }, [facilities, search]);

  return (
    <div className="directory-page">
      <div className="directory-header-row">
        <div>
          <h1 className="page-title">Clinical Service Registry</h1>
          <p className="page-subtitle">Real-time facility status, bed capacity, and specialist availability</p>
        </div>
        
        <div className="directory-search-wrapper">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search hospitals or services…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh Data" style={{ padding: '0.6rem 0.8rem' }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Syncing with clinical records…</p>
        </div>
      ) : (
        <div className="directory-grid">
          {filteredFacilities.map(fac => (
            <div key={fac.id} className="directory-card">
              <div className="directory-card-header">
                <div className="directory-fac-info">
                  <div className="directory-fac-title">
                    <Hospital size={18} color="var(--primary)" />
                    {fac.name}
                  </div>
                  <div className="directory-fac-meta">
                    <span className={`badge ${fac.status === 'OPERATIONAL' ? 'badge-active' : 'badge-inactive'}`}>
                      {fac.status}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} />
                      {fac.zone}, {fac.woreda}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="directory-card-body">
                {fac.services.length === 0 ? (
                  <div className="directory-empty-state">
                    No services registered for this facility.
                  </div>
                ) : (
                  <div>
                    {fac.services.map((svc: any) => (
                      <div key={svc.id} className="directory-service-row">
                        <div className="service-main">
                          <div className="service-top">
                            <span className="service-name">{svc.clinicalService?.name || svc.serviceCategory || 'Unknown'}</span>
                            <span className={`badge ${SERVICE_STATUS_BADGES[svc.status] || 'badge-neutral'}`}>
                              {SERVICE_STATUS_LABELS[svc.status] || svc.status}
                            </span>
                          </div>
                          <div className="service-stats">
                            <div className="service-stat-item">
                              <span>Beds:</span>
                              <span className={`stat-val ${svc.bedsAvailable === 0 && svc.bedsTotal > 0 ? 'critical' : ''}`}>
                                {svc.bedsAvailable}
                              </span>
                              <span>/ {svc.bedsTotal}</span>
                            </div>
                            <div className="service-stat-item">
                              <span>Waitlist:</span>
                              <span className="stat-val">{svc.specialistQueues?.[0]?.currentWaitlist || svc.waitlistCount || 0}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(isAdmin || (isLiaison && user?.facilityId === fac.id)) && (
                          <div className="directory-actions">
                            <button onClick={() => handleOpenEdit(fac, svc)} title="Update Capacity">
                              <Edit2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredFacilities.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>No facilities match your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {activeModal === 'edit' && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="modal-box" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div>
                <h2>Manage Service Capacity</h2>
                <p className="page-subtitle" style={{ marginTop: '0.2rem' }}>
                  Updating {selectedService?.clinicalService?.name || selectedService?.serviceCategory} at {selectedFacility?.name}
                </p>
              </div>
              <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Service Status</label>
                  <select 
                    className="form-select"
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="OPERATIONAL">Fully Functional</option>
                    <option value="LIMITED_CAPACITY">Limited Capacity</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Total Beds</label>
                    <input className="form-input" type="number" min="0" value={formData.bedsTotal} onChange={e => setFormData({...formData, bedsTotal: parseInt(e.target.value) || 0})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Beds Available</label>
                    <input className="form-input" type="number" min="0" max={formData.bedsTotal || 9999} value={formData.bedsAvailable} onChange={e => setFormData({...formData, bedsAvailable: parseInt(e.target.value) || 0})} required />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
