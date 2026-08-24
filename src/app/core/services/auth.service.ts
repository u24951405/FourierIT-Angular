import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

const TOKEN_KEY = 'docuvault_token';

export interface LoginPayload { username: string; password: string; }
export interface AuthResponse { userName: string; email: string; token: string; }
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  jobTitle: string;
  username: string;
  emailAddress: string;
  password: string;
  entityTypeId?: number;
  entityIdentificationNumber?: string;
  roles: string[];
}

export interface RegisterResponse {
  message?: string;
  email?: string;
  requiresVerification?: boolean;
  token?: string;
}

export interface VerifyRegistrationOtpPayload {
  emailAddress: string;
  otp: string;
}

export interface EntityVerificationResponse {
  isValid: boolean;
  message?: string;
  providerUnavailable?: boolean;
}

export interface EntityTypeOption {
  entityTypeId: number;
  name: string;
}

export interface PasswordPolicy {
  requireDigit: boolean;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNonAlphanumeric: boolean;
  requiredLength: number;
}

export interface ForgotPasswordPayload {
  emailAddress: string;
}

export interface ResetPasswordPayload {
  emailAddress: string;
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

/** Full account + profile from GET /api/user/me */
export interface CurrentAccount {
  userId: string;
  userName: string;
  email: string;
  accountStatus: string;
  phoneNumber: string | null;
  roles: string[];
  profileId: number | null;
  firstName: string | null;
  lastName: string | null;
  profilePhoneNumber: string | null;
  jobTitle: string | null;
  dateOfBirth: string | null;
  departmentId: number | null;
  departmentName: string | null;
  profileImageUrl?: string | null;
  profileImage?: string | null;
  avatarUrl?: string | null;
  otpExpiryMinutes?: number | null;
}

export interface UpdateCurrentAccountPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  jobTitle: string;
  emailAddress: string;
  role: string;
  accountStatus: string;
  profileImageUrl?: string | null;
  otpExpiryMinutes?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  static resolveProfileImageUrl(account: Partial<CurrentAccount> | null | undefined): string | null {
    if (!account) return null;
    const candidates = [
      account.profileImageUrl,
      account.profileImage,
      account.avatarUrl
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    return null;
  }
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/user`;

  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    this.hydrateUserFromToken();
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, payload).pipe(
      tap(res => {
        const token = (res as any).token ?? (res as any).Token;
        const email = (res as any).email ?? (res as any).Email ?? '';
        if (!token) {
          throw new Error('Login response did not include a token.');
        }

        localStorage.setItem(TOKEN_KEY, token);
        this.currentUser.set(this.userFromToken(token, email));
      })
    );
  }

  register(payload: RegisterPayload): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, payload);
  }

  verifyRegistrationOtp(payload: VerifyRegistrationOtpPayload): Observable<{ message: string; token?: string }> {
    return this.http.post<{ message: string; token?: string }>(`${this.base}/verify-registration-otp`, payload);
  }

  verifyEntity(entityTypeId: number, identificationNumber: string): Observable<EntityVerificationResponse> {
    return this.http.post<EntityVerificationResponse>(`${this.base}/verify-entity`, {
      entityTypeId,
      identificationNumber
    });
  }

  getEntityTypes(): Observable<EntityTypeOption[]> {
    return this.http.get<EntityTypeOption[] | { value?: EntityTypeOption[] }>(`${this.base}/entity-types`).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.value)) return response.value;
        return [];
      })
    );
  }

  /**
   * Password policy is optional on the backend. The registration UI already
   * has client-side fallbacks, so return null instead of making a broken request.
   */
  getPasswordPolicy(): Observable<PasswordPolicy | null> {
    return of(null);
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, payload);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    if (this.isSuperAdmin()) return true;
    const roles = this.getRolesFromToken();
    const normalizedTarget = this.normalizeRole(role);
    return roles.some(r => this.normalizeRole(r) === normalizedTarget);
  }

  private normalizeRole(role: string): string {
    return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  isSuperAdmin(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const claims = this.decodeTokenClaims(token);
    if (!claims) return false;
    const value = claims['superadmin'];
    if (typeof value === 'boolean') return value;
    return typeof value === 'string' && value.toLowerCase() === 'true';
  }

  /** Roles from the current JWT (order preserved). */
  getUserRoles(): string[] {
    const roles = this.getRolesFromToken();
    if (this.isSuperAdmin() && !roles.some(r => this.normalizeRole(r) === this.normalizeRole('Super Admin'))) {
      return [...roles, 'Super Admin'];
    }
    return roles;
  }

  /**
   * True when the user has exactly one role and it is Document Owner.
   * Those users are limited to My Documents in the UI and routing.
   */
  isDocumentOwnerOnly(): boolean {
    const roles = this.getRolesFromToken();
    if (roles.length !== 1) return false;
    return this.normalizeRole(roles[0]) === this.normalizeRole('Document Owner');
  }

  /**
   * Stakeholder accounts are view-only (browse lists, no create/update/delete, no document upload)
   * unless they are also Department Admin.
   */
  isStakeholderViewer(): boolean {
    if (this.isSuperAdmin()) return false;
    return this.hasRole('Stakeholder') && !this.hasRole('Department Admin');
  }

  /**
   * Upload is permitted for Document Owners and Department Admins.
   * Super Admin is not automatically allowed to upload documents.
   */
  canUploadDocuments(): boolean {
    const roles = this.getRolesFromToken();
    return roles.some(r => this.normalizeRole(r) === this.normalizeRole('Document Owner'))
      || roles.some(r => this.normalizeRole(r) === this.normalizeRole('Department Admin'));
  }

  canReviewDocuments(): boolean {
    return this.hasRole('Compliance Officer') || this.hasRole('Department Admin');
  }

  hasDocumentOwnerRole(): boolean {
    return this.getRolesFromToken().some(r => this.normalizeRole(r) === this.normalizeRole('Document Owner'));
  }

  getCurrentUserId(): string | null {
    const current = this.currentUser();
    if (current?.id) {
      return current.id;
    }

    const token = this.getToken();
    if (!token) return null;

    const claims = this.decodeTokenClaims(token);
    if (!claims) return null;

    const sub = claims['sub'] ?? claims['nameid'] ?? claims['nameidentifier'];
    return typeof sub === 'string' ? sub : null;
  }

  logActivity(eventType: string, message: string): void {
    console.info(`[auth] ${eventType}: ${message}`);
  }

  /** Post-login home: My Documents for document-owner-only, otherwise dashboard. */
  getDefaultAppPath(): string {
    return this.isDocumentOwnerOnly() ? '/dashboard/owner' : '/dashboard';
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  isLoggedIn(): boolean   { return !!this.getToken(); }

  getCurrentAccount(): Observable<CurrentAccount> {
    return this.http.get<CurrentAccount>(`${this.base}/me`);
  }

  uploadProfileImage(file: File): Observable<{ message: string; imageUrl?: string | null }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ message: string; imageUrl?: string | null }>(`${this.base}/profile-image`, formData);
  }

  removeProfileImage(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/profile-image`);
  }

  updateCurrentAccount(profileId: number, payload: UpdateCurrentAccountPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/profile/${profileId}`, payload);
  }

  private hydrateUserFromToken(): void {
    const token = this.getToken();
    if (!token) return;
    const claims = this.decodeTokenClaims(token);
    if (!claims) return;
    const email = typeof claims['email'] === 'string' ? claims['email'] : '';
    this.currentUser.set(this.userFromToken(token, email));
  }

  private userFromToken(token: string, fallbackEmail: string): User {
    const claims = this.decodeTokenClaims(token) ?? {};
    const roles = this.extractRoles(claims);
    const name = claims['given_name'] ?? '';
    const safeName = typeof name === 'string' ? name : '';
    const nameParts = safeName.split(' ');
    const sub = claims['sub'];
    return {
      id: typeof sub === 'string' ? sub : '',
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: typeof claims['email'] === 'string' ? claims['email'] : fallbackEmail,
      role: roles[0] ?? ''
    };
  }

  private decodeTokenClaims(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      let normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padLength = 4 - (normalized.length % 4);
      if (padLength > 0 && padLength < 4) {
        normalized += '='.repeat(padLength);
      }
      const decoded = atob(normalized);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getRolesFromToken(): string[] {
    const token = this.getToken();
    if (!token) return [];
    const claims = this.decodeTokenClaims(token);
    if (!claims) return [];
    return this.extractRoles(claims);
  }

  private extractRoles(claims: Record<string, unknown>): string[] {
    const candidates = [
      claims['roles'],
      claims['role'],
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role']
    ];

    const roles: string[] = [];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        candidate.forEach(item => {
          if (typeof item === 'string' && item.trim().length > 0) {
            roles.push(...this.parseRoleString(item));
          }
        });
        continue;
      }

      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        roles.push(...this.parseRoleString(candidate));
      }
    }

    return [...new Set(roles.map(r => r.trim()).filter(Boolean))];
  }

  private parseRoleString(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map(item => item.trim());
        }
      } catch {
        // fall through to comma split
      }
    }

    return trimmed.split(',').map(role => role.trim()).filter(Boolean);
  }
}