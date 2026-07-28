import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { Router } from '@angular/router';
import { InstitutionAuthService } from '../auth/institution-auth';

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
  readonly pendingRequests = signal<any[]>([]);

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
        next: (requests) => {
          this.pendingRequests.set(requests ?? []);
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
