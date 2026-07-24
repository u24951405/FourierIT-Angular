import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';

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
  readonly documentId = signal('');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  downloadDocument(): void {
    const token = this.token().trim();
    const documentId = Number(this.documentId().trim());
    if (!token) {
      this.message.set('Access token is required.');
      return;
    }
    if (!Number.isInteger(documentId) || documentId <= 0) {
      this.message.set('Enter a valid document ID.');
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
          anchor.download = `document-${documentId}`;
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
