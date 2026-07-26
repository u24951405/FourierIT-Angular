import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { forkJoin } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  PendingDocumentAccessRequest,
  PendingDepartmentAccessRequest,
} from '../../../core/models/institution.models';

interface CombinedRequest {
  id: number;
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  requestType: 'owner' | 'department';
  targetType: 'Individual' | 'Department';
  departmentName?: string;
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
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly requests = signal<CombinedRequest[]>([]);
  readonly userRoles = signal<string[]>([]);
  readonly departmentId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAllRequests();
  }

  private loadUserInfo(): void {
    this.userRoles.set(this.auth.getUserRoles());
  }

  loadAllRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    const isDocumentOwner = this.userRoles().some(
      (r) => r.trim().toLowerCase() === 'document owner'
    );
    const isDepartmentAdmin = this.userRoles().some(
      (r) => r.trim().toLowerCase() === 'department admin'
    );

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
    const message = `Approve this request from ${request.institutionName}?`;
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
          const errorMessage =
            err?.error?.error ?? err?.error?.message ?? 'Could not approve the request.';
          this.error.set(errorMessage);
          this.toast.show(errorMessage, 'error');
        },
      });
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
}
