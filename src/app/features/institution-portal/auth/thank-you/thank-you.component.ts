import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InstitutionAuthService } from '../institution-auth';

@Component({
  selector: 'app-institution-thank-you',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thank-you.component.html',
  styleUrls: ['./thank-you.component.css']
})
export class ThankYouComponent {
  constructor(public router: Router, private authService: InstitutionAuthService) {}

  /** Browsers only let a page close tabs that a script opened, so explain when it can't. */
  readonly closeHint = signal(false);

  closeTab(): void {
    try {
      window.close();
    } catch {
      // Ignored: the hint below covers it.
    }
    setTimeout(() => this.closeHint.set(!window.closed), 150);
  }

  returnToSignIn(): void {
    const token = this.authService.consumeLastAccessToken();
    if (token) {
      this.router.navigate(['/institution/auth/access'], { queryParams: { token } });
      return;
    }

    this.router.navigate(['/institution/auth/expired']);
  }
}
