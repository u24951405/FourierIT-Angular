import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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
  roles: string[];
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
}

@Injectable({ providedIn: 'root' })
export class AuthService {
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
        localStorage.setItem(TOKEN_KEY, res.token);
        this.currentUser.set(this.userFromToken(res.token, res.email));
      })
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, payload);
  }


  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    const roles = this.getRolesFromToken();
    return roles.some(r => r.toLowerCase() === role.toLowerCase());
  }

  /** Roles from the current JWT (order preserved). */
  getUserRoles(): string[] {
    return this.getRolesFromToken();
  }

  /**
   * True when the user has exactly one role and it is Document Owner.
   * Those users are limited to My Documents in the UI and routing.
   */
  isDocumentOwnerOnly(): boolean {
    const roles = this.getRolesFromToken();
    if (roles.length !== 1) return false;
    return roles[0].trim().toLowerCase() === 'document owner';
  }

  /**
   * Stakeholder accounts are view-only (browse lists, no create/update/delete, no document upload)
   * unless they are also Department Admin.
   */
  isStakeholderViewer(): boolean {
    return this.hasRole('Stakeholder') && !this.hasRole('Department Admin');
  }

  /**
   * Upload is for Document Owners only; Department Admins must not upload (even if they also hold Document Owner).
   */
  canUploadDocuments(): boolean {
    return this.hasRole('Document Owner') && !this.hasRole('Department Admin');
  }

  canReviewDocuments(): boolean {
    return this.hasRole('Compliance Officer') || this.hasRole('Department Admin');
  }

  logActivity(eventType: string, message: string): void {
    console.info(`[auth] ${eventType}: ${message}`);
  }

  /** Post-login home: My Documents for document-owner-only, otherwise dashboard. */
  getDefaultAppPath(): string {
    return this.isDocumentOwnerOnly() ? '/my-documents' : '/dashboard';
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  isLoggedIn(): boolean   { return !!this.getToken(); }

  getCurrentAccount(): Observable<CurrentAccount> {
    return this.http.get<CurrentAccount>(`${this.base}/me`);
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
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
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
    const roleClaim = claims['role'];
    if (Array.isArray(roleClaim)) {
      return roleClaim.filter((r): r is string => typeof r === 'string');
    }
    if (typeof roleClaim === 'string' && roleClaim.trim().length > 0) {
      return [roleClaim];
    }
    return [];
  }
}