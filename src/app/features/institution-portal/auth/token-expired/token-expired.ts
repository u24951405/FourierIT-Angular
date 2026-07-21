import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-token-expired',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="portal-shell">
      <div class="portal-card">
        <div class="portal-card__header">
          <div class="portal-card__brand">
            <span class="portal-card__logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </span>
            <div>
              <span class="portal-card__brand-name">DocuVault</span>
              <span class="portal-card__brand-sub">Institution Secure Portal</span>
            </div>
          </div>
          <span class="portal-card__encrypted">
            <span class="portal-card__encrypted-dot"></span>
            Encrypted
          </span>
        </div>

        <div class="portal-card__body">
          <div class="expired-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 class="expired-title">Access Link Invalid or Expired</h2>
          <p class="expired-desc">
            Your invitation link is no longer valid. This may be because the link has expired,
            already been used, or the institution account is inactive.
          </p>
          <p class="expired-contact">
            Please contact your DocuVault administrator to receive a new secure access link.
          </p>
        </div>

        <div class="portal-card__footer">
          Powered by Fourier Group · FICA/KYC Compliance Platform
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e8e8e4;
      padding: 1.5rem;
    }
    .portal-card {
      width: 100%;
      max-width: 380px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    }
    .portal-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: #1e2a3a;
      color: #fff;
    }
    .portal-card__brand { display: flex; align-items: center; gap: 0.625rem; }
    .portal-card__logo {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px;
      background: rgba(255,255,255,0.15); border-radius: 6px;
    }
    .portal-card__brand-name { display: block; font-size: 0.9375rem; font-weight: 700; }
    .portal-card__brand-sub { display: block; font-size: 0.6875rem; opacity: 0.65; }
    .portal-card__encrypted { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; opacity: 0.8; }
    .portal-card__encrypted-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; }
    .portal-card__body {
      padding: 2.5rem 1.75rem 2rem;
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      text-align: center;
    }
    .portal-card__footer {
      padding: 0.875rem; text-align: center;
      font-size: 0.6875rem; color: #9ca3af;
      background: #f9fafb; border-top: 1px solid #f3f4f6;
    }
    .expired-icon {
      display: flex; align-items: center; justify-content: center;
      width: 56px; height: 56px;
      background: #fef2f2; border-radius: 50%; color: #dc2626;
    }
    .expired-title { font-size: 1rem; font-weight: 700; color: #1e2a3a; margin: 0; }
    .expired-desc { font-size: 0.8125rem; color: #6b7280; margin: 0; line-height: 1.5; }
    .expired-contact { font-size: 0.8125rem; color: #374151; margin: 0; font-weight: 500; }
  `],
})
export class TokenExpiredComponent {}
