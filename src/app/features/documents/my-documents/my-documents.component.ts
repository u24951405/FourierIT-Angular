import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  DocumentAccessApprovalItem,
  DocumentDetailItem,
  DocumentListItem,
  DocumentsApiService,
} from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-documents.component.html',
  styleUrls: ['./my-documents.component.scss', '../../../features/dashboard/dashboard/dashboard.component.scss'],
})
export class MyDocumentsComponent {
  private router = inject(Router);
  private docsApi = inject(DocumentsApiService);
  private requestService = inject(DocumentAccessRequestService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly detailDocument = signal<DocumentDetailItem | null>(null);
  readonly loadingDetail = signal(false);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequestsError = signal<string | null>(null);
  readonly accessLoading = signal(false);
  readonly accessError = signal<string | null>(null);
  readonly accessApprovals = signal<DocumentAccessApprovalItem[]>([]);
  readonly selectedEditFile = signal<File | null>(null);
  readonly savingEdit = signal(false);
  readonly blockedDeletionDocument = signal<any | null>(null);
  readonly blockedDeletionError = signal<string | null>(null);
  readonly blockedDeletionApprovals = signal<DocumentAccessApprovalItem[]>([]);

  readonly documentCount = computed(() => this.documents().length);
  readonly approvedDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'approved').length);
  readonly rejectedDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'rejected').length);
  readonly pendingRequestCount = computed(() => this.pendingRequests().length);
  readonly documentsPendingReviewCount = computed(() => this.documents().filter(doc => {
    const status = doc.currentStatus?.toLowerCase() ?? '';
    return status === 'pending' || status === 'under review' || status === 'awaiting verification';
  }).length);
  readonly expiringDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'expiring' || doc.currentStatus?.toLowerCase() === 'expires soon').length);
  readonly compliancePercentage = computed(() => {
    const total = this.documents().length;
    return total === 0 ? 0 : Math.round((this.approvedDocumentCount() / total) * 100);
  });
  readonly recentDocuments = computed(() => [...this.documents()].sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()).slice(0, 5));
  readonly unreviewedDocumentCount = computed(() => {
    const total = this.documents().length;
    const counted = this.approvedDocumentCount() + this.documentsPendingReviewCount() + this.rejectedDocumentCount();
    return Math.max(total - counted, 0);
  });
  readonly complianceRate = computed(() => {
    const total = this.documents().length;
    return total === 0 ? 0 : Math.round((this.approvedDocumentCount() / total) * 100);
  });
  readonly complianceRateDelta = computed(() => '+6% vs last month');
  readonly categoryCounts = computed(() => {
    const counts = { kyc: 0, fica: 0, tax: 0, other: 0 };
    this.documents().forEach(doc => {
      const name = (doc.documentTypeName || '').toLowerCase();
      if (name.includes('kyc')) counts.kyc += 1;
      else if (name.includes('fica')) counts.fica += 1;
      else if (name.includes('tax')) counts.tax += 1;
      else counts.other += 1;
    });
    return counts;
  });
  readonly recentComplianceChecks = computed(() =>
    [...this.documents()]
      .sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime())
      .slice(0, 5)
  );
  readonly latestRequests = computed(() => this.pendingRequests().slice(0, 5));

  ngOnInit(): void {
    this.loadDocuments();
    this.loadPendingRequests();
  }

  get filteredDocuments(): DocumentListItem[] {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.documents();
    return this.documents().filter(doc => {
      const fileName = doc.fileName?.toLowerCase() ?? '';
      const typeName = doc.documentTypeName?.toLowerCase() ?? '';
      const status = doc.currentStatus?.toLowerCase() ?? '';
      return fileName.includes(query) || typeName.includes(query) || status.includes(query);
    });
  }

  openTemporaryUploadPage(): void {
    this.router.navigate(['/documents/upload']);
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  download(doc: DocumentListItem): void {
    this.docsApi.downloadDocument(doc.documentId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.show(`Could not download ${doc.fileName}.`, 'error')
    });
  }

  openDetails(doc: DocumentListItem): void {
    this.loadingDetail.set(true);
    this.detailDocument.set(null);
    this.accessLoading.set(true);
    this.accessError.set(null);
    this.accessApprovals.set([]);

    this.docsApi.getDocumentById(doc.documentId)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: detail => {
          this.detailDocument.set(detail);
          this.loadDocumentAccess(detail.documentId);
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load document details.';
          this.toast.show(message, 'error');
          this.accessLoading.set(false);
        }
      });
  }

  closeDetail(): void {
    this.detailDocument.set(null);
    this.accessError.set(null);
    this.accessApprovals.set([]);
  }

  onEditFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0] ?? null;
    this.selectedEditFile.set(file);
  }

  saveDocumentEdit(): void {
    const document = this.detailDocument();
    const file = this.selectedEditFile();
    if (!document || !file) {
      this.toast.show('Choose a file before updating the document.', 'error');
      return;
    }

    this.savingEdit.set(true);
    this.docsApi.updateDocument(document.documentId, {
      file,
      documentTypeId: document.documentTypeId,
      isCertified: document.isCertified,
      entityTypeId: null,
    })
      .pipe(finalize(() => this.savingEdit.set(false)))
      .subscribe({
        next: updated => {
          this.detailDocument.set(updated);
          this.selectedEditFile.set(null);
          this.toast.show('Document updated.', 'success');
          this.loadDocuments();
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not update the document.';
          this.toast.show(message, 'error');
        }
      });
  }

  revokeDocumentAccess(approvalId: number): void {
    const documentId = this.detailDocument()?.documentId;
    if (!documentId) return;

    this.docsApi.revokeDocumentAccess(documentId, approvalId).subscribe({
      next: () => {
        this.accessApprovals.update(list => list.filter(item => item.approvalId !== approvalId));
        this.toast.show('Access approval revoked.', 'success');
      },
      error: err => {
        const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not revoke access approval.';
        this.toast.show(message, 'error');
      }
    });
  }

  delete(doc: DocumentListItem): void {
    if (!confirm(`Delete ${doc.fileName}?`)) return;

    this.docsApi.deleteDocument(doc.documentId).subscribe({
      next: () => {
        this.documents.update(list => list.filter(item => item.documentId !== doc.documentId));
        this.toast.show('Document deleted.', 'success');
      },
      error: err => {
        const payload = err?.error ?? {};
        const errorMessage = payload.error ?? payload.message ?? payload.title ?? 'Could not delete document.';

        if (err?.status === 409 || (typeof payload === 'object' && Array.isArray(payload.approvals))) {
          this.blockedDeletionDocument.set({
            documentId: doc.documentId,
            fileName: doc.fileName,
            documentTypeName: doc.documentTypeName,
          });
          this.blockedDeletionError.set(errorMessage);
          this.blockedDeletionApprovals.set(Array.isArray(payload.approvals) ? payload.approvals : []);
          return;
        }

        this.toast.show(errorMessage, 'error');
      }
    });
  }

  closeBlockedDeletionModal(): void {
    this.blockedDeletionDocument.set(null);
    this.blockedDeletionError.set(null);
    this.blockedDeletionApprovals.set([]);
  }

  private loadDocumentAccess(documentId: number): void {
    this.accessLoading.set(true);
    this.accessError.set(null);

    this.docsApi.getDocumentAccess(documentId)
      .pipe(finalize(() => this.accessLoading.set(false)))
      .subscribe({
        next: approvals => {
          this.accessApprovals.set(approvals ?? []);
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load access details.';
          this.accessApprovals.set([]);
          this.accessError.set(message);
        }
      });
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: docs => this.documents.set(docs ?? []),
        error: err => {
          this.documents.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
        }
      });
  }

  private loadPendingRequests(): void {
    this.pendingRequestsLoading.set(true);
    this.pendingRequestsError.set(null);

    this.requestService.getPendingRequests()
      .pipe(finalize(() => this.pendingRequestsLoading.set(false)))
      .subscribe({
        next: requests => this.pendingRequests.set(requests ?? []),
        error: err => {
          this.pendingRequests.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load pending requests.';
          this.pendingRequestsError.set(message);
        }
      });
  }
}

