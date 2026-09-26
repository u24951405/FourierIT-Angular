import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, CurrentAccount } from '../../../core/services/auth.service';

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
    this.auth.getCurrentAccount().subscribe({
      next: (account) => this.navigateByAccount(account),
      error: () => this.navigateByTokenFallback(),
    });
  }

  private navigateByAccount(account: CurrentAccount): void {
    const isDepartmentScoped = !this.auth.isSuperAdmin() && this.auth.hasRole('Department Admin');

    const path = this.auth.isStakeholderViewer()
      ? '/dashboard/system'
      : isDepartmentScoped
      ? '/dashboard/department'
      : this.auth.isDocumentOwnerOnly()
        ? '/dashboard/owner'
        : this.auth.hasRole('Compliance Officer')
          ? '/compliance/review-queue'
        : (this.auth.hasRole('Admin') || this.auth.isSuperAdmin())
          ? '/dashboard/system'
          : '/auth/login';

    this.router.navigateByUrl(path);
  }

  private navigateByTokenFallback(): void {
    const path = this.auth.isStakeholderViewer()
      ? '/dashboard/system'
      : this.auth.hasRole('Department Admin')
      ? '/dashboard/department'
      : this.auth.isDocumentOwnerOnly()
        ? '/dashboard/owner'
        : this.auth.hasRole('Compliance Officer')
          ? '/compliance/review-queue'
        : (this.auth.hasRole('Admin') || this.auth.isSuperAdmin())
          ? '/dashboard/system'
          : '/auth/login';

    this.router.navigateByUrl(path);
  }
}
