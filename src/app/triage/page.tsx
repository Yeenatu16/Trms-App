"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw, Hospital, Info, ChevronRight, Activity
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PRIORITY_BADGES: Record<string, "destructive" | "warning" | "success" | "default"> = { EMERGENCY: 'destructive', URGENT: 'warning', ROUTINE: 'success' };
const STATUS_BADGES: Record<string, "warning" | "success" | "destructive" | "default"> = { SUBMITTED: 'warning', ACCEPTED: 'success', REJECTED: 'destructive', PENDING_INFO: 'warning', REDIRECTED: 'default', COMPLETED: 'default' };

export default function TriageDashboard() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeReferral, setActiveReferral] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('ACCEPTED');
  const [note, setNote]           = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/triage/pending`);
      if (res.ok) setReferrals(await res.json());
    } catch (e) {
      toast.error('Failed to load triage queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const socket = getSocket();
    socket.on('referral:new', (payload: any) => {
      toast.error(`New ${payload.priority} Referral`, { description: `Patient MRN: ${payload.patientMrn}` });
      fetchPending();
    });
    socket.on('referral:updated', (payload: any) => {
      toast.info(`Referral Updated`, { description: `Status changed to ${payload.status}` });
      fetchPending();
    });
    return () => { socket.off('referral:new'); socket.off('referral:updated'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (['REJECTED', 'REDIRECTED', 'PENDING_INFO'].includes(newStatus) && !note.trim()) {
      toast.error('Clinical note required', { description: 'Please provide a reason for this decision.' });
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/triage/${activeReferral.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note }),
      });
      if (res.ok) {
        toast.success(`Referral ${newStatus.toLowerCase()}`);
        setActiveReferral(null); setNote(''); fetchPending();
      } else {
        const err = await res.json();
        toast.error(`Update failed: ${err.message}`);
      }
    } catch {
      toast.error('Network Error', { description: 'Failed to communicate with the server.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = referrals.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && r.priority !== filterPriority) return false;
    return true;
  });

  const kpis = [
    { label: 'Incoming', val: referrals.filter(r => r.status === 'SUBMITTED').length, color: 'text-blue-600', bg: 'bg-blue-100', icon: Activity },
    { label: 'Awaiting Info', val: referrals.filter(r => r.status === 'PENDING_INFO').length, color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
    { label: 'Accepted Today', val: referrals.filter(r => r.status === 'ACCEPTED').length, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle },
    { label: 'Emergency', val: referrals.filter(r => r.priority === 'EMERGENCY').length, color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Triage Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Incoming referrals awaiting destination decisions</p>
        </div>
        <Button variant="outline" onClick={fetchPending} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}>
                  <k.icon size={18} />
                </div>
                <span className="text-2xl font-bold text-slate-900">{k.val}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</Label>
              <select className="h-8 rounded-md border border-slate-200 text-sm px-2 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PENDING_INFO">Pending Info</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</Label>
              <select className="h-8 rounded-md border border-slate-200 text-sm px-2 bg-white" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="ALL">All Priorities</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="URGENT">Urgent</option>
                <option value="ROUTINE">Routine</option>
              </select>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'referral' : 'referrals'}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <RefreshCw className="animate-spin mb-4" size={24} />
              <p>Loading queue…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Queue is empty</h3>
              <p className="text-sm">No referrals match the current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(r => (
                <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
                  
                  {/* Left block */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{r.id?.slice(0, 8)}</span>
                      <Badge variant={PRIORITY_BADGES[r.priority] || 'default'} className="px-1.5 py-0 text-[10px] uppercase">
                        {r.priority}
                      </Badge>
                      <Badge variant={STATUS_BADGES[r.status] || 'default'} className="px-1.5 py-0 text-[10px] uppercase">
                        {r.status}
                      </Badge>
                      <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-y-2 sm:gap-6 items-start sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {r.patient?.firstName?.[0]}{r.patient?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {r.patient?.firstName} {r.patient?.lastName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">MRN: {r.patient?.mrn}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600 sm:ml-auto">
                        <Hospital size={16} className="text-slate-400" />
                        <span>From <span className="font-medium text-slate-900">{r.originFacility?.name ?? 'Unknown'}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Right block / CTA */}
                  <div className="w-full md:w-auto shrink-0 md:pl-4">
                    {r.status === 'SUBMITTED' ? (
                      <div className="grid grid-cols-2 md:flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setActiveReferral(r); setNewStatus('ACCEPTED'); setNote(''); }}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-slate-600" onClick={() => { setActiveReferral(r); setNewStatus('REDIRECTED'); setNote(''); }}>
                          Redirect
                        </Button>
                        <Button size="sm" variant="destructive" className="col-span-2 md:col-span-1" onClick={() => { setActiveReferral(r); setNewStatus('REJECTED'); setNote(''); }}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => { setActiveReferral(r); setNewStatus(r.status === 'ACCEPTED' ? 'COMPLETED' : 'ACCEPTED'); setNote(''); }}>
                        Review Details <ChevronRight size={14} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Modal */}
      <Dialog open={activeReferral !== null} onOpenChange={(open) => !open && setActiveReferral(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Referral Triage Decision</DialogTitle>
            <DialogDescription>
              Patient: <span className="font-semibold text-slate-900">{activeReferral?.patient?.firstName} {activeReferral?.patient?.lastName}</span> · MRN {activeReferral?.patient?.mrn}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Priority:</span>
                <Badge variant={PRIORITY_BADGES[activeReferral?.priority] || 'default'}>{activeReferral?.priority}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Origin:</span>
                <span className="font-semibold text-slate-900">{activeReferral?.originFacility?.name ?? '—'}</span>
              </div>
              {activeReferral?.referral?.serviceCategory && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Service:</span>
                  <span className="font-semibold text-slate-900">{activeReferral.referral.serviceCategory}</span>
                </div>
              )}
            </div>

            {activeReferral?.referral?.clinicalSummary && (
              <div className="space-y-1">
                <Label className="text-slate-500">Clinical Summary</Label>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed font-sans">
                  {activeReferral.referral.clinicalSummary}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label>Triage Decision</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { val: 'ACCEPTED', label: 'Accept', cls: 'border-emerald-200 hover:bg-emerald-50 data-[state=on]:bg-emerald-100 data-[state=on]:border-emerald-500 data-[state=on]:text-emerald-800' },
                  { val: 'REJECTED', label: 'Reject', cls: 'border-red-200 hover:bg-red-50 data-[state=on]:bg-red-100 data-[state=on]:border-red-500 data-[state=on]:text-red-800' },
                  { val: 'REDIRECTED', label: 'Redirect', cls: 'border-slate-200 hover:bg-slate-100 data-[state=on]:bg-slate-200 data-[state=on]:border-slate-500 data-[state=on]:text-slate-900' },
                  { val: 'PENDING_INFO', label: 'Need Info', cls: 'border-amber-200 hover:bg-amber-50 data-[state=on]:bg-amber-100 data-[state=on]:border-amber-500 data-[state=on]:text-amber-800' },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    data-state={newStatus === d.val ? 'on' : 'off'}
                    onClick={() => setNewStatus(d.val)}
                    className={`flex items-center justify-center h-10 px-3 text-sm font-semibold rounded-md border transition-all ${d.cls}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {newStatus === 'ACCEPTED' && (
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-800 mt-2">
                 <Info size={18} className="shrink-0 text-blue-600 mt-0.5" />
                 <p>Accepting this referral will auto-generate a secure token and notify the patient and referring facility.</p>
               </div>
            )}

            {['REJECTED', 'REDIRECTED', 'PENDING_INFO'].includes(newStatus) && (
              <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                <Label>Clinical Note required for this decision</Label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Provide explicit clinical reasoning..."
                />
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveReferral(null)} disabled={isUpdating}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Decision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
