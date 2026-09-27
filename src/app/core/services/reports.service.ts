import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SortDirection = 'asc' | 'desc';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  institutionId?: number | null;
  departmentId?: number | null;
  complianceStatus?: string;
  requestStatus?: string;
  recipientType?: string;
}

export interface DocumentOwnerComplianceReportRow {
  documentOwner: string;
  email: string;
  entityType: string;
  complianceStatus: string;
  uploadedDocuments: number;
  missingDocuments: number;
  lastUploadDate: string | null;
  compliancePercentage: number;
  riskRating: string;
  departmentId: number;
  department: string;
  institutionId: number;
  institution: string;
  missingDocumentNames: string[];
}

export interface InstitutionDocumentRequestReportRow {
  requestId: number;
  institution: string;
  recipient: string;
  recipientType: string;
  requestDate: string;
  submissionDeadline: string | null;
  referenceNumber: string;
  requestJustification: string;
  status: string;
  approvalDenialDate: string | null;
  requestedDocuments: string[];
  institutionId: number;
  departmentId: number | null;
}

export interface DepartmentComplianceReportRow {
  departmentId: number;
  department: string;
  departmentAdmin: string;
  requiredDocuments: number;
  uploadedDocuments: number;
  missingDocuments: number;
  compliancePercentage: number;
  riskRating: string;
  institutionId: number;
  institution: string;
}

export interface InstitutionRequestControlBreakGroup {
  institutionId: number;
  institution: string;
  totalRequests: number;
  approved: number;
  pending: number;
  denied: number;
  requests: InstitutionDocumentRequestReportRow[];
}

export interface DepartmentComplianceControlBreakDetail {
  documentOwner: string;
  complianceStatus: string;
  uploadedDocuments: number;
  missingDocuments: number;
  compliancePercentage: number;
  riskRating: string;
}

export interface DepartmentComplianceControlBreakGroup {
  departmentId: number;
  department: string;
  departmentAdmin: string;
  institution: string;
  requiredDocuments: number;
  uploadedDocuments: number;
  missingDocuments: number;
  compliancePercentage: number;
  details: DepartmentComplianceControlBreakDetail[];
}

export interface DepartmentDocumentInventoryReportRow {
  departmentId: number;
  department: string;
  departmentAdmin: string;
  institution: string;
  requiredDocument: string;
  isUploaded: boolean;
  uploadDate: string | null;
  requiredDocuments: number;
  uploadedDocuments: number;
  missingDocuments: number;
  compliancePercentage: number;
  riskRating: string;
}

export interface InstitutionAccessHistoryReportRow {
  requestId: number;
  institution: string;
  recipient: string;
  recipientType: string;
  accessGrantedDate: string | null;
  accessExpiry: string | null;
  accessStatus: string;
  documentsAccessed: string[];
}

export interface ExpiringDocumentsReportRow {
  owner: string;
  department: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
}

export interface OutstandingComplianceReportRow {
  entityType: string;
  name: string;
  department: string;
  institution: string;
  missingDocuments: number;
  compliancePercentage: number;
  riskRating: string;
  outstandingRequirements: string[];
}

/** A document owner the per-owner reports (history, activity, certificate) can be run for. */
export interface ReportOwnerOption {
  userId: string;
  name: string;
  entityType: string;
  overallStatus: string;
}

export type RiskRatingLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Not assessed';

export interface RiskRatingProfile {
  userId: string;
  name: string;
  entityType: string;
  riskLevel: RiskRatingLevel;
  riskScore: number | null;
  compliancePercentage: number | null;
  overallStatus: string;
  isPep: boolean;
  /** Why the owner is at this level, e.g. "2 expired documents". */
  factors: string[];
  lastChecked: string | null;
}

export interface RiskRatingReport {
  reportId: string;
  dateGenerated: string;
  totalProfiles: number;
  assessedProfiles: number;
  averageRiskScore: number;
  pepCount: number;
  strata: { level: RiskRatingLevel; profiles: RiskRatingProfile[] }[];
}

export interface SystemAuditEvent {
  timestamp: string;
  action: string;
  description: string;
  requestId: number | null;
  needsAttention: boolean;
}

export interface SystemAuditInstitution {
  institutionId: number;
  institutionName: string;
  requests: number;
  approved: number;
  denied: number;
  waiting: number;
  cancelled: number;
  downloads: number;
  flags: number;
  needsAttention: number;
  events: SystemAuditEvent[];
}

export interface SystemAuditReport {
  reportId: string;
  dateGenerated: string;
  periodFrom: string;
  periodTo: string;
  totalEvents: number;
  totalRequests: number;
  totalDownloads: number;
  totalNeedingAttention: number;
  institutions: SystemAuditInstitution[];
}

