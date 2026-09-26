import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** The system dashboard: Admins and the Super Admin, plus Stakeholders, who view it read-only. */
export const systemDashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Admin') || auth.isSuperAdmin() || auth.isStakeholderViewer()
    ? true
    : router.createUrlTree([auth.getDefaultAppPath()]);
};

/** The read-only "All Users" directory: Stakeholders, Admins and the Super Admin. */
export const userDirectoryGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.isStakeholderViewer() || auth.hasRole('Admin') || auth.isSuperAdmin()
    ? true
    : router.createUrlTree([auth.getDefaultAppPath()]);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Admin') || auth.isSuperAdmin()
    ? true
    : router.createUrlTree([auth.getDefaultAppPath()]);
};
