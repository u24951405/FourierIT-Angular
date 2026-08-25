import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const complianceOfficerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Compliance Officer') || auth.hasRole('Admin')
    ? true
    : router.createUrlTree(['/auth/login']);
};
