import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Allows Admin, Department Admin, or Super Admin. Department Admins hold the
 * Users.Manage and Roles.Manage permissions (see AppDbContext role-permission
 * seed data), so routes gated purely to "Admin"/Super Admin were blocking a
 * role the permission model already grants access to.
 */
export const adminOrDepartmentAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
  return auth.hasRole('Admin') || auth.hasRole('Department Admin') || auth.isSuperAdmin()
    ? true
    : router.createUrlTree(['/auth/login']);
};
