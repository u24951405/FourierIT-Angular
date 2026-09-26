import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ComplianceService } from '../../../core/services/compliance.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
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
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly pepScanUrl = 'https://www.verifynow.co.za/verifynow?reportType=check-aml-pep';
  readonly canManage = this.isDevAccess() || this.auth.hasRole('Compliance Officer') || this.auth.hasRole('Admin');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly reviews = signal<ReviewQueueItem[]>([]);
  readonly processingCheckId = signal<number | null>(null);
  readonly notes = signal<Record<number, string>>({});
  readonly rejectionCategories = signal<Record<number, string>>({});
  readonly rejectionCategoryOptions = [
    'Illegible or poor quality',
    'Expired',
    'Not certified',
    'Wrong document',
    'Details do not match',
    'Other'
  ];
  searchTerm = '';

  get filteredReviews(): ReviewQueueItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.reviews();

    return this.reviews().filter(review => [
      this.getDocumentName(review),
      this.getDocumentType(review),
      review.ownerName ?? '',
      review.departmentName ?? '',
      review.manualReviewReason ?? '',
      review.nonComplianceReason ?? ''
    ].some(value => value.toLowerCase().includes(query)));
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  private isDevAccess(): boolean {
    const dev = this.route.snapshot.queryParamMap.get('dev');
    return dev === '1' || dev === 'true';
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

  getRejectionCategory(checkId: number): string {
    return this.rejectionCategories()[checkId] ?? '';
  }

  setRejectionCategory(checkId: number, value: string): void {
    this.rejectionCategories.update((current) => ({ ...current, [checkId]: value }));
  }

  // A category is always required; "Other" also needs notes so the owner knows what to fix.
  canReject(checkId: number): boolean {
    const category = this.getRejectionCategory(checkId);
    if (!category) return false;
    return category !== 'Other' || this.getNotes(checkId).trim().length > 0;
  }

  private buildRejectionReason(checkId: number): string {
    const category = this.getRejectionCategory(checkId);
    const notes = this.getNotes(checkId).trim();
    if (category === 'Other') return notes;
    return notes ? `${category}: ${notes}` : category;
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

  openPepScan(): void {
    window.open(this.pepScanUrl, '_blank', 'width=1100,height=750,resizable=yes,scrollbars=yes');
  }

  getComplianceStatus(review: ReviewQueueItem): 'Pending' | 'Needs review' | 'Compliant' {
    if (review.nonComplianceReason || review.manualReviewReason) {
      return 'Needs review';
    }

    return 'Pending';
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
      : this.complianceService.rejectDocument(checkId, this.buildRejectionReason(checkId));

    request.pipe(finalize(() => this.processingCheckId.set(null))).subscribe({
      next: () => {
        this.toast.show(decision === 'approve' ? 'Document approved.' : 'Document rejected.', 'success');
        // A decided document leaves the queue straight away; it returns only if the owner resubmits.
        this.reviews.update((current) => current.filter((item) => item.checkId !== checkId));
        this.notes.update(({ [checkId]: _, ...rest }) => rest);
        this.rejectionCategories.update(({ [checkId]: _, ...rest }) => rest);
      },
      error: (err) => {
        const message = err?.error?.error ?? err?.error?.message ?? 'Could not update this review.';
        this.error.set(message);
        this.toast.show(message, 'error');
      },
    });
  }
}