export interface ComplianceCertificate {
  certificateId: string;
  dateGenerated: string;
  ownerName: string;
  entityType: string;
  identification: string;
  isCompliant: boolean;
  overallStatus: string;
  compliancePercentage: number;
  riskLevel: string;
  lastChecked: string | null;
  validUntil: string | null;
  issues: string[];
  documents: { typeName: string; fileName: string; status: string; expiryDate: string }[];
  verificationHash: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reports`;

  getDocumentOwnerComplianceReport(
    filters: ReportFilters,
    sortBy = 'documentOwner',
    sortDirection: SortDirection = 'asc'
  ): Observable<DocumentOwnerComplianceReportRow[]> {
    return this.http.get<DocumentOwnerComplianceReportRow[]>(`${this.base}/document-owner-compliance`, {
      params: this.withSorting(this.buildParams(filters, {
        complianceStatus: filters.complianceStatus,
      }), sortBy, sortDirection),
    });
  }

  getInstitutionDocumentRequestReport(
    filters: ReportFilters,
    sortBy = 'requestDate',
    sortDirection: SortDirection = 'desc'
  ): Observable<InstitutionDocumentRequestReportRow[]> {
    return this.http.get<InstitutionDocumentRequestReportRow[]>(`${this.base}/institution-document-requests`, {
      params: this.withSorting(this.buildParams(filters, {
        status: filters.requestStatus,
        recipientType: filters.recipientType,
      }), sortBy, sortDirection),
    });
  }

  getDepartmentComplianceReport(
    filters: ReportFilters,
    sortBy = 'department',
    sortDirection: SortDirection = 'asc'
  ): Observable<DepartmentComplianceReportRow[]> {
    return this.http.get<DepartmentComplianceReportRow[]>(`${this.base}/department-compliance`, {
      params: this.withSorting(this.buildParams(filters, {
        complianceStatus: filters.complianceStatus,
      }), sortBy, sortDirection),
    });
  }

  getDocumentRequestsByInstitutionControlBreak(filters: ReportFilters): Observable<InstitutionRequestControlBreakGroup[]> {
    return this.http.get<InstitutionRequestControlBreakGroup[]>(`${this.base}/control-break/document-requests-by-institution`, {
      params: this.buildParams(filters, {
        status: filters.requestStatus,
        recipientType: filters.recipientType,
      }),
    });
  }

  getComplianceByDepartmentControlBreak(filters: ReportFilters): Observable<DepartmentComplianceControlBreakGroup[]> {
    return this.http.get<DepartmentComplianceControlBreakGroup[]>(`${this.base}/control-break/compliance-by-department`, {
      params: this.buildParams(filters, {
        complianceStatus: filters.complianceStatus,
      }),
    });
  }

  getDepartmentDocumentInventoryReport(
    filters: ReportFilters,
    sortBy = 'department',
    sortDirection: SortDirection = 'asc'
  ): Observable<DepartmentDocumentInventoryReportRow[]> {
    return this.http.get<DepartmentDocumentInventoryReportRow[]>(`${this.base}/department-document-inventory`, {
      params: this.withSorting(this.buildParams(filters, {}), sortBy, sortDirection),
    });
  }

  getInstitutionAccessHistoryReport(
    filters: ReportFilters,
    sortBy = 'accessGrantedDate',
    sortDirection: SortDirection = 'desc'
  ): Observable<InstitutionAccessHistoryReportRow[]> {
    return this.http.get<InstitutionAccessHistoryReportRow[]>(`${this.base}/institution-access-history`, {
      params: this.withSorting(this.buildParams(filters, {}), sortBy, sortDirection),
    });
  }

  getExpiringDocumentsReport(
    filters: ReportFilters,
    sortBy = 'daysRemaining',
    sortDirection: SortDirection = 'asc'
  ): Observable<ExpiringDocumentsReportRow[]> {
    return this.http.get<ExpiringDocumentsReportRow[]>(`${this.base}/expiring-documents`, {
      params: this.withSorting(this.buildParams(filters, {}), sortBy, sortDirection),
    });
  }

  getOutstandingComplianceReport(
    filters: ReportFilters,
    sortBy = 'missingDocuments',
    sortDirection: SortDirection = 'desc'
  ): Observable<OutstandingComplianceReportRow[]> {
    return this.http.get<OutstandingComplianceReportRow[]>(`${this.base}/outstanding-compliance`, {
      params: this.withSorting(this.buildParams(filters, {}), sortBy, sortDirection),
    });
  }

  private buildParams(filters: ReportFilters, extras: Record<string, string | undefined>): HttpParams {
    let params = new HttpParams();

    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.institutionId) params = params.set('institutionId', String(filters.institutionId));
    if (filters.departmentId) params = params.set('departmentId', String(filters.departmentId));

    for (const [key, value] of Object.entries(extras)) {
      if (value && value.trim().length > 0) {
        params = params.set(key, value.trim());
      }
    }

    return params;
  }

  private withSorting(params: HttpParams, sortBy: string, sortDirection: SortDirection): HttpParams {
    return params
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);
  }

  getDocumentOwners(): Observable<ReportOwnerOption[]> {
    return this.http.get<ReportOwnerOption[]>(`${this.base}/document-owners`);
  }

  getClientRiskRating(): Observable<RiskRatingReport> {
    return this.http.get<RiskRatingReport>(`${this.base}/client-risk-rating`);
  }

  getSystemAudit(from?: string, to?: string): Observable<SystemAuditReport> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<SystemAuditReport>(`${this.base}/system-audit`, { params });
  }

  getComplianceCertificate(userId: string): Observable<ComplianceCertificate> {
    return this.http.get<ComplianceCertificate>(`${this.base}/compliance-certificate/${encodeURIComponent(userId)}`);
  }
}
