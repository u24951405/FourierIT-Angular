import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ComplianceDashboardSnapshot, ComplianceService } from '../../../core/services/compliance.service';
import { ComplianceSnapshotWidgetsComponent } from './compliance-snapshot-widgets.component';

@Component({
  selector: 'app-department-dashboard-v2',
  standalone: true,
  imports: [CommonModule, ComplianceSnapshotWidgetsComponent],
  template: `
    <main class="dashboard-v2-shell">
      <app-compliance-snapshot-widgets
        [snapshot]="snapshot()"
        [loading]="loading()"
        [error]="error()">
      </app-compliance-snapshot-widgets>
    </main>
  `
})
export class DepartmentDashboardV2Component implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly complianceService = inject(ComplianceService);

  snapshot = signal<ComplianceDashboardSnapshot | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.auth.getCurrentAccount()
      .subscribe({
        next: account => {
          if (account.departmentId == null) {
            this.loading.set(false);
            this.error.set('Unable to identify the current department.');
            return;
          }

          this.loading.set(true);
          this.complianceService.getDepartmentDashboardSnapshot(account.departmentId)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
              next: snapshot => this.snapshot.set(snapshot),
              error: err => this.error.set(err?.error?.error ?? 'Unable to load the department dashboard snapshot.')
            });
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Unable to identify the current department.');
        }
      });
  }
}
