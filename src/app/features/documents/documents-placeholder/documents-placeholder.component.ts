import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AllUserDocumentsItem, DocumentListItem, DocumentTypeOption, DocumentsApiService, UploadDocumentPayload } from '../../../core/services/documents-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-documents-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents-placeholder.component.html',
  styleUrl: './documents-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsPlaceholderComponent {
  private route = inject(ActivatedRoute);
  private docsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly title =
    this.route.snapshot.data?.['documentPageTitle']
    ?? 'Documents';

  readonly message = this.route.snapshot.data?.['subtitle'] ?? 'Coming soon.';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly allUsers = signal<AllUserDocumentsItem[]>([]);
  readonly myDocuments = signal<DocumentListItem[]>([]);
  readonly documentTypes = signal<DocumentTypeOption[]>([]);
  readonly showDocumentForm = signal(false);
  readonly editingDocument = signal<DocumentListItem | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedDocumentTypeId = signal<number | null>(null);
  readonly isCertified = signal(false);
  readonly savingDocument = signal(false);

  constructor() {
    this.loadDocuments();
    if (!this.canSeeAllUsersDocuments) {
      this.loadDocumentTypes();
    }
  }

  get canSeeAllUsersDocuments(): boolean {
    return this.auth.isSuperAdmin()
      || this.auth.hasRole('Department Admin')
      || this.auth.hasRole('Compliance Officer')
      || this.auth.hasRole('Stakeholder');
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.canSeeAllUsersDocuments) {
      this.docsApi.getAllUsersDocuments()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (rows: AllUserDocumentsItem[]) => {
            this.allUsers.set(
              (rows ?? []).filter(row => row.userName?.trim().toLowerCase() !== 'superadmin')
            );
          },
          error: (err: any) => {
            const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load the document library.';
            this.error.set(message);
            this.toast.show(message, 'error');
          }
        });
      return;
    }

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows: DocumentListItem[]) => {
          this.myDocuments.set(rows ?? []);
        },
        error: (err: any) => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
          this.toast.show(message, 'error');
        }
      });
  }

  private loadDocumentTypes(): void {
    this.docsApi.getMyDocumentTypes().subscribe({
      next: response => this.documentTypes.set(response.documentTypes ?? []),
      error: () => this.toast.show('Could not load document types.', 'error')
    });
  }

  openCreate(): void {
    this.editingDocument.set(null);
    this.selectedFile.set(null);
    this.selectedDocumentTypeId.set(null);
    this.isCertified.set(false);
    this.showDocumentForm.set(true);
  }

  openEdit(document: DocumentListItem): void {
    this.editingDocument.set(document);
    this.selectedFile.set(null);
    this.selectedDocumentTypeId.set(document.documentTypeId);
    this.isCertified.set(document.isCertified);
    this.showDocumentForm.set(true);
  }

  closeDocumentForm(): void {
    if (!this.savingDocument()) {
      this.showDocumentForm.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  saveDocument(): void {
    const file = this.selectedFile();
    const documentTypeId = this.selectedDocumentTypeId();

    if (!file || !documentTypeId) {
      this.toast.show('Choose a file and document type.', 'error');
      return;
    }

    const payload: UploadDocumentPayload = {
      file,
      documentTypeId,
      isCertified: this.isCertified()
    };
    const document = this.editingDocument();
    this.savingDocument.set(true);
    const request = document
      ? this.docsApi.updateDocument(document.documentId, payload)
      : this.docsApi.uploadDocument(payload);

    request.pipe(finalize(() => this.savingDocument.set(false))).subscribe({
      next: () => {
        this.toast.show(document ? 'Document updated.' : 'Document uploaded.', 'success');
        this.showDocumentForm.set(false);
        this.loadDocuments();
      },
      error: err => this.toast.show(err?.error?.message ?? 'Could not save the document.', 'error')
    });
  }

  deleteDocument(document: DocumentListItem): void {
    if (!confirm(`Delete ${document.fileName || 'this document'}?`)) {
      return;
    }

    this.docsApi.deleteDocument(document.documentId).subscribe({
      next: () => {
        this.myDocuments.update(documents => documents.filter(item => item.documentId !== document.documentId));
        this.toast.show('Document deleted.', 'success');
      },
      error: err => this.toast.show(err?.error?.message ?? 'Could not delete the document.', 'error')
    });
  }
}
