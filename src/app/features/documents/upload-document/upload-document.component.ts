import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentsApiService, DocumentTypeOption, RequiredDocumentsStatusResponse } from '../../../core/services/documents-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-upload-document-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './upload-document.component.html',
  styleUrl: './upload-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadDocumentComponent implements OnInit {
  /** Certification dates can't be in the future. */
  // Local date (not UTC), so the latest date the picker allows is today where the user is.
  readonly today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private docsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly requiredStatus = signal<RequiredDocumentsStatusResponse | null>(null);
  readonly documentTypes = signal<DocumentTypeOption[]>([]);
  readonly selectedFile = signal<File | null>(null);
  readonly uploadedDocumentTypeIds = signal<Set<number>>(new Set());

  readonly form = this.fb.group({
    documentTypeId: [null as number | null, Validators.required],
    isCertified: [false],
    commissionerName: [''],
    certificationDate: ['']
  });

  get documentTypeUploadError(): string | null {
    const selectedTypeId = this.form.get('documentTypeId')?.value as number | null;
    return selectedTypeId != null && this.uploadedDocumentTypeIds().has(selectedTypeId)
      ? 'You have already uploaded this document type. Please choose a different type or update the existing document.'
      : null;
  }

  isDocumentTypeUploaded(documentTypeId: number | null): boolean {
    return documentTypeId != null && this.uploadedDocumentTypeIds().has(documentTypeId);
  }

  ngOnInit(): void {
    this.loadDocumentContext();
  }

  get canSubmit(): boolean {
    return this.form.valid && !!this.selectedFile() && !this.submitting();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  upload(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    const file = this.selectedFile();
    const values = this.form.getRawValue();
    if (!file || values.documentTypeId == null) return;

    if (this.isDocumentTypeUploaded(values.documentTypeId)) {
      const message = 'You have already uploaded this document type. Please choose a different type or update the existing document.';
      this.error.set(message);
      this.toast.show(message, 'error');
      return;
    }

    // The date picker stops future dates, but a typed-in date gets past it.
    if (values.certificationDate && values.certificationDate > this.today) {
      const message = "The certification date can't be in the future.";
      this.error.set(message);
      this.toast.show(message, 'error');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.docsApi.uploadDocument({
      file,
      documentTypeId: values.documentTypeId,
      isCertified: !!values.isCertified,
      commissionerName: (values.commissionerName ?? '').trim() || undefined,
      certificationDate: values.certificationDate || null
    })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('Document uploaded successfully.', 'success');
          this.form.reset({ documentTypeId: null, isCertified: false, commissionerName: '', certificationDate: '' });
          this.selectedFile.set(null);
          this.loadDocumentContext();
        },
        error: err => {
          const traceId = err?.error?.traceId;
          const message = typeof err?.error === 'string'
            ? err.error
            : err?.error?.message ?? err?.error?.error ?? err?.error?.title ?? 'Upload failed.';
          const messageWithReference = traceId ? `${message} Reference: ${traceId}` : message;
          this.error.set(messageWithReference);
          this.toast.show(messageWithReference, 'error');
        }
      });
  }

  openMyDocuments(): void {
    void this.router.navigate(['/my-documents']);
  }

  private loadDocumentContext(): void {
    this.loading.set(true);
    this.error.set(null);

    this.docsApi.getMyRequiredDocumentsStatus()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: status => {
          this.requiredStatus.set(status);
          this.uploadedDocumentTypeIds.set(new Set(status.documents?.filter(doc => doc.isUploaded).map(doc => doc.documentTypeId) ?? []));
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load document requirements.';
          this.requiredStatus.set(null);
          this.uploadedDocumentTypeIds.set(new Set());
          this.error.set(message);
        }
      });

    this.docsApi.getMyDocumentTypes().subscribe({
      next: types => this.documentTypes.set(types?.documentTypes ?? []),
      error: () => this.documentTypes.set([])
    });
  }
}
