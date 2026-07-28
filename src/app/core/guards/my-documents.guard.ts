import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const myDocumentsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  if (auth.isDocumentOwnerOnly()) return true;
  if (auth.hasRole('Department Admin')) return true;

  return router.createUrlTree(['/dashboard']);
};
