import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  // Returns the path the guard redirected to, so each test can check where the user ends up.
  const router = { createUrlTree: (commands: string[]) => commands.join('/') } as unknown as Router;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.overrideProvider(Router, { useValue: router });
  });

  it('allows Admin and Department Admin users through', () => {
    const auth = {
      isLoggedIn: () => true,
      hasRole: (role: string) => role === 'Admin' || role === 'Department Admin'
    } as unknown as AuthService;

    TestBed.overrideProvider(AuthService, { useValue: auth });

    expect(executeGuard({} as any, {} as any)).toBe(true);
  });

  it('sends signed-out users to login', () => {
    const auth = { isLoggedIn: () => false } as unknown as AuthService;

    TestBed.overrideProvider(AuthService, { useValue: auth });

    expect(executeGuard({} as any, {} as any) as any).toBe('/auth/login');
  });

  it('sends signed-in users without access to their own start page', () => {
    const auth = {
      isLoggedIn: () => true,
      hasRole: () => false,
      isSuperAdmin: () => false,
      getDefaultAppPath: () => '/my-documents'
    } as unknown as AuthService;

    TestBed.overrideProvider(AuthService, { useValue: auth });

    expect(executeGuard({} as any, {} as any) as any).toBe('/my-documents');
  });
});
