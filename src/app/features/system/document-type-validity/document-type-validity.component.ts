import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { DocumentTypeSummaryDto, DocumentTypeValidityBasis, DocumentTypeValidityService, DocumentTypeValiditySummaryDto, DocumentTypeValidityUpdateRequest } from '../../../core/services/document-type-validity.service';

interface DocumentTypeValidityFormState {
  neverExpires: boolean;
  validityMonths: number;
  validityBasis: DocumentTypeValidityBasis;
  warningDays: number;
}

@Component({
  selector: 'app-document-type-validity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-type-validity.component.html',
  styleUrl: './document-type-validity.component.css'
})
export class DocumentTypeValidityComponent implements OnInit {
  private readonly validityService = inject(DocumentTypeValidityService);
  private readonly toast = inject(ToastService);

  documentTypes = signal<DocumentTypeSummaryDto[]>([]);
  loading = signal(true);
  error = signal('');
  showEditor = signal(false);
  showPreviewConfirm = signal(false);
  isSaving = signal(false);
  currentType = signal<DocumentTypeSummaryDto | null>(null);
  previewSummary = signal<DocumentTypeValiditySummaryDto | null>(null);
  pendingPayload = signal<DocumentTypeValidityUpdateRequest | null>(null);
  formError = signal('');

  form: DocumentTypeValidityFormState = {
    neverExpires: false,
    validityMonths: 3,
    validityBasis: DocumentTypeValidityBasis.CertificationDate,
    warningDays: 0
  };

  readonly basisOptions = [
    {
      value: DocumentTypeValidityBasis.CertificationDate,
      label: 'Certification date',
      description: 'The document expires X months after its certification date.'
    },
    {
      value: DocumentTypeValidityBasis.UploadDate,
      label: 'Upload date',
      description: 'The document expires X months after it was uploaded.'
    }
  ];

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  loadDocumentTypes(): void {
    this.loading.set(true);
    this.error.set('');

    this.validityService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (types) => this.documentTypes.set(types ?? []),
        error: () => this.error.set('Unable to load document types.')
      });
  }

  openEdit(type: DocumentTypeSummaryDto): void {
    this.currentType.set(type);
    this.form = {
      neverExpires: type.neverExpires,
      validityMonths: type.validityMonths > 0 ? type.validityMonths : 3,
      validityBasis: type.validityBasis ?? DocumentTypeValidityBasis.CertificationDate,
      warningDays: type.warningDays ?? 0
    };
    this.formError.set('');
    this.previewSummary.set(null);
    this.pendingPayload.set(null);
    this.showPreviewConfirm.set(false);
    this.showEditor.set(true);
  }

  closeEditor(): void {
    this.showEditor.set(false);
    this.showPreviewConfirm.set(false);
    this.currentType.set(null);
    this.previewSummary.set(null);
    this.pendingPayload.set(null);
    this.formError.set('');
  }

  getValidityText(type: DocumentTypeSummaryDto): string {
    if (type.neverExpires) {
      return 'Never expires';
    }

    const basisText = type.validityBasis === DocumentTypeValidityBasis.CertificationDate
      ? 'from certification date'
      : 'from upload date';

    const monthsText = `${type.validityMonths} month${type.validityMonths === 1 ? '' : 's'}`;
    return `${monthsText} ${basisText}`;
  }

  get warningMessage(): string | null {
    const validationMessage = this.validateForm();
    return validationMessage || null;
  }

  validateForm(): string | null {
    const months = Number(this.form.validityMonths);
    const warningDays = Number(this.form.warningDays);

    if (!Number.isInteger(months) || months < 1 || months > 120) {
      return 'Validity months must be between 1 and 120.';
    }

    if (!Number.isInteger(warningDays) || warningDays < 0 || warningDays > 365) {
      return 'Warning days must be between 0 and 365.';
    }

    if (!this.form.neverExpires && warningDays >= months * 30) {
      return `Warning days must be less than validityMonths * 30 (${months * 30}).`;
    }

    return null;
  }

  handleSave(): void {
    const validationMessage = this.validateForm();
    if (validationMessage) {
      this.formError.set(validationMessage);
      return;
    }

    const currentType = this.currentType();
    if (!currentType) {
      return;
    }

    const payload: DocumentTypeValidityUpdateRequest = {
      validityMonths: this.form.validityMonths,
      neverExpires: this.form.neverExpires,
      validityBasis: this.form.validityBasis,
      warningDays: this.form.warningDays
    };

    this.isSaving.set(true);
    this.formError.set('');
    this.validityService.previewValidity(currentType.id, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (summary) => {
          this.previewSummary.set(summary);
          this.pendingPayload.set(payload);
          this.showPreviewConfirm.set(true);
        },
        error: (error) => {
          this.formError.set(error?.error?.message || 'Unable to preview the validity update.');
        }
      });
  }

  cancelPreview(): void {
    this.showPreviewConfirm.set(false);
    this.previewSummary.set(null);
    this.pendingPayload.set(null);
  }

  confirmSave(): void {
    const currentType = this.currentType();
    const pendingPayload = this.pendingPayload();
    if (!currentType || !pendingPayload) {
      return;
    }

    this.isSaving.set(true);
    this.formError.set('');

    this.validityService.updateValidity(currentType.id, pendingPayload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (summary) => {
          const summaryText = this.buildResultSummary(summary);
          this.toast.show(summaryText, summary.complianceRecalculationFailed ? 'warning' : 'success');
          this.closeEditor();
          this.loadDocumentTypes();
        },
        error: (error) => {
          const message = error?.error?.message || 'Unable to save the validity update.';
          this.formError.set(message);
          this.showPreviewConfirm.set(false);
        }
      });
  }

  private buildResultSummary(summary: DocumentTypeValiditySummaryDto): string {
    const parts = [
      `Re-evaluated ${summary.affectedDocuments} documents.`,
      summary.becomeExpired > 0 ? `${summary.becomeExpired} became expired.` : null,
      summary.noLongerExpired > 0 ? `${summary.noLongerExpired} are no longer expired.` : null,
      summary.missingSourceDate > 0 ? `${summary.missingSourceDate} have no source date and will not expire.` : null,
      summary.complianceRecalculationFailed ? 'Compliance recalculation failed.' : null
    ].filter(Boolean) as string[];

    return parts.join(' ');
  }
}
