import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  /** How long it has been waiting for a decision. */
  waitingDays?: number;
  /** The earliest needed-by date of an institution request waiting on this document. */
  neededBy?: string | null;
  neededByInstitution?: string | null;
  /** The automatic checks found nothing wrong, so it can be approved in bulk. */
  isClearlyValid?: boolean;
  concerns?: string[];
}

type QueueSort = 'needed' | 'waiting' | 'owner' | 'type';

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

  readonly pepScanUrl = 'https://www.verifynow.co.za/verifynow?reportType=check-aml-pep';
  readonly canManage = this.auth.hasRole('Compliance Officer') || this.auth.hasRole('Admin');

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
  sortBy: QueueSort = 'needed';
  onlyClearlyValid = false;
  readonly sortOptions: { value: QueueSort; label: string }[] = [
    { value: 'needed', label: 'Needed soonest' },
    { value: 'waiting', label: 'Waiting longest' },
    { value: 'owner', label: 'Owner' },
    { value: 'type', label: 'Document type' },
  ];
  /** Clearly valid documents picked for bulk approval. */
  readonly selected = signal<Set<number>>(new Set());
  readonly bulkApproving = signal(false);

  get filteredReviews(): ReviewQueueItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    const visible = this.reviews().filter(review => !this.onlyClearlyValid || review.isClearlyValid);
    const matching = !query ? visible : visible.filter(review => [
      this.getDocumentName(review),
      this.getDocumentType(review),
      review.ownerName ?? '',
      review.departmentName ?? '',
      review.manualReviewReason ?? '',
      review.nonComplianceReason ?? ''
    ].some(value => value.toLowerCase().includes(query)));
    return [...matching].sort((a, b) => this.compare(a, b));
  }

  /** Documents an institution is waiting for come first (soonest deadline), then the ones waiting longest. */
  private compare(a: ReviewQueueItem, b: ReviewQueueItem): number {
    const waiting = (b.waitingDays ?? 0) - (a.waitingDays ?? 0);
    switch (this.sortBy) {
      case 'owner': return (a.ownerName ?? '').localeCompare(b.ownerName ?? '') || waiting;
      case 'type': return this.getDocumentType(a).localeCompare(this.getDocumentType(b)) || waiting;
      case 'waiting': return waiting;
      default: {
        const due = (item: ReviewQueueItem) => item.neededBy ? new Date(item.neededBy).getTime() : Number.MAX_SAFE_INTEGER;
        return due(a) - due(b) || waiting;
      }
    }
  }

  waitingLabel(review: ReviewQueueItem): string {
    const days = review.waitingDays ?? 0;
    return days <= 0 ? 'Waiting since today' : `Waiting ${days} day${days === 1 ? '' : 's'}`;
  }

  isOverdue(review: ReviewQueueItem): boolean {
    return !!review.neededBy && new Date(review.neededBy).getTime() < Date.now();
  }

  isSelected(checkId: number): boolean {
    return this.selected().has(checkId);
  }

  toggleSelected(checkId: number): void {
    this.selected.update(current => {
      const next = new Set(current);
      next.has(checkId) ? next.delete(checkId) : next.add(checkId);
      return next;
    });
  }

  get selectableReviews(): ReviewQueueItem[] {
    return this.filteredReviews.filter(review => review.isClearlyValid);
  }

  get allSelectableSelected(): boolean {
    const selectable = this.selectableReviews;
    return selectable.length > 0 && selectable.every(review => this.isSelected(review.checkId));
  }

  toggleSelectAll(): void {
    const ids = this.selectableReviews.map(review => review.checkId);
    this.selected.set(this.allSelectableSelected ? new Set() : new Set(ids));
  }

  /** Approves every selected clearly valid document in one go. */
  bulkApprove(): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    if (!confirm(`Approve ${ids.length} document${ids.length === 1 ? '' : 's'} that passed every automatic check?`)) return;

    this.bulkApproving.set(true);
    this.complianceService.bulkApproveDocuments(ids)
      .pipe(finalize(() => this.bulkApproving.set(false)))
      .subscribe({
        next: result => {
          const skipped = new Set(result.skipped ?? []);
          this.reviews.update(current => current.filter(item => !ids.includes(item.checkId) || skipped.has(item.checkId)));
          this.selected.set(new Set());
          const message = `${result.approved} document${result.approved === 1 ? '' : 's'} approved.`
            + (skipped.size ? ` ${skipped.size} need${skipped.size === 1 ? 's' : ''} a closer look and stayed in the queue.` : '');
          this.toast.show(message, skipped.size ? 'info' : 'success');
        },
        error: err => this.toast.show(err?.error?.error ?? err?.error?.message ?? 'Could not approve the selected documents.', 'error'),
      });
  }

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

  /**
   * Opens VerifyNow in a small window centred over the app. It can't be shown inside the page:
   * VerifyNow sends X-Frame-Options: DENY, so browsers refuse to load it in an iframe.
   */
  openPepScan(): void {
    const width = 760;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    window.open(this.pepScanUrl, 'verifynow-pep-scan', features)?.focus();
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
        this.selected.update(current => { const next = new Set(current); next.delete(checkId); return next; });
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
