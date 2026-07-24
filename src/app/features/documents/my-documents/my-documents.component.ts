import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentsApiService, DocumentDetailItem, DocumentListItem } from '../../../core/services/documents-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-documents.component.html',
  styleUrls: ['./my-documents.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MyDocumentsComponent implements OnInit {
  private router = inject(Router);
  private docsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly detailDocument = signal<DocumentDetailItem | null>(null);
  readonly shareDocumentId = signal<number | null>(null);
  readonly shareRecipient = signal('');
  readonly shareAccessLevel = signal('0');
  readonly shareExpiryDate = signal('');
  readonly shareReason = signal('');
  readonly sharing = signal(false);
  readonly loadingDetail = signal(false);

  ngOnInit(): void {
    this.loadDocuments();
  }

  get filteredDocuments(): DocumentListItem[] {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.documents();
    return this.documents().filter(doc =>
      doc.fileName.toLowerCase().includes(query) ||
      doc.documentTypeName.toLowerCase().includes(query) ||
      doc.currentStatus.toLowerCase().includes(query)
    );
  }

  openTemporaryUploadPage(): void {
    this.router.navigate(['/documents/upload']);
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

    this.docsApi.getDocumentById(doc.documentId)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: detail => this.detailDocument.set(detail),
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load document details.';
          this.toast.show(message, 'error');
        }
      });
  }

  openShare(doc: DocumentListItem): void {
    this.shareDocumentId.set(doc.documentId);
    this.shareRecipient.set('');
    this.shareAccessLevel.set('0');
    this.shareExpiryDate.set('');
    this.shareReason.set('');
  }

  closeDetail(): void {
    this.detailDocument.set(null);
  }

  closeShare(): void {
    this.shareDocumentId.set(null);
  }

  submitShare(): void {
    const documentId = this.shareDocumentId();
    if (!documentId || !this.shareRecipient().trim()) {
      this.toast.show('Enter a user id, username, or email to share with.', 'error');
      return;
    }

    this.sharing.set(true);
    this.docsApi.shareDocument(documentId, {
      grantToUserId: this.shareRecipient().trim(),
      accessLevel: Number(this.shareAccessLevel()),
      expiryDate: this.shareExpiryDate() || null,
      reason: this.shareReason().trim() || ''
    })
      .pipe(finalize(() => this.sharing.set(false)))
      .subscribe({
        next: response => {
          this.toast.show(response.message || 'Document shared.', 'success');
          this.closeShare();
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not share the document.';
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
        const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not delete document.';
        this.toast.show(message, 'error');
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
}

