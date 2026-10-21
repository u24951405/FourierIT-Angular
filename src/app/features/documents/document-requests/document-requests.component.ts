import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { forkJoin } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentsApiService } from '../../../core/services/documents-api.service';
import { Router } from '@angular/router';
import {
  PendingDocumentAccessRequest,
  PendingDepartmentAccessRequest,
  RequestDocumentStatus,
  RequestDocumentsResponse,
} from '../../../core/models/institution.models';

interface CombinedRequest {
  id: number;
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  requestType: 'owner' | 'department';
  targetType: 'Individual' | 'Department';
  departmentName?: string;
  senderName: string;
  senderType: 'Institution';
  recipientName: string;
  recipientType: 'Individual' | 'Department';
  status: string;
  purposeNote: string;
  requestDate: string;
  documents: Array<{
    documentTypeId: number;
    documentTypeName: string;
    isMandatory: boolean;
    ficaRuleId?: number;
  }>;
}

@Component({
  selector: 'app-document-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-requests.component.html',
  styleUrl: './document-requests.component.scss',
})
export class DocumentRequestsComponent implements OnInit {
  private requestService = inject(DocumentAccessRequestService);
  private documentsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly requests = signal<CombinedRequest[]>([]);
  readonly userRoles = signal<string[]>([]);
  readonly departmentId = signal<number | null>(null);
  readonly expandedRequestId = signal<number | null>(null);
  readonly selectedInstitutionId = signal<number | null>(null);
  readonly selectedInstitutionName = signal<string | null>(null);
  readonly requestDetails = signal<Record<number, RequestDocumentsResponse>>({});
  readonly loadingDetails = signal(false);
  readonly preview = signal<{ name: string; url: string } | null>(null);

  readonly institutionGroups = computed(() => {
    const groups = new Map<number, { institutionId: number; institutionName: string; requests: CombinedRequest[] }>();
    for (const request of this.requests()) {
      const group = groups.get(request.institutionId) ?? {
        institutionId: request.institutionId,
        institutionName: request.institutionName,
        requests: [],
      };
      group.requests.push(request);
      groups.set(request.institutionId, group);
    }
    return [...groups.values()].map(group => {
      const details = group.requests.flatMap(request => this.requestDetails()[request.enquiryRequestId]?.documents ?? []);
      const requestedCount = group.requests.reduce((count, request) => count + request.documents.length, 0);
      const uploadedCount = details.filter(document => document.status !== 'Missing').length;
      return { ...group, requestedCount, uploadedCount, missingCount: Math.max(requestedCount - uploadedCount, 0) };
    });
  });

