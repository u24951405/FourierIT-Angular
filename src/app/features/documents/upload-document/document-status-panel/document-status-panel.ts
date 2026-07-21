import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DocumentUploadService } from '../../../../core/services/document-upload.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  UploadedDocument,
  DocumentStatus,
  UploadPageState,
  EntityType,
} from '../../../../core/models/document-upload.models';

@Component({
  selector: 'app-document-status-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-status-panel.html',
  styleUrls: ['./document-status-panel.css'],
})
export class DocumentStatusPanelComponent implements OnInit, OnDestroy {
  @Output() submissionCompleted = new EventEmitter<void>();

  private uploadService = inject(DocumentUploadService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  DocumentStatus = DocumentStatus;

  state!: UploadPageState;
  submitting = false;
  submitError: string | null = null;
  submitSuccess = false;

  // Compliance officer rejection flow
  rejectingDocId: string | null = null;
  rejectionReason = '';
  rejectionError = '';

  get currentUser() {
    return this.authService.currentUser();
  }

  get isReviewer(): boolean {
    return this.authService.canReviewDocuments();
  }

  get canSubmit(): boolean {
    return this.state?.canSubmit && this.authService.canUploadDocuments() && !this.submitSuccess;
  }

  get uploadedDocuments(): UploadedDocument[] {
    return this.state?.uploadedDocuments ?? [];
  }

  get hasDocuments(): boolean {
    return this.uploadedDocuments.length > 0;
  }

  get remainingCount(): number {
    return this.uploadService.getRemainingCount();
  }

  ngOnInit(): void {
    this.uploadService
      .getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => (this.state = s));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.canSubmit || !this.currentUser || !this.state.entityType) return;
    this.submitting = true;
    this.submitError = null;

    this.uploadService
      .submitForComplianceReview(this.currentUser.id, this.state.entityType)
      .subscribe({
        next: () => {
          this.submitting = false;
          this.submitSuccess = true;
          this.submissionCompleted.emit();
        },
        error: () => {
          this.submitting = false;
          this.submitError = 'Submission failed. Please try again.';
        },
      });
  }

  // ─── Compliance Actions ──────────────────────────────────────────────────────

  approveDocument(doc: UploadedDocument): void {
    if (!this.currentUser) return;
    this.uploadService.approveDocument(doc.documentId, this.currentUser.id).subscribe();
  }

  startReject(doc: UploadedDocument): void {
    this.rejectingDocId = doc.documentId;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  confirmReject(doc: UploadedDocument): void {
    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'Please provide a rejection reason.';
      return;
    }
    if (!this.currentUser) return;
    this.uploadService
      .rejectDocument(doc.documentId, this.currentUser.id, this.rejectionReason)
      .subscribe({
        next: () => {
          this.rejectingDocId = null;
          this.rejectionReason = '';
        },
      });
  }

  cancelReject(): void {
    this.rejectingDocId = null;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  // ─── Re-upload ───────────────────────────────────────────────────────────────

  onReUploadFile(event: Event, doc: UploadedDocument): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.currentUser) return;

    this.uploadService.reUploadDocument(file, doc, this.currentUser.id).subscribe();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  statusLabel(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
      [DocumentStatus.NOT_UPLOADED]: 'Not uploaded',
      [DocumentStatus.UPLOADED]: 'Uploaded',
      [DocumentStatus.AWAITING_REVIEW]: 'Awaiting review',
      [DocumentStatus.APPROVED]: 'Approved',
      [DocumentStatus.REJECTED]: 'Rejected',
    };
    return map[status] ?? status;
  }

  statusClass(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
      [DocumentStatus.NOT_UPLOADED]: 'status--not-uploaded',
      [DocumentStatus.UPLOADED]: 'status--uploaded',
      [DocumentStatus.AWAITING_REVIEW]: 'status--awaiting',
      [DocumentStatus.APPROVED]: 'status--approved',
      [DocumentStatus.REJECTED]: 'status--rejected',
    };
    return map[status] ?? '';
  }

  maskFileName(fileName: string): string {
    // Show only extension for sensitive files — mask actual name
    const ext = fileName.split('.').pop();
    return `••••••.${ext}`;
  }
}
