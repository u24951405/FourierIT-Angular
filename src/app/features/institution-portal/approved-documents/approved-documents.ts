import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { InstitutionAuthService } from '../auth/institution-auth';
import { ApprovedInstitutionDocument } from '../../../core/models/institution.models';
import { PortalPageHeaderComponent } from '../shell/portal-page-header';

interface RequestGroup {
  requestId: number;
  requestType: string;
  recipientName: string;
  expiresAt?: string;
  extensionStatus?: string | null;
  extensionRequestedUntil?: string | null;
  documents: ApprovedInstitutionDocument[];
}

/** Documents the institution may open, grouped by the request that granted access. */
@Component({
  selector: 'app-approved-documents',
  standalone: true,
  imports: [DatePipe, RouterLink, PortalPageHeaderComponent],
  templateUrl: './approved-documents.html',
  styleUrl: './approved-documents.css',
})
export class ApprovedDocuments implements OnInit, OnDestroy {
  private readonly requestService = inject(DocumentAccessRequestService);
  private readonly authService = inject(InstitutionAuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly documents = signal<ApprovedInstitutionDocument[]>([]);
  readonly downloadingId = signal<number | null>(null);
  readonly flaggingId = signal<number | null>(null);
  readonly submittingFlag = signal(false);
  readonly flagReason = signal('');
  /** The document open in the viewer (a temporary in-memory link, never saved to disk). */
  readonly viewer = signal<{ name: string; url: string; kind: 'pdf' | 'image' } | null>(null);
  readonly viewingId = signal<number | null>(null);

  readonly groups = computed<RequestGroup[]>(() => {
    const groups = new Map<number, RequestGroup>();
    for (const document of this.documents()) {
      const group = groups.get(document.requestId) ?? {
        requestId: document.requestId,
        requestType: document.requestType,
        recipientName: document.recipientName,
        expiresAt: document.expiresAt,
        extensionStatus: document.extensionStatus,
        extensionRequestedUntil: document.extensionRequestedUntil,
        documents: [],
      };
      group.documents.push(document);
      groups.set(document.requestId, group);
    }
    return [...groups.values()];
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.closeViewer();
  }

  /** The viewer's frame needs the in-memory link marked as trusted (it was created by this page). */
  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  loadDocuments(): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.requestService.getApprovedInstitutionDocuments(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: documents => this.documents.set(documents ?? []),
        error: err => this.error.set(err?.error?.error ?? err?.error?.message ?? 'Could not load your approved documents.'),
      });
  }

  /** True when access ends within a day, so the institution knows to download soon. */
  endsSoon(expiresAt?: string): boolean {
    return !!expiresAt && new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  }

  download(document: ApprovedInstitutionDocument): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.downloadingId.set(document.documentId);
    this.notice.set(null);
    this.error.set(null);
    this.requestService.downloadInstitutionDocument(document.documentId, token)
      .pipe(finalize(() => this.downloadingId.set(null)))
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const anchor = window.document.createElement('a');
          anchor.href = url;
          // Keep the original name (and extension) so the file opens in the right program.
          anchor.download = document.documentName || `document-${document.documentId}`;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: err => this.error.set(err?.error?.error ?? err?.error?.detail ?? 'Could not download this document. Your access may have ended.'),
      });
  }

  /** PDFs and images open in the page; other files can only be downloaded. */
  canView(document: ApprovedInstitutionDocument): boolean {
    return /\.(pdf|png|jpe?g|gif|webp)$/i.test(document.documentName ?? '');
  }

  view(document: ApprovedInstitutionDocument): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.viewingId.set(document.documentId);
    this.error.set(null);
    this.requestService.viewInstitutionDocument(document.documentId, token)
      .pipe(finalize(() => this.viewingId.set(null)))
      .subscribe({
        next: blob => {
          this.closeViewer();
          const kind = blob.type === 'application/pdf' ? 'pdf' : 'image';
          this.viewer.set({ name: document.documentName, url: URL.createObjectURL(blob), kind });
        },
        error: err => this.error.set(err?.error?.error ?? err?.error?.detail ?? 'Could not open this document. Your access may have ended.'),
      });
  }

  closeViewer(): void {
    const open = this.viewer();
    if (open) URL.revokeObjectURL(open.url);
    this.viewer.set(null);
  }

  startFlag(document: ApprovedInstitutionDocument): void {
    this.flaggingId.set(this.flaggingId() === document.documentId ? null : document.documentId);
    this.flagReason.set('');
    this.notice.set(null);
  }

  submitFlag(document: ApprovedInstitutionDocument): void {
    const token = this.authService.getSessionToken();
    const reason = this.flagReason().trim();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }
    if (!reason) return;

    this.submittingFlag.set(true);
    this.error.set(null);
    this.requestService.flagApprovedDocument(document.documentId, token, { reason })
      .pipe(finalize(() => this.submittingFlag.set(false)))
      .subscribe({
        next: () => {
          this.flaggingId.set(null);
          this.flagReason.set('');
          this.notice.set(`"${document.documentName}" was flagged. The owner has been told why.`);
        },
        error: err => this.error.set(err?.error?.error ?? err?.error?.detail ?? 'Could not flag this document.'),
      });
  }
}
