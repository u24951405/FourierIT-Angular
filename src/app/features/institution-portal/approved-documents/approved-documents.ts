import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { ApprovedInstitutionDocument } from '../../../core/models/institution.models';

@Component({
  selector: 'app-approved-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-documents.html',
  styleUrl: './approved-documents.css',
})
export class ApprovedDocuments {
  private requestService = inject(DocumentAccessRequestService);

  readonly token = signal('');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly approvedDocuments = signal<ApprovedInstitutionDocument[]>([]);
  readonly selectedDocumentId = signal<number | null>(null);

  loadApprovedDocuments(): void {
    const token = this.token().trim();
    if (!token) {
      this.message.set('Access token is required.');
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
            this.message.set('No approved documents found for this token.');
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
  }

  downloadDocument(): void {
    const token = this.token().trim();
    const documentId = this.selectedDocumentId();
    if (!token) {
      this.message.set('Access token is required.');
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
}
