import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('allows Admin and Department Admin users through', () => {
    const auth = {
      isLoggedIn: () => true,
      hasRole: (role: string) => role === 'Admin' || role === 'Department Admin'
    } as unknown as AuthService;

    TestBed.overrideProvider(AuthService, { useValue: auth });
    TestBed.overrideProvider(Router, { useValue: { createUrlTree: () => '/auth/login' } });

    expect(executeGuard({} as any, {} as any)).toBe(true);
  });

  it('redirects unauthorised users to login', () => {
    const auth = {
      isLoggedIn: () => true,
      hasRole: () => false,
      isSuperAdmin: () => false
    } as unknown as AuthService;

    const router = { createUrlTree: () => '/auth/login' } as unknown as Router;

    TestBed.overrideProvider(AuthService, { useValue: auth });
    TestBed.overrideProvider(Router, { useValue: router });

    expect(executeGuard({} as any, {} as any) as any).toBe('/auth/login');
  });
});