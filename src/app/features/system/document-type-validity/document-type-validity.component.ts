import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit, signal } from '@angular/core';
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

  /** True when shown as a tab inside System Settings, which provides the page header. */
  @Input() embedded = false;

  // Signals, because the app runs without Zone.js: plain fields would not redraw when API calls finish.
  readonly documentTypes = signal<DocumentTypeSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showEditor = signal(false);
  readonly showPreviewConfirm = signal(false);
  readonly isSaving = signal(false);
  readonly currentType = signal<DocumentTypeSummaryDto | null>(null);
  readonly previewSummary = signal<DocumentTypeValiditySummaryDto | null>(null);
  readonly formError = signal('');
  pendingPayload: DocumentTypeValidityUpdateRequest | null = null;
  search = '';

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
      description: 'Counted from the date a commissioner certified the copy.'
    },
    {
      value: DocumentTypeValidityBasis.UploadDate,
      label: 'Upload date',
      description: 'Counted from the day the document was uploaded.'
    }
  ];

  get filteredTypes(): DocumentTypeSummaryDto[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.documentTypes();
    return this.documentTypes().filter(type =>
      type.name.toLowerCase().includes(query) || (type.description ?? '').toLowerCase().includes(query));
  }

  get neverExpireCount(): number {
    return this.documentTypes().filter(type => type.neverExpires).length;
  }

  basisLabel(basis: DocumentTypeValidityBasis): string {
    return this.basisOptions.find(option => option.value === basis)?.label ?? 'Upload date';
  }

  /** Warnings must fall inside the validity period (about 30 days per month). */
  get maxWarningDays(): number {
    const months = Number(this.form.validityMonths);
    return Number.isInteger(months) && months > 0 ? Math.min(365, months * 30 - 1) : 365;
  }

  get monthsError(): string | null {
    if (this.form.neverExpires) return null;
    const months = Number(this.form.validityMonths);
    return !Number.isInteger(months) || months < 1 || months > 120 ? 'Enter a whole number of months from 1 to 120.' : null;
  }

  get warningError(): string | null {
    if (this.form.neverExpires) return null;
    const days = Number(this.form.warningDays);
    if (!Number.isInteger(days) || days < 0) return 'Enter a whole number of days, 0 or more.';
    if (days > this.maxWarningDays) return `The warning must be at most ${this.maxWarningDays} days for this validity period.`;
    return null;
  }

  /** The rule in plain words, updated as the form changes. */
  get ruleSummary(): string {
    if (this.form.neverExpires) return 'Documents of this type never expire.';
    const months = Number(this.form.validityMonths);
    const days = Number(this.form.warningDays);
    const period = Number.isInteger(months) && months > 0 ? `${months} month${months === 1 ? '' : 's'}` : 'a set time';
    const warning = Number.isInteger(days) && days > 0
      ? ` Owners are warned ${days} day${days === 1 ? '' : 's'} before.`
      : ' Owners are not warned before they expire.';
    return `Documents of this type expire ${period} after their ${this.basisLabel(this.form.validityBasis).toLowerCase()}.${warning}`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSaving()) return;
    if (this.showPreviewConfirm()) this.cancelPreview();
    else if (this.showEditor()) this.closeEditor();
  }

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
    this.pendingPayload = null;
    this.showPreviewConfirm.set(false);
    this.showEditor.set(true);
  }

  closeEditor(): void {
    this.showEditor.set(false);
    this.showPreviewConfirm.set(false);
    this.currentType.set(null);
    this.previewSummary.set(null);
    this.pendingPayload = null;
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
    // Months and warning days are hidden (and not used) when the document never expires.
    if (this.form.neverExpires) return null;

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

    // Keep the stored months valid even when the rule is "never expires".
    const months = Number(this.form.validityMonths);
    const validityMonths = Number.isInteger(months) && months >= 1 && months <= 120
      ? months
      : (currentType.validityMonths > 0 ? currentType.validityMonths : 3);

    const payload: DocumentTypeValidityUpdateRequest = {
      validityMonths,
      neverExpires: this.form.neverExpires,
      validityBasis: this.form.validityBasis,
      warningDays: Number.isInteger(Number(this.form.warningDays)) && Number(this.form.warningDays) >= 0 ? Number(this.form.warningDays) : 0
    };

    this.isSaving.set(true);
    this.formError.set('');
    this.validityService.previewValidity(currentType.id, payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (summary) => {
          this.previewSummary.set(summary);
          this.pendingPayload = payload;
          this.showPreviewConfirm.set(true);
        },
        error: (error) => {
          this.formError.set(error?.error?.message || 'Unable to preview the validity update.');
        }
      });
  }

  cancelPreview(): void {
    this.showPreviewConfirm.set(false);
    this.formError.set('');
    this.previewSummary.set(null);
    this.pendingPayload = null;
  }

  confirmSave(): void {
    const currentType = this.currentType();
    if (!currentType || !this.pendingPayload) {
      return;
    }

    this.isSaving.set(true);
    this.formError.set('');

    this.validityService.updateValidity(currentType.id, this.pendingPayload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (summary) => {
          const summaryText = this.buildResultSummary(currentType.name, summary);
          this.toast.show(summaryText, summary.complianceRecalculationFailed ? 'warning' : 'success');
          this.closeEditor();
          this.loadDocumentTypes();
        },
        error: (error) => {
          // Stay on the review dialog so the error is visible next to the button that was pressed.
          const message = error?.error?.message || 'Unable to save the validity update.';
          this.formError.set(message);
          this.toast.show(message, 'error');
        }
      });
  }

  /** e.g. "Bank Statement validity updated. 2 documents re-checked: 1 is now expired." */
  private buildResultSummary(typeName: string, summary: DocumentTypeValiditySummaryDto): string {
    if (summary.complianceRecalculationFailed) {
      return `${typeName} validity updated, but owners' compliance could not be recalculated. It will update on the next compliance check.`;
    }

    const count = summary.affectedDocuments;
    if (count === 0) return `${typeName} validity updated.`;

    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const changes = [
      summary.becomeExpired > 0 ? `${summary.becomeExpired} ${summary.becomeExpired === 1 ? 'is' : 'are'} now expired` : null,
      summary.noLongerExpired > 0 ? `${summary.noLongerExpired} ${summary.noLongerExpired === 1 ? 'is' : 'are'} valid again` : null
    ].filter(Boolean);

    return changes.length
      ? `${typeName} validity updated. ${plural(count, 'document')} re-checked: ${changes.join(', ')}.`
      : `${typeName} validity updated. ${plural(count, 'document')} re-checked, none changed status.`;
  }
}
