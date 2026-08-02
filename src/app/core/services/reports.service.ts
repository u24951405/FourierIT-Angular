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
      params: this.withSorting(this.buildParams(filters, { status: filters.requestStatus }), sortBy, sortDirection),
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
}
