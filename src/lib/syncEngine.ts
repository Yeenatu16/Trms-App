"use client";
import { getPendingReferrals, markReferralsSynced, incrementSyncRetries } from './db';
import { fetchWithAuth } from '@/lib/api';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let isSyncing = false;
let consecutiveFailures = 0;

/**
 * Triggers a synchronization attempt of all local drafts up to the backend.
 * Treats network errors (TypeError: Failed to fetch) as OFFLINE state, not ERROR.
 */
export async function runSyncEngine() {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, state: 'OFFLINE', message: 'Offline mode active.' };
  }

  if (isSyncing) return { success: true, state: 'SYNCING', message: 'Sync already in progress...' };

  const pending = await getPendingReferrals();
  if (pending.length === 0) {
    consecutiveFailures = 0;
    return { success: true, state: 'SYNCED', message: 'Up to Date' };
  }

  isSyncing = true;
  try {
    const response = await fetchWithAuth(`${BACKEND_API_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drafts: pending })
    });

    if (response.ok) {
      const data = await response.json();
      consecutiveFailures = 0;

      // Mark accepted drafts as synced
      if (data.syncedIds?.length > 0) {
        await markReferralsSynced(data.syncedIds);
      }

      // Mark any drafts NOT returned in syncedIds as failed to increment their retry count
      const unsyncedIds = pending.filter(d => !data.syncedIds?.includes(d._id)).map(d => d._id);
      if (unsyncedIds.length > 0) {
        await incrementSyncRetries(unsyncedIds);
        console.warn(`[SyncEngine] Incremented sync retries for ${unsyncedIds.length} failed drafts.`);
      }

      return { success: true, state: 'SYNCED', count: data.syncedIds.length };
    }

    consecutiveFailures++;
    return { success: false, state: 'ERROR', message: `Sync failed: ${response.statusText}` };

  } catch (error: any) {
    // "Failed to fetch" = backend unreachable = treat as OFFLINE, not as an error
    const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
    if (isNetworkError) {
      consecutiveFailures++;
      // Only warn once, not every poll cycle
      if (consecutiveFailures === 1) {
        console.warn('[SyncEngine] Backend unreachable — will retry when connection is restored.');
      }
      return { success: false, state: 'OFFLINE', message: 'Backend unreachable.' };
    }

    console.error('[SyncEngine] Unexpected error:', error);
    consecutiveFailures++;
    return { success: false, state: 'ERROR', message: 'Internal sync error.' };
  } finally {
    isSyncing = false;
  }
}

/**
 * Starts a background sync interval with exponential backoff on failures.
 */
export function startBackgroundSync(onStatusChange: (status: string) => void) {
  if (typeof window === 'undefined') return;

  const BASE_INTERVAL = 15000;   // 15 seconds
  const MAX_INTERVAL  = 120000;  // 2 minutes cap

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const poll = async () => {
    if (!navigator.onLine) {
      onStatusChange('OFFLINE');
      timeoutId = setTimeout(poll, BASE_INTERVAL);
      return;
    }

    const res = await runSyncEngine();

    if (res.state === 'SYNCED') {
      onStatusChange('UP_TO_DATE');
    } else if (res.state === 'OFFLINE') {
      onStatusChange('OFFLINE');
    } else if (res.state === 'ERROR') {
      onStatusChange('ERROR');
    }

    // Exponential backoff: 15s → 30s → 60s → 120s cap
    const backoff = Math.min(BASE_INTERVAL * Math.pow(2, consecutiveFailures), MAX_INTERVAL);
    timeoutId = setTimeout(poll, backoff);
  };

  // Immediate trigger on network restoration
  window.addEventListener('online', () => {
    onStatusChange('SYNCING');
    if (timeoutId) clearTimeout(timeoutId);
    runSyncEngine().then(res => {
      onStatusChange(res.state === 'SYNCED' ? 'UP_TO_DATE' : res.state === 'OFFLINE' ? 'OFFLINE' : 'ERROR');
      timeoutId = setTimeout(poll, BASE_INTERVAL);
    });
  });
  window.addEventListener('offline', () => {
    onStatusChange('OFFLINE');
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(poll, BASE_INTERVAL);
  });

  // Kick off the first poll
  poll();
}
