import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { InstitutionAuthService } from '../auth/institution-auth';
import { PortalPageHeaderComponent } from '../shell/portal-page-header';

type StatusFilter = 'all' | 'pending' | 'approved' | 'denied' | 'cancelled';

/** Every request the institution made, newest first, filterable by where it stands. */
@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [DatePipe, RouterLink, PortalPageHeaderComponent],
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.css',
})
export class MyRequests implements OnInit {
  private readonly requestService = inject(DocumentAccessRequestService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(InstitutionAuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly requests = signal<PendingDocumentAccessRequest[]>([]);
  readonly filter = signal<StatusFilter>('all');
  readonly cancellingId = signal<number | null>(null);
  /** The approved request whose "ask for more time" form is open. */
  readonly extendingId = signal<number | null>(null);
  readonly extensionDays = signal(3);
  readonly extensionReason = signal('');
  readonly submittingExtension = signal(false);

  readonly filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Waiting' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  readonly visibleRequests = computed(() => {
    const filter = this.filter();
    return filter === 'all' ? this.requests() : this.requests().filter(r => this.statusGroup(r.status) === filter);
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status') as StatusFilter | null;
    if (status && this.filters.some(f => f.value === status)) this.filter.set(status);
    this.loadRequests();
  }

  countFor(filter: StatusFilter): number {
    return filter === 'all' ? this.requests().length : this.requests().filter(r => this.statusGroup(r.status) === filter).length;
  }

  setFilter(filter: StatusFilter): void {
    this.filter.set(filter);
    // Keeps the filter in the address, so refreshing or sharing the page shows the same list.
    this.router.navigate([], { queryParams: { status: filter === 'all' ? null : filter }, replaceUrl: true });
  }

  statusGroup(status: string): Exclude<StatusFilter, 'all'> {
    switch (status) {
      case 'Approved': return 'approved';
      case 'Denied': return 'denied';
      case 'Revoked': return 'cancelled';
      default: return 'pending';
    }
  }

  statusLabel(request: PendingDocumentAccessRequest): string {
    switch (request.status) {
      case 'Department_Pending': return 'With the department';
      case 'Pending': return request.requestType === 'Department' ? 'With the assigned person' : 'Waiting for the owner';
      case 'Revoked': return 'Cancelled';
      default: return request.status;
    }
  }

  isOpen(request: PendingDocumentAccessRequest): boolean {
    return this.statusGroup(request.status) === 'pending';
  }

  editRequest(requestId: number): void {
    this.router.navigate(['/institution/request-documents'], { queryParams: { edit: requestId } });
  }

  loadRequests(): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.requestService.getInstitutionRequests(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: requests => this.requests.set(requests ?? []),
        error: err => this.error.set(err?.error?.error ?? err?.error?.message ?? 'Could not load your requests.'),
      });
  }

  /** More time can be asked for while access is still approved and no earlier ask is waiting. */
  canAskForMoreTime(request: PendingDocumentAccessRequest): boolean {
    return request.status === 'Approved' && !!request.accessExpiresAt && request.extensionStatus !== 'Pending';
  }

  accessEnded(request: PendingDocumentAccessRequest): boolean {
    return !!request.accessExpiresAt && new Date(request.accessExpiresAt).getTime() <= Date.now();
  }

  startExtension(request: PendingDocumentAccessRequest): void {
    this.extendingId.set(this.extendingId() === request.enquiryRequestId ? null : request.enquiryRequestId);
    this.extensionDays.set(3);
    this.extensionReason.set('');
    this.notice.set(null);
  }

  submitExtension(request: PendingDocumentAccessRequest): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }
    const reason = this.extensionReason().trim();
    if (!reason) return;

    this.submittingExtension.set(true);
    this.error.set(null);
    this.requestService.requestAccessExtension(token, request.enquiryRequestId, { days: this.extensionDays(), reason })
      .pipe(finalize(() => this.submittingExtension.set(false)))
      .subscribe({
        next: () => {
          this.extendingId.set(null);
          this.notice.set(`You asked for ${this.extensionDays()} more day${this.extensionDays() === 1 ? '' : 's'} on request #${request.enquiryRequestId}. You'll be emailed when the owner answers.`);
          this.loadRequests();
        },
        error: err => this.error.set(err?.error?.error ?? err?.error?.message ?? 'Could not ask for more time.'),
      });
  }

  cancelRequest(request: PendingDocumentAccessRequest): void {
    if (!confirm(`Cancel request #${request.enquiryRequestId}? The recipient will no longer be asked for these documents.`)) return;

    const token = this.authService.getSessionToken();
    if (!token) {
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.cancellingId.set(request.enquiryRequestId);
    this.notice.set(null);
    this.requestService.revokeInstitutionRequest(token, request.enquiryRequestId)
      .pipe(finalize(() => this.cancellingId.set(null)))
      .subscribe({
        next: () => {
          this.notice.set(`Request #${request.enquiryRequestId} was cancelled.`);
          this.loadRequests();
        },
        error: err => this.error.set(err?.error?.error ?? err?.error?.message ?? 'Could not cancel the request.'),
      });
  }
}
