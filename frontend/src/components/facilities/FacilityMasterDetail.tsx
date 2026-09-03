"use client";
import { getApiUrl } from '@/lib/config';
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Search, Plus, MapPin, Activity, Edit2, Shield, X, Save, Clock, ChevronRight, ActivitySquare } from 'lucide-react';
import './facilities.css';

const API_URL = getApiUrl();

interface Equipment {
  id: string;
  name: string;
  category: string;
  status: string;
  functional: boolean;
}

interface FacilityService {
  id: string;
  clinicalServiceId: string;
  clinicalService: { name: string, category: string };
  status: string;
  bedsTotal: number;
  bedsAvailable: number;
  waitlistCount: number;
  statusNote: string | null;
  updatedAt: string;
  equipmentLinks: Array<{
    id: string;
    isMandatory: boolean;
    equipment: Equipment;
  }>;
}

interface Facility {
  id: string;
  name: string;
  code: string;
  region: string;
  zone: string;
  woreda: string;
  levelOfCare: string;
  status: string;
  services: FacilityService[];
  equipments: Equipment[];
  updatedAt: string;
}

const EMPTY_FACILITY = { id: '', name: '', code: '', region: 'Tigray', zone: '', woreda: '', levelOfCare: '', status: 'OPERATIONAL', selectedServiceIds: [] as string[] };

