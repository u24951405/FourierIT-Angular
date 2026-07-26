import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import type { InstitutionRequestSummary } from '../../../core/models/institution.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private institutionAuthService = inject(InstitutionAuthService);
  private requestService = inject(DocumentAccessRequestService);

  readonly institutionName = signal('');
  readonly institutionCode = signal('');
  readonly authenticatedTime = signal('');
  readonly sessionExpiryLabel = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly stats = signal<InstitutionRequestSummary>({
    pendingRequests: 0,
    approvedRequests: 0,
    deniedRequests: 0,
  });
  readonly expiryNoticeCount = signal(0);
  readonly showExpiryNotice = signal(true);

  ngOnInit(): void {
    this.institutionName.set(this.institutionAuthService.institutionName());
    this.institutionCode.set(this.institutionAuthService.institutionCode());
    this.authenticatedTime.set(this.formatAuthenticatedTime());
    this.sessionExpiryLabel.set(this.institutionAuthService.getSessionExpiryLabel());
    this.loadRequestSummary();
  }

  private formatAuthenticatedTime(): string {
    const session = this.institutionAuthService.session();
    if (!session?.authenticatedAt) {
      return 'Unknown';
    }

    const date = new Date(session.authenticatedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private loadRequestSummary(): void {
    const sessionToken = this.institutionAuthService.getSessionToken();

    this.loading.set(true);
    this.errorMessage.set(null);

    if (sessionToken) {
      // Institution portal: use token-based summary endpoint
      this.requestService.getInstitutionAccessRequestSummary(sessionToken).subscribe({
        next: (summary) => {
          this.stats.set(summary ?? {
            pendingRequests: 0,
            approvedRequests: 0,
            deniedRequests: 0,
          });
        },
        error: () => {
          this.errorMessage.set('Unable to load request summary.');
        },
        complete: () => this.loading.set(false),
      });
      return;
    }

    // Fallback for internal users (e.g. admin UI)
    const institutionId = Number(this.institutionAuthService.getInstitutionId());
    if (!institutionId || institutionId <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Unable to load institution stats. Please refresh the portal.');
      return;
    }

    this.requestService.getInstitutionRequestSummary(institutionId).subscribe({
      next: (summary) => {
        this.stats.set(summary ?? {
          pendingRequests: 0,
          approvedRequests: 0,
          deniedRequests: 0,
        });
      },
      error: () => {
        this.errorMessage.set('Unable to load request summary.');
      },
      complete: () => this.loading.set(false),
    });
  }

  goToRequestDocuments(): void {
    this.router.navigate(['/institution/request-documents']);
  }

  goToMyRequests(): void {
    this.router.navigate(['/institution/my-requests']);
  }

  goToApprovedDocuments(): void {
    this.router.navigate(['/institution/approved-documents']);
  }

  goToDepartmentRequests(): void {
    this.router.navigate(['/administration/department-requests']);
  }

  goToRenew(): void {
    this.router.navigate(['/institution/request-documents']);
  }

  signOut(): void {
    this.institutionAuthService.signOut();
  }
}
