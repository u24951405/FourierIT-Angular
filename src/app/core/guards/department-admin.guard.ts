import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const redirectToLogin = (router: Router) => router.createUrlTree(['/auth/login']);

/** Signed-in users without access go back to their own home page rather than to the login screen. */
const redirectHome = (router: Router, auth: AuthService) => router.createUrlTree([auth.getDefaultAppPath()]);

export const departmentAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return redirectToLogin(router);
  return auth.hasRole('Department Admin') || auth.isSuperAdmin()
    ? true
    : redirectHome(router, auth);
};

/**
 * Department-scoped pages need a department. Stakeholders have none (they view the organisation-wide
 * dashboard instead), so only Department Admins and the Super Admin get in.
 */
export const departmentScopedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return redirectToLogin(router);
  return auth.hasRole('Department Admin') || auth.isSuperAdmin()
    ? true
    : redirectHome(router, auth);
};
