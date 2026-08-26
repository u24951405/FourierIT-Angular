import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ComplianceService } from '../../../core/services/compliance.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface ReviewQueueItem {
  checkId: number;
  documentId?: number;
  fileName?: string;
  ownerName?: string;
  departmentName?: string | null;
  document?: {
    fileName?: string;
    documentType?: { typeName?: string } | null;
  } | null;
  checkedAt?: string;
  manualReviewReason?: string | null;
  nonComplianceReason?: string | null;
}

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-queue.component.html',
  styleUrl: './review-queue.component.css',
})
export class ReviewQueueComponent implements OnInit {
  private complianceService = inject(ComplianceService);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly reviews = signal<ReviewQueueItem[]>([]);
  readonly processingCheckId = signal<number | null>(null);
  readonly notes = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.error.set(null);

    this.complianceService
      .getPendingReviews()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (reviews) => this.reviews.set(reviews),
        error: (err) => {
          const message =
            err?.error?.error ?? err?.error?.message ?? 'Could not load the compliance review queue.';
          this.error.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  approve(review: ReviewQueueItem): void {
    this.submitDecision(review, 'approve');
  }

  reject(review: ReviewQueueItem): void {
    this.submitDecision(review, 'reject');
  }

  getNotes(checkId: number): string {
    return this.notes()[checkId] ?? '';
  }

  setNotes(checkId: number, value: string): void {
    this.notes.update((current) => ({ ...current, [checkId]: value }));
  }

  canReject(checkId: number): boolean {
    return this.getNotes(checkId).trim().length > 0;
  }

  getDocumentName(review: ReviewQueueItem): string {
    return review.fileName ?? review.document?.fileName ?? `Document #${review.documentId ?? 'Unknown'}`;
  }

  getDocumentType(review: ReviewQueueItem): string {
    return review.document?.documentType?.typeName ?? 'Document type unavailable';
  }

  viewDocument(documentId?: number): void {
    if (documentId == null) return;

    this.complianceService.previewDocument(documentId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => {
        this.toast.show('The document could not be loaded.', 'error');
      },
    });
  }

  private submitDecision(review: ReviewQueueItem, decision: 'approve' | 'reject'): void {
    const checkId = review.checkId;
    if (typeof checkId !== 'number') {
      const message = 'This review does not have a valid check identifier.';
      this.error.set(message);
      this.toast.show(message, 'error');
      return;
    }

    this.processingCheckId.set(checkId);
    this.error.set(null);

    const request = decision === 'approve'
      ? this.complianceService.approveDocument(checkId, this.getNotes(checkId))
      : this.complianceService.rejectDocument(checkId, this.getNotes(checkId));

    request.pipe(finalize(() => this.processingCheckId.set(null))).subscribe({
      next: () => {
        this.toast.show(
          decision === 'approve' ? 'Document approved successfully.' : 'Document rejected successfully.',
          'success'
        );
        this.loadReviews();
      },
      error: (err) => {
        const message = err?.error?.error ?? err?.error?.message ?? 'Could not update this review.';
        this.error.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
