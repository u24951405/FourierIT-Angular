import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InstitutionAuthService } from './institution-auth';

/**
 * Guards the signed-in institution portal pages: a valid, unexpired institution session must exist,
 * otherwise the institution sees the "signed out" page.
 *
 * This guard is separate from the internal user AuthGuard; it only reads the institution session.
 */
export const institutionAuthGuard: CanActivateFn = () => {
  const authService = inject(InstitutionAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Signed out or timed out: explain that, and let them email themselves a new link.
  const institutionId = authService.getLastInstitutionId();
  return router.createUrlTree(['/institution/auth/expired'], {
    queryParams: { reason: 'session', ...(institutionId ? { institution: institutionId } : {}) },
  });
};

/**
 * Guard for the OTP verification screen.
 * Ensures a pending token validation exists before allowing OTP entry.
 * Prevents direct navigation to /institution/auth/verify without a valid token.
 */
export const institutionOtpGuard: CanActivateFn = () => {
  const authService = inject(InstitutionAuthService);
  const router = inject(Router);

  // Must have a pending validation to be on the OTP screen
  if (!authService.getPendingValidation()) {
    router.navigate(['/institution/auth/expired']);
    return false;
  }

  return true;
};
