import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InstitutionAuthService } from './institution-auth';

/**
 * Guards all institution portal routes.
 * Checks that a valid, non-expired institution session exists.
 * Redirects to expired screen if not authenticated.
 *
 * This guard is COMPLETELY separate from the internal user AuthGuard.
 * It only reads from sessionStorage under the institution_session key.
 */
export const institutionAuthGuard: CanActivateFn = () => {
  const authService = inject(InstitutionAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Session missing or expired — redirect to expired screen
  router.navigate(['/institution/auth/expired']);
  return false;
};

/**
 * Guard for the OTP verification screen.
 * Ensures a pending token validation exists before allowing OTP entry.
 * Prevents direct navigation to /institution/auth/verify without a valid token.
 */
export const institutionOtpGuard: CanActivateFn = () => {
  const authService = inject(InstitutionAuthService);
  const router = inject(Router);

  // If already authenticated, go straight to dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/institution/dashboard']);
    return false;
  }

  // Must have a pending validation to be on the OTP screen
  if (!authService.getPendingValidation()) {
    router.navigate(['/institution/auth/expired']);
    return false;
  }

  return true;
};
