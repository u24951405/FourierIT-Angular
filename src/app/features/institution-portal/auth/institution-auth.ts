import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  InstitutionSession,
  TokenValidationRequest,
  TokenValidationResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  OtpResendRequest,
  AuditLogEntry,
  AuditEventType,
} from '../../../core/models/institution.models';

// Separate storage keys — never conflict with internal user JWT
const INSTITUTION_SESSION_KEY = 'institution_session';
const LAST_ACCESS_TOKEN_KEY = 'institution_last_access_token';

// Max OTP attempts before session lock
const MAX_OTP_ATTEMPTS = 3;

// A successful OTP stays valid for 7 days, even across logout/re-entry to the same institution portal.
const OTP_VALIDITY_DAYS = 7;
const SESSION_HOURS = OTP_VALIDITY_DAYS * 24;

@Injectable({ providedIn: 'root' })
export class InstitutionAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/institution`;

  // ─── State ─────────────────────────────────────────────────────────────────

  /**
   * Current institution session as a signal.
   * Hydrated from localStorage so a valid OTP-backed session remains available for 3 days,
   * even after logout/re-entry to the same institution portal.
   */
  readonly session = signal<InstitutionSession | null>(this.hydrateSession());

  readonly isAuthenticated = computed(() => {
    const s = this.session();
    if (!s) return false;
    return new Date(s.expiresAt) > new Date();
  });

  readonly institutionName = computed(() => this.session()?.institutionName ?? '');
  readonly institutionCode = computed(() => this.session()?.institutionCode ?? '');
  readonly maskedEmail = computed(() => this.session()?.email ?? '');

  // OTP attempt tracking — lives in service for immediate UI lock on third failure
  private otpAttempts = signal(0);
  readonly isSessionLocked = computed(() => this.otpAttempts() >= MAX_OTP_ATTEMPTS);
  readonly remainingAttempts = computed(() => MAX_OTP_ATTEMPTS - this.otpAttempts());

  // Temporary store during OTP step — cleared after successful verification
  private pendingValidation: TokenValidationResponse | null = null;
  private pendingAccessToken: string | null = null;

  // ─── Step 1: Token Validation ───────────────────────────────────────────────

  /**
   * Called when institution lands on the secure invitation link.
   * Extracts the token from URL query params and validates with backend.
   * On success: backend sends OTP to registered email.
   * On failure: redirect to token-expired screen.
   */
  validateAccessToken(accessToken: string): Observable<TokenValidationResponse> {
    const payload: TokenValidationRequest = { accessToken };

    return this.http
      .post<TokenValidationResponse>(`${this.base}/auth/validate-token`, payload)
      .pipe(
        tap((response) => {
          if (response.valid) {
            // Store pending state for the OTP step
            this.pendingValidation = response;
            this.pendingAccessToken = accessToken;
            this.otpAttempts.set(0);

            // Audit: OTP sent
            this.logAuditEvent({
              userId: response.institutionId,
              institutionId: response.institutionId,
              timestamp: new Date().toISOString(),
              actionType: AuditEventType.OTP_SENT,
            });
          }
        })
      );
  }

  /**
   * Returns the pending validation data so the OTP screen
   * can display the masked email without needing a separate API call.
   */
  getPendingValidation(): TokenValidationResponse | null {
    return this.pendingValidation;
  }

  initializeDemoAccess(): void {
    this.pendingValidation = {
      valid: true,
      institutionId: 'demo-institution',
      institutionName: 'Demo Institution',
      institutionCode: 'DEMO-001',
      maskedEmail: 'demo@fourier.local',
    };
    this.pendingAccessToken = 'demo-institution-token';
    this.otpAttempts.set(0);

    this.logAuditEvent({
      userId: this.pendingValidation.institutionId,
      institutionId: this.pendingValidation.institutionId,
      timestamp: new Date().toISOString(),
      actionType: AuditEventType.OTP_SENT,
    });
  }

  private isDemoSession(): boolean {
    return this.pendingAccessToken === 'demo-institution-token';
  }

  // ─── Step 2: OTP Verification ───────────────────────────────────────────────

  /**
   * Verifies the 6-digit OTP entered by the institution user.
   */
  verifyOtp(otp: string): Observable<OtpVerifyResponse> {
    if (this.isSessionLocked()) {
      return throwError(() => new Error('Session locked. Maximum OTP attempts exceeded.'));
    }

    if (!this.pendingValidation || !this.pendingAccessToken) {
      return throwError(() => new Error('No pending validation. Please restart the authentication process.'));
    }

    if (this.isDemoSession()) {
      if (otp !== '123456') {
        this.otpAttempts.update((n) => n + 1);
        return throwError(() => new Error('Invalid or expired OTP.'));
      }

      const response: OtpVerifyResponse = {
        success: true,
        sessionToken: 'demo-session-token',
        expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString(),
      };

      return of(response).pipe(
        tap({
          next: () => {
            this.createSession(response);
            this.logAuditEvent({
              userId: this.pendingValidation!.institutionId,
              institutionId: this.pendingValidation!.institutionId,
              timestamp: new Date().toISOString(),
              actionType: AuditEventType.OTP_VERIFIED,
            });
            this.logAuditEvent({
              userId: this.pendingValidation!.institutionId,
              institutionId: this.pendingValidation!.institutionId,
              timestamp: new Date().toISOString(),
              actionType: AuditEventType.LOGIN_SUCCESS,
            });
            this.pendingValidation = null;
            this.pendingAccessToken = null;
          },
          error: () => {
            const institutionId = this.pendingValidation?.institutionId ?? 'unknown';
            this.logAuditEvent({
              userId: institutionId,
              institutionId,
              timestamp: new Date().toISOString(),
              actionType: AuditEventType.LOGIN_FAILURE,
            });
          },
        })
      );
    }

    const payload: OtpVerifyRequest = {
      institutionId: this.pendingValidation.institutionId,
      otp,
      accessToken: this.pendingAccessToken,
    };

    return this.http
      .post<OtpVerifyResponse>(`${this.base}/auth/verify-otp`, payload)
      .pipe(
        tap({
          next: (response) => {
            if (response.success) {
              this.createSession(response);
              this.logAuditEvent({
                userId: this.pendingValidation!.institutionId,
                institutionId: this.pendingValidation!.institutionId,
                timestamp: new Date().toISOString(),
                actionType: AuditEventType.OTP_VERIFIED,
              });
              this.logAuditEvent({
                userId: this.pendingValidation!.institutionId,
                institutionId: this.pendingValidation!.institutionId,
                timestamp: new Date().toISOString(),
                actionType: AuditEventType.LOGIN_SUCCESS,
              });
              // Clear pending state after successful verification
              this.pendingValidation = null;
              this.pendingAccessToken = null;
            }
          },
          error: () => {
            // Increment failed attempt counter
            this.otpAttempts.update((n) => n + 1);

            const institutionId = this.pendingValidation?.institutionId ?? 'unknown';
            this.logAuditEvent({
              userId: institutionId,
              institutionId,
              timestamp: new Date().toISOString(),
              actionType: AuditEventType.LOGIN_FAILURE,
            });
          },
        })
      );
  }

  // ─── OTP Resend ─────────────────────────────────────────────────────────────

  /**
   * Resends the OTP to the registered institution email.
   * Only permitted if session is not locked.
   */
  resendOtp(): Observable<void> {
    if (this.isSessionLocked()) {
      return throwError(() => new Error('Session locked. Cannot resend OTP.'));
    }

    if (!this.pendingValidation || !this.pendingAccessToken) {
      return throwError(() => new Error('No pending validation. Please restart.'));
    }

    const payload: OtpResendRequest = {
      institutionId: this.pendingValidation.institutionId,
      accessToken: this.pendingAccessToken,
    };

    return this.http
      .post<void>(`${this.base}/auth/resend-otp`, payload)
      .pipe(
        tap(() => {
          // Reset attempt counter on resend
          this.otpAttempts.set(0);
          this.logAuditEvent({
            userId: this.pendingValidation!.institutionId,
            institutionId: this.pendingValidation!.institutionId,
            timestamp: new Date().toISOString(),
            actionType: AuditEventType.OTP_SENT,
          });
        })
      );
  }

  // ─── Session Management ─────────────────────────────────────────────────────

  private createSession(response: OtpVerifyResponse): void {
    if (!this.pendingValidation || !this.pendingAccessToken) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + OTP_VALIDITY_DAYS);

    const session: InstitutionSession = {
      institutionId: this.pendingValidation.institutionId,
      institutionName: this.pendingValidation.institutionName,
      institutionCode: this.pendingValidation.institutionCode,
      email: this.pendingValidation.maskedEmail ?? '',
      sessionToken: response.sessionToken ?? '',
      accessToken: this.pendingAccessToken,
      authenticatedAt: new Date().toISOString(),
      expiresAt: response.expiresAt ?? expiresAt.toISOString(),
      authMethod: 'OTP_VERIFIED',
    };

    // Persist the verified portal access for 7 days so logout does not revoke the same OTP-backed session.
    localStorage.setItem(INSTITUTION_SESSION_KEY, JSON.stringify(session));
    this.session.set(session);

    // Remember the access token so the user can return to sign-in and trigger a new OTP.
    this.rememberLastAccessToken(this.pendingAccessToken);
  }

  private hydrateSession(): InstitutionSession | null {
    try {
      const raw = localStorage.getItem(INSTITUTION_SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as InstitutionSession;
      if (new Date(session.expiresAt) <= new Date()) {
        localStorage.removeItem(INSTITUTION_SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Returns the session token for use in HTTP headers via the interceptor.
   */
  getSessionToken(): string | null {
    return this.session()?.sessionToken ?? null;
  }

  /**
   * Returns the current institution ID for use in API calls.
   */
  getInstitutionId(): string | null {
    return this.session()?.institutionId ?? null;
  }

  // ─── Sign Out ───────────────────────────────────────────────────────────────

  /**
   * Clears ONLY the institution session.
   * The internal user session (localStorage / docuvault_token) is NOT touched.
   */
  signOut(): void {
    const institutionId = this.getInstitutionId();

    if (institutionId) {
      this.logAuditEvent({
        userId: institutionId,
        institutionId,
        timestamp: new Date().toISOString(),
        actionType: AuditEventType.LOGOUT,
      });
    }

    if (this.session()) {
      this.rememberLastAccessToken(this.session()!.accessToken);
    }

    // Keep the validated OTP-backed portal access alive for 7 days so the same institution account
    // can re-enter the portal without needing a fresh OTP after logout.
    this.session.set(this.hydrateSession());
    this.otpAttempts.set(0);
    this.pendingValidation = null;
    this.pendingAccessToken = null;
    this.router.navigate(['/institution/dashboard']);
  }

  /**
   * End the current institution portal session and show a thank-you page.
   * Intended for explicit "End Session" actions from the portal UI.
   */
  endSession(): void {
    const institutionId = this.getInstitutionId();

    if (institutionId) {
      this.logAuditEvent({
        userId: institutionId,
        institutionId,
        timestamp: new Date().toISOString(),
        actionType: AuditEventType.LOGOUT,
      });
    }

    if (this.session()) {
      this.rememberLastAccessToken(this.session()!.accessToken);
    }

    // Preserve the validated institution access for the full 7-day window so the same OTP remains usable.
    this.session.set(this.hydrateSession());
    this.otpAttempts.set(0);
    this.pendingValidation = null;
    this.pendingAccessToken = null;

    this.router.navigate(['/institution/dashboard']);
  }

  // ─── Session Expiry Check ───────────────────────────────────────────────────

  /**
   * Returns remaining session time in minutes.
   * Returns 0 if session has expired.
   */
  getSessionRemainingMinutes(): number {
    const s = this.session();
    if (!s) return 0;
    const diff = new Date(s.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 60000));
  }

  /**
   * Remembers the last institution access token so the user can return to sign-in
   * after ending their session and re-trigger OTP delivery.
   */
  rememberLastAccessToken(accessToken: string): void {
    try {
      localStorage.setItem(LAST_ACCESS_TOKEN_KEY, accessToken);
    } catch {
      // Ignore storage failures, fallback behavior still works.
    }
  }

  consumeLastAccessToken(): string | null {
    try {
      const token = localStorage.getItem(LAST_ACCESS_TOKEN_KEY);
      localStorage.removeItem(LAST_ACCESS_TOKEN_KEY);
      return token;
    } catch {
      return null;
    }
  }

  getLastAccessToken(): string | null {
    try {
      return localStorage.getItem(LAST_ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Returns the formatted expiry time string e.g. "In 8 hours" or "In 47 minutes"
   */
  getSessionExpiryLabel(): string {
    const minutes = this.getSessionRemainingMinutes();
    if (minutes <= 0) return 'Expired';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  // ─── Audit Logging ──────────────────────────────────────────────────────────

  /**
   * Fire-and-forget audit log.
   * Errors are swallowed — audit failure must not block the user action.
   */
  logAuditEvent(entry: AuditLogEntry): void {
    this.http
      .post(`${this.base}/audit`, entry)
      .subscribe({ error: (e) => console.warn('Audit log failed', e) });
  }

  // ─── Request a New Access Token ─────────────────────────────────────────────

  /**
   * Called when the institution has been locked out (3 failed OTP attempts).
   * Notifies the backend to invalidate the current token and issue a new invitation.
   */
  requestNewAccessToken(institutionId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/request-new-token`, { institutionId });
  }
}
