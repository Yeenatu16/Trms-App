import { Injectable } from '@nestjs/common';

/**
 * FhirMapperService — transforms internal Prisma models into
 * HL7 FHIR R4-compliant resource representations.
 *
 * This allows the TRMS REST API to speak a standard health interoperability
 * language whilst keeping the internal DB schema lean and normalized.
 */
@Injectable()
export class FhirMapperService {
  /**
   * Map a Prisma Patient record → FHIR R4 Patient resource
   */
  toFhirPatient(patient: any): object {
    return {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          use: 'official',
          system: 'urn:trms:mrn',
          value: patient.mrn,
        },
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      gender: this.mapGender(patient.sex),
      birthDate: patient.dateOfBirth ?? undefined,
      telecom: patient.phone
        ? [{ system: 'phone', value: patient.phone, use: 'mobile' }]
        : [],
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
        lastUpdated: patient.updatedAt ?? new Date().toISOString(),
      },
    };
  }

  /**
   * Map a Prisma ServiceRequest → FHIR R4 ServiceRequest resource
   */
  toFhirServiceRequest(ref: any): object {
    const priorityMap: Record<string, string> = {
      ROUTINE: 'routine',
      URGENT: 'urgent',
      EMERGENCY: 'asap',
    };

    const statusMap: Record<string, string> = {
      SUBMITTED: 'active',
      ACCEPTED: 'active',
      REJECTED: 'revoked',
      REDIRECTED: 'on-hold',
      PENDING_INFO: 'on-hold',
      COMPLETED: 'completed',
    };

    return {
      resourceType: 'ServiceRequest',
      id: ref.id,
      status: statusMap[ref.status] ?? 'unknown',
      intent: 'order',
      priority: priorityMap[ref.priority] ?? 'routine',
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '3457005',
            display: ref.serviceCategory ?? 'Patient referral',
          },
        ],
        text: ref.serviceCategory ?? 'Patient referral',
      },
      subject: {
        reference: `Patient/${ref.patientId}`,
        display: ref.patient
          ? `${ref.patient.firstName} ${ref.patient.lastName}`
          : undefined,
      },
      requester: {
        reference: `Organization/${ref.originId}`,
        display: ref.originFacility?.name ?? ref.originId,
      },
      performer: [
        {
          reference: `Organization/${ref.destId}`,
          display: ref.destFacility?.name ?? ref.destId,
        },
      ],
      note: ref.clinicalSummary ? [{ text: ref.clinicalSummary }] : [],
      authoredOn: ref.createdAt,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/ServiceRequest'],
        lastUpdated: ref.updatedAt ?? ref.createdAt,
      },
    };
  }

  /**
   * Map a Prisma Task → FHIR R4 Task resource
   */
  toFhirTask(task: any, serviceRequestId: string): object {
    const statusMap: Record<string, string> = {
      PENDING: 'requested',
      IN_PROGRESS: 'in-progress',
      COMPLETED: 'completed',
      REJECTED: 'rejected',
    };

    return {
      resourceType: 'Task',
      id: task.id,
      status: statusMap[task.status] ?? 'requested',
      intent: 'order',
      focus: { reference: `ServiceRequest/${serviceRequestId}` },
      owner: task.assignedToUserId
        ? { reference: `Practitioner/${task.assignedToUserId}` }
        : undefined,
      note: task.notes ? [{ text: task.notes }] : [],
      authoredOn: task.createdAt,
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Task'],
      },
    };
  }

  /**
   * Wrap any FHIR resource(s) in a FHIR Bundle
   */
  toBundle(
    resources: object[],
    type: 'searchset' | 'collection' = 'searchset',
  ): object {
    return {
      resourceType: 'Bundle',
      type,
      total: resources.length,
      entry: resources.map((resource) => ({ resource })),
    };
  }

  private mapGender(sex: string): string {
    const map: Record<string, string> = {
      MALE: 'male',
      FEMALE: 'female',
      OTHER: 'other',
      UNKNOWN: 'unknown',
    };
    return map[sex] ?? 'unknown';
  }

  /**
   * Parse an incoming FHIR Bundle and extract Patient and ServiceRequest details
   */
  parseFhirBundle(bundle: any): { patientData: any; serviceRequestData: any } {
    if (bundle?.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
      throw new Error('Invalid or missing FHIR Bundle entries');
    }

    let patientRes: any = null;
    let requestRes: any = null;

    for (const entry of bundle.entry) {
      if (entry.resource?.resourceType === 'Patient') {
        patientRes = entry.resource;
      } else if (entry.resource?.resourceType === 'ServiceRequest') {
        requestRes = entry.resource;
      }
    }

    if (!patientRes || !requestRes) {
      throw new Error(
        'Bundle must contain at least one Patient and one ServiceRequest resource',
      );
    }

    // Parse Patient
    const mrnIdentifier = patientRes.identifier?.find(
      (i: any) => i.system === 'urn:trms:mrn' || true,
    )?.value;
    const nameObj = patientRes.name?.[0] || {};
    const patientData = {
      mrn: mrnIdentifier || `MRN-${Date.now()}`,
      lastName: nameObj.family || 'Unknown',
      firstName: nameObj.given?.[0] || 'Unknown',
      sex: this.parseGender(patientRes.gender),
      dateOfBirth: patientRes.birthDate
        ? new Date(patientRes.birthDate)
        : undefined,
      phone: patientRes.telecom?.find((t: any) => t.system === 'phone')?.value,
    };

    // Parse ServiceRequest
    const priorityMap: Record<string, string> = {
      routine: 'ROUTINE',
      urgent: 'URGENT',
      asap: 'EMERGENCY',
      stat: 'EMERGENCY',
    };

    const originRef =
      requestRes.requester?.reference?.replace('Organization/', '') ||
      'Origin-Unknown';
    const destRef =
      requestRes.performer?.[0]?.reference?.replace('Organization/', '') ||
      'Dest-Unknown';

    const serviceRequestData = {
      priority: priorityMap[requestRes.priority] || 'ROUTINE',
      serviceCategory: requestRes.code?.text || 'Patient referral',
      clinicalSummary: requestRes.note?.[0]?.text || '',
      originFacilityId: originRef,
      destFacilityId: destRef,
    };

    return { patientData, serviceRequestData };
  }

  private parseGender(gender: string): string {
    const map: Record<string, string> = {
      male: 'MALE',
      female: 'FEMALE',
      other: 'OTHER',
      unknown: 'UNKNOWN',
    };
    return map[gender] ?? 'UNKNOWN';
  }
}
