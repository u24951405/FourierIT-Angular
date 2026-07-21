import { Component, OnInit, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentUploadService } from '../../../../../core/services/document-upload.service';

@Component({
  selector: 'app-popia-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './popia-consent.html',
  styleUrls: ['./popia-consent.scss'],
})
export class PopiaConsentComponent implements OnInit {
  @Input() subjectId!: string;
  @Input() currentUserId!: string;
  @Input() demoMode = false;
  @Output() consentConfirmed = new EventEmitter<void>();

  private uploadService = inject(DocumentUploadService);

  checked = false;
  loading = false;
  checkingExisting = true;
  error: string | null = null;

  ngOnInit(): void {
    if (this.demoMode) {
      this.checkingExisting = false;
      return;
    }

    // If consent already exists for this subject, skip this step
    this.uploadService.checkConsent(this.subjectId).subscribe({
      next: (record) => {
        this.checkingExisting = false;
        if (record?.consentGiven) {
          this.uploadService.setConsentGiven(true);
          this.consentConfirmed.emit();
        }
      },
      error: () => {
        // No record found — user must consent
        this.checkingExisting = false;
      },
    });
  }

  get canProceed(): boolean {
    return this.checked && !this.loading && !this.checkingExisting;
  }

  onConsent(): void {
    if (!this.canProceed) return;
    this.loading = true;
    this.error = null;

    if (this.demoMode) {
      this.uploadService.setConsentGiven(true);
      this.loading = false;
      this.consentConfirmed.emit();
      return;
    }

    this.uploadService.recordConsent(this.subjectId, this.currentUserId).subscribe({
      next: () => {
        this.loading = false;
        this.consentConfirmed.emit();
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to record consent. Please try again.';
      },
    });
  }
}
