import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import type { InstitutionRequestSummary } from '../../../core/models/institution.models';

/** Portal home: who is signed in, how their requests stand, and where to go next. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private readonly auth = inject(InstitutionAuthService);
  private readonly requestService = inject(DocumentAccessRequestService);

  readonly institutionName = this.auth.institutionName;
  readonly institutionCode = this.auth.institutionCode;
  readonly signedInAt = signal('');
  readonly sessionEnds = signal('');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<InstitutionRequestSummary>({ pendingRequests: 0, approvedRequests: 0, deniedRequests: 0 });

  ngOnInit(): void {
    const session = this.auth.session();
    const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    this.signedInAt.set(session?.authenticatedAt ? new Date(session.authenticatedAt).toLocaleTimeString([], time) : '');
    this.sessionEnds.set(session?.expiresAt ? new Date(session.expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
    this.loadSummary();
  }

  loadSummary(): void {
    const token = this.auth.getSessionToken();
    if (!token) {
      this.loading.set(false);
      this.error.set('Your session has ended. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.requestService.getInstitutionAccessRequestSummary(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: summary => this.stats.set(summary ?? { pendingRequests: 0, approvedRequests: 0, deniedRequests: 0 }),
        error: () => this.error.set('Could not load your request summary.'),
      });
  }
}
