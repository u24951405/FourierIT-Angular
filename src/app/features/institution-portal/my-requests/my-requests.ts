import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.css',
})
export class MyRequests implements OnInit {
  private requestService = inject(DocumentAccessRequestService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);

  ngOnInit(): void {
    this.loadPendingRequests();
  }

  loadPendingRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .getPendingRequests()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (requests) => this.pendingRequests.set(requests ?? []),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not load your pending requests.';
          this.error.set(message);
        },
      });
  }

  approveRequest(requestId: number): void {
    if (!confirm('Approve this document access request?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .approveRequest(requestId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not approve the request.';
          this.error.set(message);
        },
      });
  }

  denyRequest(requestId: number): void {
    if (!confirm('Deny this document access request?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .denyRequest(requestId, { userResponseNote: 'Request denied by institution portal user.' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not deny the request.';
          this.error.set(message);
        },
      });
  }
}
