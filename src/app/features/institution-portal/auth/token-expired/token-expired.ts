import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { InstitutionAuthService } from '../institution-auth';

type LinkProblem = 'expired' | 'used' | 'revoked' | 'missing' | 'invalid' | 'sent' | 'session';

interface LinkProblemCopy {
  title: string;
  description: string;
  /** Whether the institution can have a fresh link emailed to its registered address. */
  canRequestNewLink: boolean;
}

const COPY: Readonly<Record<LinkProblem, LinkProblemCopy>> = {
  expired: {
    title: 'This access link has expired',
    description: 'For security, access links only work for a limited time. You can have a new link emailed to your institution’s registered address.',
    canRequestNewLink: true
  },
  used: {
    title: 'This access link has already been used',
    description: 'Each access link works once. To sign in again, have a new link emailed to your institution’s registered address.',
    canRequestNewLink: true
  },
  revoked: {
    title: 'This access link was cancelled',
    description: 'An administrator cancelled this link. If you still need access, please contact your DocuVault administrator.',
    canRequestNewLink: false
  },
  missing: {
    title: 'No access link found',
    description: 'Open the link from your invitation email. If you can’t find it, ask your DocuVault administrator to send a new invitation.',
    canRequestNewLink: false
  },
  invalid: {
    title: 'This access link isn’t valid',
    description: 'Make sure you opened the full link from your invitation email. If it still doesn’t work, ask your DocuVault administrator for a new invitation.',
    canRequestNewLink: false
  },
  session: {
    title: 'You’re signed out',
    description: 'Your portal session ended, either because you signed out or because it timed out. To sign in again, have a new access link emailed to your institution’s registered address.',
    canRequestNewLink: true
  },
  sent: {
    title: 'Check your email',
    description: 'We’ve emailed a new access link to your institution’s registered address. Open it to sign in; for security it only works for a limited time.',
    canRequestNewLink: false
  }
};

@Component({
  selector: 'app-token-expired',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './token-expired.html',
  styleUrl: './token-expired.css'
})
export class TokenExpiredComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(InstitutionAuthService);
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly params = this.route.queryParamMap;

  // The "new link sent" route sets its state in route data; problem links pass ?reason=.
  readonly problem: LinkProblem = this.toProblem(this.route.data['reason'] ?? this.params.get('reason'));
  readonly institutionId = this.params.get('institution');
  readonly copy = COPY[this.problem];
  readonly canRequestNewLink = this.copy.canRequestNewLink && !!this.institutionId;

  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly waitSeconds = signal(0);
  private waitTimer?: ReturnType<typeof setInterval>;

  requestNewLink(): void {
    if (!this.institutionId || this.sending() || this.waitSeconds() > 0) return;

    this.sending.set(true);
    this.error.set(null);
    this.authService.requestNewAccessToken(this.institutionId)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/institution/auth/token-requested']),
        error: err => {
          // The server limits how often new links can be emailed.
          const retryAfter = Number(err?.error?.retryAfterSeconds);
          if (err?.status === 429 && Number.isFinite(retryAfter)) this.startWait(retryAfter);
          this.error.set(err?.error?.error ?? 'We couldn’t send a new link. Please try again or contact your administrator.');
        }
      });
  }

  ngOnDestroy(): void {
    this.stopWait();
  }

  private startWait(seconds: number): void {
    this.stopWait();
    this.waitSeconds.set(Math.ceil(seconds));
    this.waitTimer = setInterval(() => {
      const next = this.waitSeconds() - 1;
      this.waitSeconds.set(Math.max(next, 0));
      if (next <= 0) this.stopWait();
    }, 1000);
  }

  private stopWait(): void {
    if (this.waitTimer) clearInterval(this.waitTimer);
    this.waitTimer = undefined;
  }

  private toProblem(reason: string | null): LinkProblem {
    return reason === 'expired' || reason === 'used' || reason === 'revoked' || reason === 'missing' || reason === 'sent' || reason === 'session'
      ? reason
      : 'invalid';
  }
}
