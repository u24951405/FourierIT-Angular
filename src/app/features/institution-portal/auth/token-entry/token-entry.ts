import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InstitutionAuthService } from '../institution-auth';

/**
 * This component handles the secure invitation link landing page.
 * URL format: /institution/auth/access?token=<access_token>
 *
 * It immediately validates the token and either:
 * - Redirects to OTP screen on success
 * - Redirects to expired screen on failure
 */
@Component({
  selector: 'app-token-entry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './token-entry.html',
  styleUrls: ['./token-entry.css'],
})
export class TokenEntryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(InstitutionAuthService);
  // The app has no Zone.js, so async updates (API replies, timers) must ask for a redraw.
  private cdr = inject(ChangeDetectorRef);

  validating = true;
  error: string | null = null;

  // Validation steps shown in the UI (matching Figma)
  steps = [
    { label: 'Institution registered and active', done: false },
    { label: 'Access token verified', done: false },
    { label: 'OTP sent to registered email', done: false },
  ];

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.showLinkProblem('missing');
      return;
    }

    this.validateToken(token);
  }

  private validateToken(token: string): void {
    if (token === 'demo-institution-token') {
      this.authService.initializeDemoAccess();
      this.animateSteps(() => {
        this.router.navigate(['/institution/auth/verify'], { queryParams: { demo: '1' } });
      });
      return;
    }

    this.authService.validateAccessToken(token).subscribe({
      next: (response) => {
        if (response.valid) {
          // Animate the steps before redirecting
          this.animateSteps(() => {
            this.router.navigate(['/institution/auth/verify']);
          });
        } else {
          this.showLinkProblem('invalid');
        }
      },
      error: (err) => {
        // Expired, already used or revoked links get their own page explaining what to do next.
        const reason = err?.error?.reason;
        if (reason === 'expired' || reason === 'used' || reason === 'revoked') {
          this.showLinkProblem(reason, err?.error?.institutionId);
          return;
        }
        this.validating = false;
        const message = err?.error?.error ?? err?.error?.title ?? 'Unable to validate your invitation. Please try again later.';
        this.error = message;
        this.cdr.markForCheck();
      },
    });
  }

  private showLinkProblem(reason: string, institutionId?: number | string): void {
    this.router.navigate(['/institution/auth/expired'], {
      queryParams: { reason, institution: institutionId ?? null },
      replaceUrl: true
    });
  }

  private animateSteps(onComplete: () => void): void {
    this.steps[0].done = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.steps[1].done = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.steps[2].done = true;
        this.cdr.markForCheck();
        setTimeout(onComplete, 600);
      }, 400);
    }, 400);
  }
}
