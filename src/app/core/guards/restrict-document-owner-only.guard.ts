import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Document owners can use their document routes, but not admin-only areas. */
export const restrictDocumentOwnerOnlyGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  if (auth.isDocumentOwnerOnly()) {
    if (state.url.startsWith('/my-documents') || state.url.startsWith('/documents/upload')) {
      return true;
    }
    return router.createUrlTree(['/my-documents']);
  }
  return true;
};