export default function FacilityMasterDetail({ role }: { role: 'ADMINISTRATOR' | 'LIAISON_OFFICER' }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [clinicalServices, setClinicalServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  // Admin Modals
  const [isFacModalOpen, setIsFacModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('General');
  const [isCreatingGlobalSrv, setIsCreatingGlobalSrv] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [facFormData, setFacFormData] = useState({ ...EMPTY_FACILITY });

  // Liaison Modal (Capacity Flyout)
  const [isCapModalOpen, setIsCapModalOpen] = useState(false);
  const [capFormData, setCapFormData] = useState<{ id: string, name: string, bedsTotal: number, bedsAvailable: number, waitlistCount: number, status: string, statusNote: string } | null>(null);

  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [eqFormData, setEqFormData] = useState({ name: '', category: '' });

  const [isEqStatusModalOpen, setIsEqStatusModalOpen] = useState(false);
  const [eqStatusData, setEqStatusData] = useState({ id: '', status: 'FUNCTIONAL', functional: true });

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkData, setLinkData] = useState({ equipmentId: '', equipmentName: '', facilityServiceId: '', isMandatory: true });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGlobalDirectory();
    fetchData();
  }, []);

  const fetchGlobalDirectory = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/clinical-services`);
      if (res.ok) setClinicalServices(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/facilities`);
      if (res.ok) setFacilities(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ADMIN FUNCTIONS
  // -----------------------------------------------------
  const openCreateFacility = () => {
    setFacFormData({ ...EMPTY_FACILITY, selectedServiceIds: [] });
    setIsEditMode(false);
    setIsFacModalOpen(true);
  };

  const openEditFacility = (f: Facility) => {
    setFacFormData({
      id: f.id, name: f.name, code: f.code, region: f.region, zone: f.zone, woreda: f.woreda, levelOfCare: f.levelOfCare || '', status: f.status,
      selectedServiceIds: f.services.map(s => s.clinicalServiceId),
    });
    setIsEditMode(true);
    setIsFacModalOpen(true);
  };

  const saveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEditMode ? `${API_URL}/api/directory/facilities/${facFormData.id}` : `${API_URL}/api/directory/facilities`;
      const method = isEditMode ? 'PATCH' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facFormData),
      });
      if (res.ok) {
        setIsFacModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };
  // EQUIPMENT FUNCTIONS
  const openCreateEquipment = () => {
    setEqFormData({ name: '', category: '' });
    setIsEqModalOpen(true);
  };

  const saveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: selectedFacilityId, ...eqFormData }),
      });
      if (res.ok) {
        setIsEqModalOpen(false);
        fetchData();
      } else alert('Failed to save equipment');
    } finally { setSaving(false); }
  };

  const openEditEquipment = (eq: Equipment) => {
    setEqStatusData({ id: eq.id, status: eq.status, functional: eq.functional });
    setIsEqStatusModalOpen(true);
  };

  const saveEquipmentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/equipment/${eqStatusData.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: eqStatusData.status, functional: eqStatusData.functional }),
      });
      if (res.ok) {
        setIsEqStatusModalOpen(false);
        fetchData();
      }
    } finally { setSaving(false); }
  };

  const openLinkEquipment = (eq: Equipment) => {
    setLinkData({ equipmentId: eq.id, equipmentName: eq.name, facilityServiceId: '', isMandatory: true });
    setIsLinkModalOpen(true);
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/service/${linkData.facilityServiceId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: linkData.equipmentId, isMandatory: linkData.isMandatory }),
      });
      if (res.ok) {
        setIsLinkModalOpen(false);
        fetchData();
      }
    } finally { setSaving(false); }
  };

  // LIAISON FUNCTIONS
  const openCapacityEditor = (fs: FacilityService) => {
    setCapFormData({
      id: fs.id,
      name: fs.clinicalService.name,
      bedsTotal: fs.bedsTotal,
      bedsAvailable: fs.bedsAvailable,
      waitlistCount: fs.waitlistCount,
      status: fs.status,
      statusNote: fs.statusNote || '',
    });
    setIsCapModalOpen(true);
  };

  const saveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capFormData) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/service/${capFormData.id}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedsTotal: capFormData.bedsTotal,
          bedsAvailable: capFormData.bedsAvailable,
          waitlistCount: capFormData.waitlistCount,
          status: capFormData.status,
          statusNote: capFormData.statusNote,
        })
      });
      if (res.ok) {
        setIsCapModalOpen(false);
        fetchData(); // Refresh to catch changes
      } else {
        alert("Failed to update capacity");
      }
    } finally {
      setSaving(false);
    }
  };
  // RENDER HELPERS
  // -----------------------------------------------------
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'OPERATIONAL': return 'var(--success)';
      case 'LIMITED':
      case 'LIMITED_CAPACITY': return 'var(--warning)';
      case 'FULL': return 'var(--danger)';
      case 'CLOSED':
      case 'UNAVAILABLE': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'OPERATIONAL') return 'AVAILABLE';
    if (status === 'LIMITED_CAPACITY') return 'LIMITED';
    if (status === 'UNAVAILABLE') return 'CLOSED';
    return status;
  };

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.zone.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFac = facilities.find(f => f.id === selectedFacilityId);

  return (
    <div className="fac-md-root">

      {/* ── LEFT PANEL: Master List ── */}
      <div className="fac-md-master">
        <div className="fac-md-header">
          <div>
            <h1 className="page-title">Directory</h1>
            <p className="page-subtitle">Select a facility to view availability</p>
          </div>
          {role === 'ADMINISTRATOR' && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openCreateFacility}>
              <Plus size={14} /> Register Hospital
            </button>
          )}
        </div>

        <div className="fac-md-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search hospitals or zones..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="fac-md-list">
          {loading ? (
            <div className="text-center p-4 text-muted"><span className="spinner" /> Loading...</div>
          ) : filteredFacilities.length === 0 ? (
            <div className="text-center p-4 text-muted">No facilities found.</div>
          ) : (
            filteredFacilities.map(f => (
              <div
                key={f.id}
                className={`fac-md-card ${selectedFacilityId === f.id ? 'active' : ''}`}
                onClick={() => setSelectedFacilityId(f.id)}
              >
                <div className="fac-md-card-header">
                  <span className="fac-md-card-title">{f.name}</span>
                  <div className="fac-md-status-dot" style={{ backgroundColor: getStatusColor(f.status) }} />
                </div>
                <div className="fac-md-card-meta">
                  <MapPin size={12} /> {f.zone || f.region}
                </div>
                <div className="fac-md-card-footer">
                  <span>{f.services.length} services</span>
                  <span>{new Date(f.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Detail View ── */}
      <div className="fac-md-detail">
        {!selectedFac ? (
          <div className="fac-md-empty">
            <ActivitySquare size={48} color="var(--border-color)" />
            <h2>No Facility Selected</h2>
            <p>Select a facility from the list to view or manage its clinical service capacity.</p>
          </div>
        ) : (
          <div className="fac-detail-content">
            {/* Detail Header */}
            <div className="fac-detail-header">
              <div className="fac-detail-title-row">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="fac-detail-title">{selectedFac.name}</h2>
                    <span className="badge badge-neutral" style={{ backgroundColor: getStatusColor(selectedFac.status) + '22', color: getStatusColor(selectedFac.status) }}>
                      {getStatusText(selectedFac.status)}
                    </span>
                  </div>
                  <div className="fac-detail-meta">
                    Code: {selectedFac.code} &bull; {selectedFac.woreda ? selectedFac.woreda + ', ' : ''}{selectedFac.zone}, {selectedFac.region}
                  </div>
                </div>
                {role === 'ADMINISTRATOR' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditFacility(selectedFac)}>
                    <Edit2 size={14} /> Edit Target
                  </button>
                )}
              </div>
            </div>

            {/* Nested Services Table */}
            <div className="fac-services-section">
              <h3 className="section-title">Clinical Service Availability</h3>

              {selectedFac.services.length === 0 ? (
                <div className="fac-services-empty">
                  No services linked to this facility.
                  {role === 'ADMINISTRATOR' && ' Click Edit Target to assign services.'}
                </div>
              ) : (
                <div className="fac-table-wrapper">
                  <table className="fac-services-table">
                    <thead>
                      <tr>
                        <th>Service / Dept</th>
                        <th>Status</th>
                        <th>Beds (Avail/Total)</th>
                        <th>Waitlist</th>
                        <th>Last Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFac.services.map(s => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.clinicalService.name}</strong>
                            {s.statusNote && <div className="text-muted text-xs mt-1">↳ {s.statusNote}</div>}
                            {s.equipmentLinks?.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.equipmentLinks.map(link => (
                                  <span key={link.id} className="badge" style={{ fontSize: '0.7rem', backgroundColor: link.equipment.functional ? 'var(--success)' : 'var(--danger)', color: 'white', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                                    {link.equipment.name} {link.isMandatory ? '(Req)' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="srv-status-badge" style={{ borderColor: getStatusColor(s.status), color: getStatusColor(s.status) }}>
                              {getStatusText(s.status)}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: s.bedsAvailable > 0 ? 'var(--success)' : 'inherit' }}>{s.bedsAvailable}</strong> / {s.bedsTotal}
                          </td>
                          <td>{s.waitlistCount}</td>
                          <td className="text-muted text-sm">{new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => openCapacityEditor(s)}>Manage</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Equipment Section */}
            <div className="fac-services-section" style={{ marginTop: '2rem' }}>
              <div className="flex items-center gap-4 mb-4" style={{ justifyContent: 'space-between' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Facility Equipment Registry</h3>
                {role === 'ADMINISTRATOR' && (
                  <button className="btn btn-primary btn-sm" onClick={() => openCreateEquipment()}>
                    <Plus size={14} /> Add Equipment
                  </button>
                )}
              </div>
              {!selectedFac.equipments || selectedFac.equipments.length === 0 ? (
                <div className="fac-services-empty">No equipment registered.</div>
              ) : (
                <div className="fac-table-wrapper">
                  <table className="fac-services-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFac.equipments.map(eq => (
                        <tr key={eq.id}>
                          <td><strong>{eq.name}</strong></td>
                          <td>{eq.category}</td>
                          <td>
                            <span className="srv-status-badge" style={{ borderColor: eq.functional ? 'var(--success)' : 'var(--danger)', color: eq.functional ? 'var(--success)' : 'var(--danger)' }}>
                              {eq.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditEquipment(eq)}>Update Status</button>
                            {role === 'ADMINISTRATOR' && (
                               <button className="btn btn-secondary btn-sm" style={{ marginLeft: '0.5rem' }} onClick={() => openLinkEquipment(eq)}>Link to Service</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Admin Registration/Edit Modal */}
      {isFacModalOpen && (
        <div className="fac-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsFacModalOpen(false)}>
          <div className="fac-modal-box" style={{ maxWidth: 650 }}>
            <div className="fac-modal-header">
              <h3>{isEditMode ? 'Edit Facility Config' : 'Register Facility'}</h3>
              <button onClick={() => setIsFacModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveFacility} className="fac-modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Facility Name</label>
                  <input className="form-input" value={facFormData.name} onChange={e => setFacFormData({ ...facFormData, name: e.target.value })} required />
                </div>
                {!isEditMode && (
                  <div className="form-group">
                    <label className="form-label">Facility Code</label>
                    <input className="form-input" value={facFormData.code} onChange={e => setFacFormData({ ...facFormData, code: e.target.value })} required />
                  </div>
                )}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Level of Care</label>
                  <select className="form-select" value={facFormData.levelOfCare} onChange={e => setFacFormData({ ...facFormData, levelOfCare: e.target.value })}>
                    <option value="">Select Level</option>
                    <option value="Primary">Primary</option>
                    <option value="General">General</option>
                    <option value="Comprehensive">Comprehensive</option>
                    <option value="Specialized">Specialized</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status Overview</label>
                  <select className="form-select" value={facFormData.status} onChange={e => setFacFormData({ ...facFormData, status: e.target.value })}>
                    <option value="OPERATIONAL">Operational</option>
                    <option value="LIMITED_CAPACITY">Warning / Limited</option>
                    <option value="UNAVAILABLE">Down / Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="fac-multi-select-section mt-4">
                <div className="flex items-center mb-2" style={{ justifyContent: 'space-between' }}>
                  <h4>Link Clinical Services</h4>
                  {!isEditMode && (
                    <div className="flex gap-2 items-center">
                      <input className="form-input" style={{ width: 120, padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} placeholder="New Name..." value={newServiceName} onChange={e => setNewServiceName(e.target.value)} />
                      <select className="form-select" style={{ width: 110, padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} value={newServiceCategory} onChange={e => setNewServiceCategory(e.target.value)}>
                        <option value="General">General</option>
                        <option value="Specialized">Specialized</option>
                        <option value="Critical Care">Critical Care</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Surgery">Surgery</option>
                        <option value="Obstetrics">Obstetrics</option>
                        <option value="Pediatrics">Pediatrics</option>
                      </select>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={isCreatingGlobalSrv || !newServiceName} onClick={async () => {
                        setIsCreatingGlobalSrv(true);
                        try {
                          const res = await fetchWithAuth(`${API_URL}/api/directory/clinical-services`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newServiceName, category: newServiceCategory })
                          });
                          if (res.ok) {
                            setNewServiceName('');
                            fetchGlobalDirectory();
                          } else {
                            const err = await res.json();
                            alert(err.message || 'Failed to create service. It may already exist.');
                          }
                        } catch (e: any) {
                          alert(e.message || 'Network error');
                        } finally { setIsCreatingGlobalSrv(false); }
                      }}>+ Global</button>
                    </div>
                  )}
                </div>
                <div className="fac-checklist">
                  {clinicalServices.length === 0 ? (
                    <div className="text-muted" style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center' }}>
                      Initializing global clinical directory... Please reload or save to auto-seed.
                    </div>
                  ) : (
                    clinicalServices.map(cs => (
                      <label key={cs.id} className="fac-checklist-item">
                        <input
                          type="checkbox"
                          checked={facFormData.selectedServiceIds.includes(cs.id)}
                          onChange={(e) => {
                            const sIds = facFormData.selectedServiceIds;
                            setFacFormData({
                              ...facFormData,
                              selectedServiceIds: e.target.checked ? [...sIds, cs.id] : sIds.filter(id => id !== cs.id)
                            });
                          }}
                        />
                        <span>{cs.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="fac-modal-actions mt-4 text-right">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equipment Modals */}
      {isEqModalOpen && (
        <div className="fac-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsEqModalOpen(false)}>
          <div className="fac-modal-box" style={{ maxWidth: 400 }}>
            <div className="fac-modal-header">
              <h3>Register Equipment</h3>
              <button onClick={() => setIsEqModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEquipment} className="fac-modal-body">
              <div className="form-group">
                <label className="form-label">Equipment Name</label>
                <input className="form-input" value={eqFormData.name} onChange={e => setEqFormData({ ...eqFormData, name: e.target.value })} required placeholder="e.g. X-Ray Machine" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" value={eqFormData.category} onChange={e => setEqFormData({ ...eqFormData, category: e.target.value })} placeholder="e.g. Imaging" />
              </div>
              <div className="fac-modal-actions mt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>Save Equipment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEqStatusModalOpen && (
        <div className="fac-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsEqStatusModalOpen(false)}>
          <div className="fac-modal-box" style={{ maxWidth: 400 }}>
            <div className="fac-modal-header">
              <h3>Update Equipment Status</h3>
              <button onClick={() => setIsEqStatusModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEquipmentStatus} className="fac-modal-body">
              <div className="form-group">
                <label className="form-label">Is Functional?</label>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={eqStatusData.functional} onChange={e => setEqStatusData({ ...eqStatusData, functional: e.target.checked })} />
                  <span>Yes, equipment is operational</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status Details</label>
                <select className="form-select" value={eqStatusData.status} onChange={e => setEqStatusData({ ...eqStatusData, status: e.target.value })}>
                  <option value="FUNCTIONAL">Functional</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>
              <div className="fac-modal-actions mt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLinkModalOpen && (
        <div className="fac-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsLinkModalOpen(false)}>
          <div className="fac-modal-box" style={{ maxWidth: 400 }}>
            <div className="fac-modal-header">
              <h3>Link Equipment to Service</h3>
              <button onClick={() => setIsLinkModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveLink} className="fac-modal-body">
              <div className="form-group mb-4">
                <strong>Equipment:</strong> {linkData.equipmentName}
              </div>
              <div className="form-group">
                <label className="form-label">Select Service</label>
                <select className="form-select" value={linkData.facilityServiceId} onChange={e => setLinkData({ ...linkData, facilityServiceId: e.target.value })} required>
                  <option value="">Choose a service...</option>
                  {selectedFac?.services.map(s => (
                    <option key={s.id} value={s.id}>{s.clinicalService.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Requirement Type</label>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={linkData.isMandatory} onChange={e => setLinkData({ ...linkData, isMandatory: e.target.checked })} />
                  <span>Mandatory for this service</span>
                </div>
                <small className="text-muted block mt-1">If mandatory equipment breaks, the service becomes UNAVAILABLE automatically.</small>
              </div>
              <div className="fac-modal-actions mt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>Link Equipment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liaison Capacity Pop-in */}
      {isCapModalOpen && capFormData && (
        <div className="fac-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsCapModalOpen(false)}>
          <div className="fac-modal-box" style={{ maxWidth: 400 }}>
            <div className="fac-modal-header">
              <h3>Update: {capFormData.name}</h3>
              <button onClick={() => setIsCapModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveCapacity} className="fac-modal-body">
              <div className="form-group">
                <label className="form-label">Service Status</label>
                <select className="form-select" value={capFormData.status} onChange={e => setCapFormData({ ...capFormData, status: e.target.value })}>
                  <option value="OPERATIONAL">AVAILABLE (Green)</option>
                  <option value="LIMITED_CAPACITY">LIMITED (Amber)</option>
                  <option value="FULL">FULL (Red)</option>
                  <option value="UNAVAILABLE">CLOSED (Gray)</option>
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Available Beds</label>
                  <input type="number" min="0" className="form-input" value={capFormData.bedsAvailable} onChange={e => setCapFormData({ ...capFormData, bedsAvailable: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Beds</label>
                  <input type="number" min="0" className="form-input" value={capFormData.bedsTotal} onChange={e => setCapFormData({ ...capFormData, bedsTotal: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Waitlist Count</label>
                <input type="number" min="0" className="form-input" value={capFormData.waitlistCount} onChange={e => setCapFormData({ ...capFormData, waitlistCount: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status Note (Optional)</label>
                <input type="text" className="form-input" placeholder="e.g., Short-staffed, CT scanner down" value={capFormData.statusNote} onChange={e => setCapFormData({ ...capFormData, statusNote: e.target.value })} />
              </div>

              <div className="fac-modal-actions mt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Updating...' : 'Publish Live Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
