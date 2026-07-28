import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const redirectToLogin = (router: Router) => router.createUrlTree(['/auth/login']);

export const departmentAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return redirectToLogin(router);
  return auth.hasRole('Department Admin') || auth.isSuperAdmin()
    ? true
    : redirectToLogin(router);
};

export const departmentScopedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return redirectToLogin(router);
  return auth.hasRole('Department Admin')
    || auth.hasRole('Stakeholder')
    || auth.isSuperAdmin()
    ? true
    : redirectToLogin(router);
};
