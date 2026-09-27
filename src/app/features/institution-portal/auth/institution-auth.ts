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
const LAST_INSTITUTION_ID_KEY = 'institution_last_id';
const LAST_ACCESS_TOKEN_KEY = 'institution_last_access_token';

// Max OTP attempts before session lock
const MAX_OTP_ATTEMPTS = 3;

// Fallback session length if the server doesn't send one (it normally does, from the Super Admin's session timer).
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
   * Hydrated from localStorage so a signed-in institution stays signed in across page reloads
   * until the session expires or they sign out.
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

  // OTP attempt tracking. The server enforces the limit (set by the Super Admin) and reports how many
  // attempts are left; the local counter is only used for the offline demo session.
  private otpAttempts = signal(0);
  private serverAttemptsRemaining = signal<number | null>(null);
  readonly isSessionLocked = computed(() => {
    const remaining = this.serverAttemptsRemaining();
    return remaining !== null ? remaining <= 0 : this.otpAttempts() >= MAX_OTP_ATTEMPTS;
  });
  readonly remainingAttempts = computed(() => this.serverAttemptsRemaining() ?? MAX_OTP_ATTEMPTS - this.otpAttempts());

  private resetAttempts(): void {
    this.otpAttempts.set(0);
    this.serverAttemptsRemaining.set(null);
  }

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
            this.resetAttempts();

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
    this.resetAttempts();

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
          error: (err) => {
            // The server says how many attempts are left for this code.
            const remaining = err?.error?.attemptsRemaining;
            if (typeof remaining === 'number') {
              this.serverAttemptsRemaining.set(remaining);
            }

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
    // Allowed even after too many wrong codes: the server cancelled that code, so a new one is needed.
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
          this.resetAttempts();
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

    // Kept until the session expires or the institution signs out.
    localStorage.setItem(INSTITUTION_SESSION_KEY, JSON.stringify(session));
    // Survives signing out, so the "signed out" page can offer to email a new link.
    try { localStorage.setItem(LAST_INSTITUTION_ID_KEY, session.institutionId); } catch { /* storage unavailable */ }
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

  /** The institution that last signed in on this browser, if any. */
  getLastInstitutionId(): string | null {
    try { return localStorage.getItem(LAST_INSTITUTION_ID_KEY); } catch { return null; }
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
   * Signs the institution out: the session is ended on the server (so a copied token stops working)
   * and removed from this browser, so the next person on a shared computer can't reopen the portal.
   * The internal user session (docuvault_token) is NOT touched.
   */
  signOut(): void {
    this.clearSession();
    this.router.navigate(['/institution/thank-you']);
  }

  /** The "End session" buttons: the same as signing out. */
  endSession(): void {
    this.signOut();
  }

  private clearSession(): void {
    const session = this.session();

    if (session) {
      this.logAuditEvent({
        userId: session.institutionId,
        institutionId: session.institutionId,
        timestamp: new Date().toISOString(),
        actionType: AuditEventType.LOGOUT,
      });

      if (session.sessionToken) {
        // Best effort: the browser copy is removed below either way.
        this.http.post<void>(`${this.base}/auth/logout`, null, { params: { token: session.sessionToken } })
          .subscribe({ error: () => undefined });
      }

      // Lets "Return to sign in" on the thank-you page start again with the same invitation link.
      this.rememberLastAccessToken(session.accessToken);
    }

    localStorage.removeItem(INSTITUTION_SESSION_KEY);
    this.session.set(null);
    this.resetAttempts();
    this.pendingValidation = null;
    this.pendingAccessToken = null;
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
