import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import {
  PendingDepartmentAccessRequest,
  RouteRequestToOwnerPayload,
} from '../../../core/models/institution.models';

@Component({
  selector: 'app-department-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './department-requests.html',
  styleUrl: './department-requests.css',
})
export class DepartmentRequests implements OnInit {
  private requestService = inject(DocumentAccessRequestService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingDepartmentRequests = signal<PendingDepartmentAccessRequest[]>([]);
  readonly ownerIds = signal<Record<number, string>>({});
  readonly ownerNotes = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.loadPendingDepartmentRequests();
  }

  loadPendingDepartmentRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .getPendingDepartmentRequests()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (requests) => this.pendingDepartmentRequests.set(requests ?? []),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not load department requests.';
          this.error.set(message);
        },
      });
  }

  setOwnerId(requestId: number, value: string): void {
    this.ownerIds.update((current) => ({ ...current, [requestId]: value }));
  }

  setOwnerNote(requestId: number, value: string): void {
    this.ownerNotes.update((current) => ({ ...current, [requestId]: value }));
  }

  routeRequest(requestId: number): void {
    const targetUserId = (this.ownerIds()[requestId] ?? '').trim();
    if (!targetUserId) {
      this.error.set('Enter the target user ID before routing the request.');
      return;
    }

    const payload: RouteRequestToOwnerPayload = {
      targetUserId,
      adminNote: (this.ownerNotes()[requestId] ?? '').trim() || 'Routed by Department Admin.',
    };

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .routeRequestToOwner(requestId, payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingDepartmentRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not route the request to the owner.';
          this.error.set(message);
        },
      });
  }

  approveRequest(requestId: number): void {
    if (!confirm('Approve this department document request?')) return;

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .approveRequest(requestId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingDepartmentRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not approve the request.';
          this.error.set(message);
        },
      });
  }

  denyRequest(requestId: number): void {
    if (!confirm('Deny this department document request?')) return;

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .denyRequest(requestId, { userResponseNote: 'Department admin denied the request.' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingDepartmentRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not deny the request.';
          this.error.set(message);
        },
      });
  }
}
