import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Admin') || auth.hasRole('Department Admin') || auth.isSuperAdmin()
    ? true
    : router.createUrlTree(['/auth/login']);
};
