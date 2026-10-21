import { Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  DocumentAccessApprovalItem,
  DocumentDetailItem,
  DocumentFlagItem,
  DocumentListItem,
  DocumentsApiService,
} from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { ToastService } from '../../../core/services/toast.service';
import { buildDocumentCalendarEvents, CalendarEvent } from './calendar-events';
import { ComplianceService } from '../../../core/services/compliance.service';
import { DocumentHierarchyTreeComponent } from '../../../shared/components/document-hierarchy-tree/document-hierarchy-tree.component';
import { DocumentItemDto } from '../../../core/services/document-hierarchy.service';

const REPLACE_TIMEOUT_MS = 120_000;

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule, DocumentHierarchyTreeComponent],
  templateUrl: './my-documents.component.html',
  styleUrls: ['./my-documents.component.scss', '../../../features/dashboard/dashboard/dashboard.component.scss'],
})
export class MyDocumentsComponent {
  @ViewChild(DocumentHierarchyTreeComponent) private hierarchyTree?: DocumentHierarchyTreeComponent;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private docsApi = inject(DocumentsApiService);
  private requestService = inject(DocumentAccessRequestService);
  private complianceService = inject(ComplianceService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly detailDocument = signal<DocumentDetailItem | null>(null);
  readonly loadingDetail = signal(false);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewRawUrl = signal<string | null>(null);
  readonly previewName = signal<string | null>(null);
  readonly previewType = signal<'pdf' | 'image' | 'other'>('other');
  readonly previewLoading = signal(false);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequestsError = signal<string | null>(null);
  readonly warningThresholdDays = signal<number | null>(null);
  readonly accessLoading = signal(false);
  readonly accessError = signal<string | null>(null);
  readonly accessApprovals = signal<DocumentAccessApprovalItem[]>([]);
  readonly selectedEditFile = signal<File | null>(null);
  readonly savingEdit = signal(false);
  readonly blockedDeletionDocument = signal<any | null>(null);
  readonly blockedDeletionError = signal<string | null>(null);
  readonly blockedDeletionApprovals = signal<DocumentAccessApprovalItem[]>([]);
  readonly allFlags = signal<DocumentFlagItem[]>([]);
  readonly resolvingFlagId = signal<number | null>(null);
  // Set when a notification links here (?document=<id>); opened once the documents have loaded.
  private pendingDetailDocumentId: number | null = null;
  readonly detailIsRejected = computed(() => this.detailDocument()?.reviewStatus === 'Rejected');

  readonly flaggedDocumentIds = computed(() => new Set(this.allFlags().filter(f => !f.isResolved).map(f => f.documentId)));
  readonly detailFlags = computed(() => {
    const doc = this.detailDocument();
    if (!doc) return [];
    return this.allFlags().filter(f => f.documentId === doc.documentId);
  });

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
  readonly calendarDays = computed(() => this.buildCalendarDays(this.calendarMonth()));
  // Upload, certification and expiry dates for the month shown. The warning period only colours expiries.
  readonly calendarEvents = computed(() =>
    buildDocumentCalendarEvents(this.documents(), this.calendarMonth(), new Date(), this.warningThresholdDays() ?? 30)
  );
  readonly calendarSummary = computed(() => {
    const events = this.calendarEvents();
    return {
      uploaded: events.filter(item => item.type === 'uploaded').length,
      certified: events.filter(item => item.type === 'certified').length,
      expiring: events.filter(item => item.type === 'expiry' && item.expiryState !== 'scheduled').length,
      expiries: events.filter(item => item.type === 'expiry').length
    };
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('document'));
        if (!Number.isInteger(id) || id <= 0) return;
        this.pendingDetailDocumentId = id;
        this.openPendingDetail();
      });
    this.loadDocuments();
    this.loadPendingRequests();
    this.loadFlags();
    this.loadWarningThreshold();
  }

  isDocumentFlagged(doc: DocumentListItem): boolean {
    return this.flaggedDocumentIds().has(doc.documentId);
  }

  private loadFlags(): void {
    this.docsApi.getMyDocumentFlags().subscribe({
      next: flags => this.allFlags.set(flags ?? []),
      error: () => this.allFlags.set([]),
    });
  }

  /** What the owner did about each flag; sent to the institution that raised it. */
  readonly flagNotes = signal<Record<number, string>>({});

  flagNote(flagId: number): string {
    return this.flagNotes()[flagId] ?? '';
  }

  setFlagNote(flagId: number, value: string): void {
    this.flagNotes.update(notes => ({ ...notes, [flagId]: value }));
  }

  resolveFlag(flag: DocumentFlagItem): void {
    this.resolvingFlagId.set(flag.enquiryFlagId);
    this.docsApi.resolveDocumentFlag(flag.documentId, flag.enquiryFlagId, this.flagNote(flag.enquiryFlagId))
      .pipe(finalize(() => this.resolvingFlagId.set(null)))
      .subscribe({
        next: () => {
          this.allFlags.update(list => list.map(f =>
            f.enquiryFlagId === flag.enquiryFlagId ? { ...f, isResolved: true } : f
          ));
          this.toast.show('Flag marked as resolved. The institution has been told.', 'success');
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not resolve the flag.';
          this.toast.show(message, 'error');
        }
      });
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

  previousMonth(): void {
    const monthDate = this.calendarMonth();
    this.calendarMonth.set(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const monthDate = this.calendarMonth();
    this.calendarMonth.set(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
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
      error: err => {
        const message = typeof err?.error === 'string'
          ? err.error
          : err?.error?.message ?? err?.error?.error ?? err?.error?.title ?? `Could not download ${doc.fileName}.`;
        this.toast.show(message, 'error');
      }
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

  openEventDocument(event: CalendarEvent): void {
    const document = this.documents().find(item => item.documentId === event.documentId);
    if (document) {
      this.openDetails(document);
    }
  }

  openPreview(doc: DocumentListItem): void {
    this.previewLoading.set(true);
    this.previewName.set(doc.fileName);
    this.previewType.set(this.getPreviewType(doc.fileName));
    this.previewUrl.set(null);
    this.previewRawUrl.set(null);

    this.docsApi.previewDocument(doc.documentId).subscribe({
      next: blob => {
        const fileBlob = blob.type ? blob : new Blob([blob], { type: this.getMimeType(doc.fileName) });
        const rawUrl = URL.createObjectURL(fileBlob);
        this.previewRawUrl.set(rawUrl);
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl));
        this.previewLoading.set(false);
      },
      error: err => {
        this.previewUrl.set(null);
        this.previewRawUrl.set(null);
        this.previewLoading.set(false);
        const message = typeof err?.error === 'string'
          ? err.error
          : err?.error?.message ?? err?.error?.error ?? err?.error?.title ?? `Could not preview ${doc.fileName}.`;
        this.toast.show(message, 'error');
      }
    });
  }

  closePreview(): void {
    const currentUrl = this.previewRawUrl();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    this.previewRawUrl.set(null);
    this.previewUrl.set(null);
    this.previewName.set(null);
    this.previewType.set('other');
    this.previewLoading.set(false);
  }

  openPreviewInNewTab(): void {
    const currentUrl = this.previewRawUrl();
    if (!currentUrl) return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
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

    const wasRejected = document.reviewStatus === 'Rejected';
    this.savingEdit.set(true);
    this.docsApi.updateDocument(document.documentId, {
      file,
      documentTypeId: document.documentTypeId,
      isCertified: document.isCertified,
      entityTypeId: null,
    })
      // Never leave the button spinning forever if the server stalls.
      .pipe(timeout(REPLACE_TIMEOUT_MS), finalize(() => this.savingEdit.set(false)))
      .subscribe({
        next: updated => {
          this.detailDocument.set(updated);
          this.selectedEditFile.set(null);
          this.toast.show(
            wasRejected
              ? 'New file uploaded and resubmitted for compliance review.'
              : 'Document updated. The new file has been sent for compliance review.',
            'success'
          );
          this.loadDocuments();
        },
        error: err => {
          const message = err instanceof TimeoutError
            ? 'The server took too long to save the new file. Refresh the page to check whether it was saved before trying again.'
            : err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not update the document.';
          this.toast.show(message, 'error');
        }
      });
  }

  revokeDocumentAccess(approvalId: number): void {
    const documentId = this.detailDocument()?.documentId ?? this.blockedDeletionDocument()?.documentId;
    if (!documentId) return;

    this.docsApi.revokeDocumentAccess(documentId, approvalId).subscribe({
      next: () => {
        this.accessApprovals.update(list => list.filter(item => item.approvalId !== approvalId));
        this.blockedDeletionApprovals.update(list => list.filter(item => item.approvalId !== approvalId));
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

  private buildCalendarDays(monthDate: Date): Date[] {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startDay = start.getDay();
    const offset = (startDay + 6) % 7;
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - offset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }

    return days;
  }

  formatCalendarDate(value: Date): string {
    return this.toIsoDate(value);
  }

  private getPreviewType(fileName: string): 'pdf' | 'image' | 'other' {
    const lowered = fileName.toLowerCase();
    if (lowered.endsWith('.pdf')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lowered)) return 'image';
    return 'other';
  }

  private getMimeType(fileName: string): string {
    const lowered = fileName.toLowerCase();
    if (lowered.endsWith('.pdf')) return 'application/pdf';
    if (lowered.endsWith('.png')) return 'image/png';
    if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg';
    if (lowered.endsWith('.gif')) return 'image/gif';
    if (lowered.endsWith('.webp')) return 'image/webp';
    if (lowered.endsWith('.bmp')) return 'image/bmp';
    if (lowered.endsWith('.svg')) return 'image/svg+xml';
    if (lowered.endsWith('.txt')) return 'text/plain';
    if (lowered.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lowered.endsWith('.doc')) return 'application/msword';
    if (lowered.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/octet-stream';
  }

  private toIsoDate(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: docs => {
          this.documents.set(docs ?? []);
          this.openPendingDetail();
        },
        error: err => {
          this.documents.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
        }
      });
  }

  private openPendingDetail(): void {
    const id = this.pendingDetailDocumentId;
    if (id == null) return;
    const doc = this.documents().find(item => item.documentId === id);
    if (!doc) return;

    this.pendingDetailDocumentId = null;
    this.openDetails(doc);
    // Drop the query param so closing the modal and refreshing does not reopen it.
    this.router.navigate([], { relativeTo: this.route, queryParams: { document: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private loadWarningThreshold(): void {
    const userId = this.auth.getCurrentUserId();
    if (!userId) return;

    this.complianceService.getUserCompliance(userId).subscribe({
      next: response => {
        const payload = response?.data ?? response;
        const threshold = Number(payload?.warningThresholdDays ?? payload?.WarningThresholdDays);
        if (Number.isFinite(threshold)) {
          this.warningThresholdDays.set(threshold);
        }
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

  isSuperAdmin(): boolean {
    const isAdmin = this.auth.isSuperAdmin();
    console.log('Checking isSuperAdmin:', isAdmin, 'Current user:', this.auth.currentUser());
    return isAdmin;
  }

  onDocumentSelectedFromTree(doc: DocumentItemDto): void {
    // Find the full document from the documents list and open preview
    const fullDoc = this.documents().find(d => d.documentId === doc.documentId);
    if (fullDoc) {
      this.openPreview(fullDoc);
    }
  }

  deleteDocumentFromTree(doc: DocumentItemDto): void {
    if (!doc.userCanDelete || !confirm(`Delete ${doc.fileName}?`)) return;

    this.docsApi.deleteDocument(doc.documentId).subscribe({
      next: () => {
        this.toast.show('Document deleted.', 'success');
        this.hierarchyTree?.loadHierarchy();
      },
      error: err => {
        const message = err?.error?.error ?? err?.error?.message ?? err?.error?.title ?? 'Could not delete document.';
        this.toast.show(message, 'error');
      }
    });
  }
}

