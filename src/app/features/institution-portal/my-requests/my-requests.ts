import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import {
  PendingDocumentAccessRequest,
  InstitutionRequestChecklistResponse,
} from '../../../core/models/institution.models';
import { Router } from '@angular/router';
import { InstitutionAuthService } from '../auth/institution-auth';

type PendingRequestWithChecklist = PendingDocumentAccessRequest & {
  requestedDocumentStatuses?: InstitutionRequestChecklistResponse['requestedDocumentStatuses'];
};

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.css',
})
export class MyRequests implements OnInit {
  private requestService = inject(DocumentAccessRequestService);
  private router = inject(Router);
  private authService = inject(InstitutionAuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingRequests = signal<PendingRequestWithChecklist[]>([]);

  ngOnInit(): void {
    this.loadPendingRequests();
  }

  goToDashboard(): void {
    this.router.navigate(['/institution/dashboard']);
  }

  loadPendingRequests(): void {
    const token = this.authService.getSessionToken();
    if (!token) {
      this.pendingRequests.set([]);
      this.error.set('No institution session found. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .getInstitutionRequests(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (requests: PendingDocumentAccessRequest[]) => {
          this.pendingRequests.set((requests ?? []) as PendingRequestWithChecklist[]);

          // Fetch checklist details for each request and merge into the list
          const list = this.pendingRequests();
          for (const req of list) {
            try {
              this.requestService.getInstitutionRequestChecklist(token, req.enquiryRequestId).subscribe({
                next: (check) => {
                  const current = this.pendingRequests();
                  const idx = current.findIndex((r) => r.enquiryRequestId === req.enquiryRequestId);
                  if (idx >= 0) {
                    current[idx] = {
                      ...current[idx],
                      isComplete: check.isComplete,
                      missingCount: check.missingCount,
                      requestedDocumentStatuses: check.requestedDocumentStatuses,
                    };
                    this.pendingRequests.set([...current]);
                  }
                },
                error: (err) => {
                  console.debug('[MyRequests] checklist fetch failed for request', req.enquiryRequestId, err?.message ?? err);
                },
              });
            } catch (ex) {
              console.debug('[MyRequests] checklist subscription error', ex);
            }
          }
        },
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

  revokeRequest(requestId: number): void {
    if (!confirm('Revoke this outgoing request?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.requestService
      .revokeInstitutionRequest(requestId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.loadPendingRequests(),
        error: (err) => {
          const message = err?.error?.error ?? err?.error?.message ?? 'Could not revoke the request.';
          this.error.set(message);
        },
      });
  }
}
