/**
 * Sprint 7: FHIR R4-compatible serializers
 * Maps internal Prisma models to FHIR-aligned JSON resources.
 * This enables future integration with SmartCare and DHIS2.
 */

export function toFhirPatient(patient: any) {
  return {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [{ system: 'urn:trms:mrn', value: patient.mrn }],
    name: [{ family: patient.lastName, given: [patient.firstName] }],
    gender: patient.sex?.toLowerCase() ?? 'unknown',
    telecom: patient.phone ? [{ system: 'phone', value: patient.phone }] : [],
  };
}

export function toFhirServiceRequest(referral: any) {
  return {
    resourceType: 'ServiceRequest',
    id: referral.id,
    status: mapStatusToFhir(referral.status),
    intent: 'order',
    priority: referral.priority?.toLowerCase() ?? 'routine',
    subject: { reference: `Patient/${referral.patientId}` },
    requester: { reference: `Organization/${referral.originId}` },
    performer: [{ reference: `Organization/${referral.destId}` }],
    note: referral.clinicalSummary ? [{ text: referral.clinicalSummary }] : [],
    authoredOn: referral.createdAt,
  };
}

export function toFhirConsent(consent: any) {
  return {
    resourceType: 'Consent',
    id: consent.id,
    status: consent.consentGiven ? 'active' : 'rejected',
    scope: { coding: [{ code: 'patient-privacy' }] },
    patient: { reference: `Patient/${consent.patientId}` },
    dateTime: consent.consentDate,
  };
}

function mapStatusToFhir(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'draft',
    SUBMITTED: 'active',
    ACCEPTED: 'active',
    REJECTED: 'revoked',
    REDIRECTED: 'on-hold',
    PENDING: 'on-hold',
    COMPLETED: 'completed',
  };
  return map[status] ?? 'unknown';
}
