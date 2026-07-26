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
    const path = this.auth.hasRole('Department Admin') || this.auth.hasRole('Stakeholder')
      ? '/dashboard/department'
      : this.auth.isDocumentOwnerOnly()
        ? '/dashboard/owner'
        : (this.auth.hasRole('Admin') || this.auth.isSuperAdmin())
          ? '/dashboard/system'
          : '/auth/login';

    this.router.navigateByUrl(path);
  }
}
