// Data Types mapping to Backend Schema
export interface LocalAttachment {
  name: string;       // original file name
  type: string;       // MIME type e.g. image/jpeg, application/pdf
  dataUrl: string;    // base64 data URL stored in PouchDB
  sizeKb: number;
}

export interface LocalReferralDraft {
  _id: string; // The UUID generated offline
  patientId?: string; // Set when patient is created online or after sync
  patient: {
    mrn: string;
    firstName: string;
    lastName: string;
    phone?: string;
    age?: number;
    sex: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  };
  referral: {
    originFacilityId: string;
    destFacilityId: string;
    selectedServiceId: string;
    priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    serviceCategory: string;
    clinicalSummary: string;
  };
  attachments: LocalAttachment[];
  consentGiven: boolean;
  status: string;
  syncState: string;
  synced: boolean;
  failed?: boolean;       // Set to true after too many failed sync attempts
  syncRetries?: number;   // Number of sync attempts made
  createdAt: string;
}

let dbInstance: any = null;

async function getDb() {
  if (typeof window === 'undefined') return null;
  if (!dbInstance) {
    // Dynamically import only in the browser
    const PouchDB = (await import('pouchdb-browser')).default;
    dbInstance = new PouchDB('trms-referrals-drafts');
  }
  return dbInstance;
}

/**
 * Saves a new Draft to Local Browser Database.
 */
export async function saveReferralDraft(draft: Omit<LocalReferralDraft, '_id' | 'synced' | 'createdAt' | 'status' | 'syncState'>): Promise<string> {
  const newId = crypto.randomUUID();
  const doc: LocalReferralDraft = {
    ...draft,
    _id: newId,
    status: 'DRAFT',
    syncState: 'PENDING',
    synced: false,
    createdAt: new Date().toISOString()
  };
  
  const db = await getDb();
  if (!db) throw new Error("Database not available on server side");
  await db.put(doc);
  return newId;
}

/**
 * Retrieves all pending offline referrals that haven't synced yet.
 */
export async function getPendingReferrals(): Promise<LocalReferralDraft[]> {
  const db = await getDb();
  if (!db) return [];
  const allDocs = await db.allDocs({ include_docs: true });
  return allDocs.rows
    .map((row: any) => row.doc as unknown as LocalReferralDraft)
    .filter((doc: any) => !doc.synced && !doc.failed);
}

/**
 * Marks specific documents as Synced and potentially deletes them from local cache or updates status
 */
export async function markReferralsSynced(ids: string[]): Promise<void> {
  const pendingDocs = await getPendingReferrals();
  const toUpdate = pendingDocs
    .filter(doc => ids.includes(doc._id))
    .map(doc => {
      doc.synced = true;
      return doc;
    });

  if (toUpdate.length > 0) {
    const db = await getDb();
    if (db) await db.bulkDocs(toUpdate);
  }
}

/**
 * Increments syncRetries on unsynced drafts. If retries >= 3, marks them permanently 
 * failed to prevent infinite retry loops for drafts with invalid/stale facility IDs.
 */
export async function incrementSyncRetries(ids: string[]): Promise<void> {
  const db = await getDb();
  if (!db || ids.length === 0) return;
  const allDocs = await db.allDocs({ include_docs: true });
  const toUpdate = allDocs.rows
    .map((row: any) => row.doc)
    .filter((doc: any) => ids.includes(doc._id))
    .map((doc: any) => {
      const newRetries = (doc.syncRetries || 0) + 1;
      return { 
        ...doc, 
        syncRetries: newRetries,
        failed: newRetries >= 3 
      };
    });
  
  if (toUpdate.length > 0) {
    await db.bulkDocs(toUpdate);
  }
}
