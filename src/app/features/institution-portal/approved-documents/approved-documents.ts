import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { InstitutionAuthService } from '../auth/institution-auth';
import { ApprovedInstitutionDocument } from '../../../core/models/institution.models';

@Component({
  selector: 'app-approved-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-documents.html',
  styleUrl: './approved-documents.css',
})
export class ApprovedDocuments implements OnInit {
  private requestService = inject(DocumentAccessRequestService);
  readonly router = inject(Router);
  readonly authService = inject(InstitutionAuthService);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly approvedDocuments = signal<ApprovedInstitutionDocument[]>([]);
  readonly groupedDocuments = computed(() => {
    const groups = new Map<string, { requestId: number; requestType: string; recipientName: string; documents: ApprovedInstitutionDocument[] }>();
    for (const document of this.approvedDocuments()) {
      const groupKey = `${document.requestId}::${document.recipientName}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          requestId: document.requestId,
          requestType: document.requestType,
          recipientName: document.recipientName,
          documents: [],
        });
      }
      groups.get(groupKey)?.documents.push(document);
    }
    return Array.from(groups.values());
  });

  documentTypeSummaries(documents: ApprovedInstitutionDocument[]): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const document of documents) {
      counts.set(document.documentTypeName, (counts.get(document.documentTypeName) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }
  readonly selectedDocumentId = signal<number | null>(null);
  readonly flagReason = signal('');
  readonly showingFlagForm = signal(false);

  ngOnInit(): void {
    this.loadApprovedDocuments();
  }

  private getSessionToken(): string | null {
    return this.authService.getSessionToken();
  }

  loadApprovedDocuments(): void {
    const token = this.getSessionToken();
    if (!token) {
      this.message.set('Please sign in to the institution portal to view approved documents.');
      return;
    }

    this.loading.set(true);
    this.message.set(null);

    this.requestService
      .getApprovedInstitutionDocuments(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (documents) => {
          this.approvedDocuments.set(documents ?? []);
          if (!documents?.length) {
            this.message.set('No approved documents were found for your institution session.');
          }
        },
        error: (err) => {
          this.message.set(err?.error?.error ?? err?.error?.message ?? 'Could not load approved documents.');
        },
      });
  }

  selectDocument(documentId: number): void {
    this.selectedDocumentId.set(documentId);
    this.message.set(null);
    this.showingFlagForm.set(false);
    this.flagReason.set('');
  }

  downloadDocument(): void {
    const token = this.getSessionToken();
    const documentId = this.selectedDocumentId();
    if (!token) {
      this.message.set('Please sign in to download documents.');
      return;
    }
    if (!documentId) {
      this.message.set('Select an approved document before downloading.');
      return;
    }

    this.loading.set(true);
    this.message.set(null);

    this.requestService
      .downloadInstitutionDocument(documentId, token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `approved-document-${documentId}`;
          anchor.click();
          URL.revokeObjectURL(url);
          this.message.set('Document download started.');
        },
        error: (err) => {
          this.message.set(err?.error?.error ?? err?.error?.message ?? 'Could not download the approved document.');
        },
      });
  }

  startFlagging(): void {
    this.showingFlagForm.set(true);
    this.message.set(null);
  }

  flagDocument(): void {
    const token = this.getSessionToken();
    const documentId = this.selectedDocumentId();
    const reason = this.flagReason().trim();

    if (!token) {
      this.message.set('Please sign in to flag documents.');
      return;
    }
    if (!documentId) {
      this.message.set('Select an approved document before flagging.');
      return;
    }
    if (!reason) {
      this.message.set('Please provide a reason for flagging the document.');
      return;
    }

    this.loading.set(true);
    this.message.set(null);

    this.requestService
      .flagApprovedDocument(documentId, token, { reason })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Document flagged successfully. The review team has received your reason.');
          this.showingFlagForm.set(false);
          this.flagReason.set('');
        },
        error: (err) => {
          this.message.set(err?.error?.error ?? err?.error?.message ?? 'Could not flag the approved document.');
        },
      });
  }
}
