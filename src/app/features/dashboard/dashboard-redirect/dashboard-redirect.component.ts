import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-redirect">
      Redirecting to your dashboard...
    </div>
  `
})
export class DashboardRedirectComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit(): void {
    // The destination comes from the roles in the sign-in token, so there is nothing to wait for.
    // (It used to wait for an account request first, which left people stuck here whenever the API was slow.)
    this.router.navigateByUrl(this.resolveDashboardPath(), { replaceUrl: true });
  }

  /**
   * Super Admin is checked first: hasRole() returns true for every role when the user is Super Admin,
   * so any role check placed before it would send them to that role's page instead.
   */
  private resolveDashboardPath(): string {
    if (this.auth.isSuperAdmin()) return '/dashboard/system';
    if (this.auth.isStakeholderViewer()) return '/dashboard/system';
    if (this.auth.hasRole('Department Admin')) return '/dashboard/department';
    if (this.auth.isDocumentOwnerOnly()) return '/dashboard/owner';
    if (this.auth.hasRole('Compliance Officer')) return '/dashboard/system';
    if (this.auth.hasRole('Admin')) return '/dashboard/system';
    return '/auth/login';
  }
}
