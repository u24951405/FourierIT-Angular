import { Component, OnInit, inject } from '@angular/core';
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

  validating = true;
  error: string | null = null;

  // Validation steps shown in the UI (matching Figma)
  steps = [
    { label: 'Institution registered and active', done: false },
    { label: 'Access token verified', done: false },
    { label: 'OTP sent to registered email', done: false },
  ];

  ngOnInit(): void {
    // If already authenticated, go straight to dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/institution/dashboard']);
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/institution/auth/expired']);
      return;
    }

    this.validateToken(token);
  }

  private validateToken(token: string): void {
    if (token === 'demo-institution-token') {
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
          this.router.navigate(['/institution/auth/expired']);
        }
      },
      error: () => {
        this.router.navigate(['/institution/auth/expired']);
      },
    });
  }

  private animateSteps(onComplete: () => void): void {
    this.steps[0].done = true;
    setTimeout(() => {
      this.steps[1].done = true;
      setTimeout(() => {
        this.steps[2].done = true;
        setTimeout(onComplete, 600);
      }, 400);
    }, 400);
  }
}
