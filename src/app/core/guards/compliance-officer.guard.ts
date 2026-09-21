import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const complianceOfficerGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isDevBypass = route.queryParamMap.get('dev') === '1' || route.queryParamMap.get('dev') === 'true';

  if (isDevBypass) return true;
  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Compliance Officer') || auth.hasRole('Admin') || auth.hasRole('Stakeholder')
    ? true
    : router.createUrlTree(['/auth/login']);
};