  readonly selectedDocuments = computed<RequestDocumentStatus[]>(() => {
    const institutionId = this.selectedInstitutionId();
    if (institutionId == null) return [];
    return this.requests()
      .filter(request => request.institutionId === institutionId)
      .flatMap(request => this.requestDetails()[request.enquiryRequestId]?.documents ?? []);
  });

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAllRequests();
  }

  /**
   * Only the person (or department) a request is addressed to can approve or deny it; the API refuses
   * everyone else. The Super Admin can see every request here, so for them the page is view-only.
   */
  get isViewOnly(): boolean {
    return this.auth.isSuperAdmin();
  }

  private loadUserInfo(): void {
    this.userRoles.set(this.auth.getUserRoles());
  }

  loadAllRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    const token = this.auth.getToken();
    const isSuperAdmin = this.auth.isSuperAdmin();
    const isDocumentOwner = this.auth.hasRole('Document Owner') || isSuperAdmin;
    const isDepartmentAdmin = this.auth.hasRole('Department Admin') || isSuperAdmin;

    const requests = [];

    if (isDocumentOwner) {
      requests.push(
        this.requestService
          .getPendingRequests()
          .pipe(
            finalize(() => {})
          )
      );
    }

    if (isDepartmentAdmin) {
      requests.push(
        this.requestService
          .getPendingDepartmentRequests()
          .pipe(
            finalize(() => {})
          )
      );
    }

    if (!token) {
      this.loading.set(false);
      this.error.set('Please sign in to view document requests.');
      return;
    }

    if (requests.length === 0) {
      this.loading.set(false);
      this.error.set('You do not have permission to view document requests.');
      return;
    }

    forkJoin(requests)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (results) => {
          const combined = this.combineRequests(results, isDocumentOwner, isDepartmentAdmin);
          this.requests.set(combined);
        },
        error: (err) => {
          const message =
            err?.error?.error ?? err?.error?.message ?? 'Could not load document requests.';
          this.error.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  private combineRequests(
    results: any[],
    isDocumentOwner: boolean,
    isDepartmentAdmin: boolean
  ): CombinedRequest[] {
    const combined: CombinedRequest[] = [];
    let resultIndex = 0;

    if (isDocumentOwner && results[resultIndex]) {
      const ownerRequests = results[resultIndex] || [];
      ownerRequests.forEach((req: PendingDocumentAccessRequest) => {
        combined.push({
          id: combined.length,
          enquiryRequestId: req.enquiryRequestId,
          institutionId: req.institutionId,
          institutionName: req.institutionName,
          requestType: 'owner',
          targetType: 'Individual',
          senderName: req.senderName || req.institutionName || 'Institution',
          senderType: 'Institution',
          recipientName: req.recipientName || 'Recipient not provided',
          recipientType: req.recipientType || 'Individual',
          status: req.status,
          purposeNote: req.purposeNote,
          requestDate: req.requestDate,
          documents: req.documents,
        });
      });
      resultIndex++;
    }

    if (isDepartmentAdmin && results[resultIndex]) {
      const deptRequests = results[resultIndex] || [];
      deptRequests.forEach((req: PendingDepartmentAccessRequest) => {
        combined.push({
          id: combined.length,
          enquiryRequestId: req.enquiryRequestId,
          institutionId: req.institutionId,
          institutionName: req.institutionName,
          requestType: 'department',
          targetType: 'Department',
          departmentName: req.departmentName,
          senderName: req.senderName || req.institutionName || 'Institution',
          senderType: 'Institution',
          recipientName: req.recipientName || req.departmentName || 'Department',
          recipientType: req.recipientType || 'Department',
          status: req.status,
          purposeNote: req.purposeNote,
          requestDate: req.requestDate,
          documents: req.documents,
        });
      });
    }

    // Sort by request date (newest first)
    return combined.sort(
      (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
  }

  approveRequest(request: CombinedRequest): void {
    const requestedTypes = request.documents.map(document => document.documentTypeName).join(', ');
    const message = `Approve this request from ${request.institutionName}? This grants access to all of your documents in the requested type(s): ${requestedTypes}. It does not grant access to selected files only.`;
    if (!confirm(message)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .approveRequest(request.enquiryRequestId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('Request approved successfully!', 'success');
          this.loadAllRequests();
        },
        error: (err) => {
          const missingDocumentTypeIds: number[] | undefined = err?.error?.missingDocumentTypeIds;
          const errorMessage = missingDocumentTypeIds?.length
            ? `${err.error.error} Missing: ${this.describeDocumentTypes(request, missingDocumentTypeIds)}.`
            : err?.error?.error ?? err?.error?.message ?? 'Could not approve the request.';
          this.error.set(errorMessage);
          this.toast.show(errorMessage, 'error');
        },
      });
  }

  private describeDocumentTypes(request: CombinedRequest, documentTypeIds: number[]): string {
    return documentTypeIds
      .map(id => request.documents.find(doc => doc.documentTypeId === id)?.documentTypeName ?? `Type #${id}`)
      .join(', ');
  }

  denyRequest(request: CombinedRequest): void {
    const message = `Deny this request from ${request.institutionName}?`;
    if (!confirm(message)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .denyRequest(request.enquiryRequestId, { userResponseNote: 'Request denied.' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('Request denied successfully!', 'success');
          this.loadAllRequests();
        },
        error: (err) => {
          const errorMessage =
            err?.error?.error ?? err?.error?.message ?? 'Could not deny the request.';
          this.error.set(errorMessage);
          this.toast.show(errorMessage, 'error');
        },
      });
  }

  getRequestTypeLabel(request: CombinedRequest): string {
    return request.requestType === 'owner'
      ? 'Individual Document Request'
      : 'Department Request';
  }

  getRequestTarget(request: CombinedRequest): string {
    return request.requestType === 'owner'
      ? 'You'
      : `${request.departmentName || 'Department'}`;
  }

  getSenderLabel(request: CombinedRequest): string {
    return `Submitted by ${request.senderName || request.institutionName || 'Institution'}`;
  }

  getRecipientLabel(request: CombinedRequest): string {
    return `Requested for ${request.recipientName || (request.requestType === 'department' ? request.departmentName || 'Department' : 'Recipient')}`;
  }

  toggleRequestDetails(request: CombinedRequest): void {
    this.expandedRequestId.set(
      this.expandedRequestId() === request.enquiryRequestId ? null : request.enquiryRequestId
    );
  }

  isRequestExpanded(request: CombinedRequest): boolean {
    return this.expandedRequestId() === request.enquiryRequestId;
  }

  selectInstitution(group: { institutionId: number; institutionName: string; requests: CombinedRequest[] }): void {
    this.selectedInstitutionId.set(group.institutionId);
    this.selectedInstitutionName.set(group.institutionName);
    this.loadingDetails.set(true);
    const requestIds = [...new Set(group.requests.map(request => request.enquiryRequestId))];
    forkJoin(requestIds.map(requestId => this.requestService.getRequestDocuments(requestId)))
      .pipe(finalize(() => this.loadingDetails.set(false)))
      .subscribe({
        next: responses => this.requestDetails.update(current => ({
          ...current,
          ...Object.fromEntries(responses.map(response => [response.enquiryRequestId, response]))
        })),
        error: err => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not load the documents for this institution.';
          this.toast.show(message, 'error');
        }
      });
  }

  closeInstitution(): void {
    this.closePreview();
    this.selectedInstitutionId.set(null);
    this.selectedInstitutionName.set(null);
  }

  statusLabel(status: RequestDocumentStatus['status']): string {
    return status === 'Missing' ? 'Not yet uploaded' : status;
  }

  openDocument(document: RequestDocumentStatus): void {
    if (document.documentId == null) return;
    this.documentsApi.previewDocument(document.documentId).subscribe({
      next: blob => {
        this.closePreview();
        this.preview.set({ name: document.documentName ?? document.documentTypeName, url: URL.createObjectURL(blob) });
      },
      error: () => this.toast.show('The document could not be previewed.', 'error')
    });
  }

  closePreview(): void {
    const current = this.preview();
    if (current) URL.revokeObjectURL(current.url);
    this.preview.set(null);
  }

  uploadDocument(document: RequestDocumentStatus): void {
    const request = this.requests().find(item => item.institutionId === this.selectedInstitutionId());
    if (!request) return;
    void this.router.navigate(['/documents/upload'], {
      queryParams: {
        requestId: request.enquiryRequestId,
        institutionId: request.institutionId,
        documentTypeId: document.documentTypeId,
        documentId: document.documentId ?? null
      }
    });
  }
}
