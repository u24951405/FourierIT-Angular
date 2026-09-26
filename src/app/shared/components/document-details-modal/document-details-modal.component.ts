import { Component, OnInit, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentsApiService } from '../../../core/services/documents-api.service';
import { ToastService } from '../../../core/services/toast.service';

export interface DocumentDetails {
  documentId: number;
  fileName: string;
  documentType: string;
  uploadedBy: string;
  uploadedDate: string;
  fileSize: number;
  status: string;
  isCertified: boolean;
  requestedCount: number;
  requestedBy: Array<{ userName: string; requestedDate: string }>;
}

@Component({
  selector: 'app-document-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-details-modal.component.html',
  styleUrls: ['./document-details-modal.component.css']
})
export class DocumentDetailsModalComponent implements OnInit {
  @Input() documentId: number = 0;
  @Output() close = new EventEmitter<void>();

  private docsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);

  // Signals so the popup redraws even when it sits inside an OnPush page (e.g. All Documents).
  readonly isLoading = signal(false);
  readonly details = signal<DocumentDetails | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.documentId) {
      this.loadDocumentDetails();
    }
  }

  loadDocumentDetails(): void {
    this.isLoading.set(true);
    this.error.set(null);

    console.log('[Document Details] Loading document ID:', this.documentId);

    this.docsApi.getDocumentById(this.documentId).subscribe({
      next: (doc) => {
        console.log('[Document Details] Received document:', doc);

        const firstName = (doc as any).uploadedByFirstName || '';
        const lastName = (doc as any).uploadedByLastName || '';
        const uploadedBy = firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : 'User Information Unavailable';

        console.log('[Document Details] Formatted uploader name:', uploadedBy);

        this.details.set({
          documentId: doc.documentId,
          fileName: doc.fileName,
          documentType: doc.documentTypeName || 'Unknown',
          uploadedBy: uploadedBy,
          uploadedDate: doc.uploadedDate,
          fileSize: doc.fileSizeBytes,
          status: doc.currentStatus,
          isCertified: doc.isCertified,
          requestedCount: 0,
          requestedBy: []
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('[Document Details] Error loading document:', error);
        this.error.set('Failed to load document details');
        this.toast.show('Could not load document details', 'error');
        this.isLoading.set(false);
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  getFormattedFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
