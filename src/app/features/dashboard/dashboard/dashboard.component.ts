import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { environment } from '../../../../environments/environment';
import {
  ComplianceService,
  ComplianceDashboard,
  ComplianceUserSummary,
} from '../../../core/services/compliance.service';
import { AuthService, CurrentAccount } from '../../../core/services/auth.service';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface DashboardStats {
  totalDocuments: number;
  totalDelta: number;
  verifiedDocuments: number;
  verifiedPercent: number;
  pendingVerification: number;
  pendingUrgent: number;
  rejectedDocuments: number;
  expiringSoon: number;
  complianceRate: number;
  complianceDelta: number;
}

interface StatCard {
  key: string;
  value: string | number;
  label: string;
  sublabel: string;
  iconBg: string;
  iconColor: string;
  iconPath: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private complianceService = inject(ComplianceService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  dashboardData: ComplianceDashboard | null = null;
  account: CurrentAccount | null = null;
  dashboardScope: 'system' | 'department' = 'system';
  dashboardLoading = false;
  dashboardError = '';

  complianceLoading = false;
  complianceError = '';
  complianceSummary: ComplianceUserSummary | null = null;
  complianceIssues: any[] = [];
  complianceMissingDocuments: any[] = [];
  hasComplianceData = false;

  statCards: StatCard[] = [];

  private readonly defaultChartData = {
    verification: [1842, 312, 98, 595],
    category: [1124, 876, 543, 304],
    risk: [1124, 487, 198, 38],
  };

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildVerificationChart();
      this.buildCategoryChart();
      this.buildRiskChart();
      this.loadDashboard();
      this.loadComplianceData();
    }, 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  // ── Verification Status Doughnut ──────────────────────────────────────────

  private buildVerificationChart(): void {
    const ctx = this.verificationChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified', 'Pending', 'Rejected', 'Unreviewed'],
        datasets: [{
          data: [1842, 312, 98, 595],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#d1d5db'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }

  // ── Documents by Category Doughnut ────────────────────────────────────────

  private buildCategoryChart(): void {
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['KYC', 'FICA', 'Corporate Gov.', 'Tax Compliance'],
        datasets: [{
          data: [1124, 876, 543, 304],
          backgroundColor: ['#1e2a3a', '#2d5282', '#7bafd4', '#b0cfe8'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }

  // ── Risk Distribution Doughnut ────────────────────────────────────────────

  private buildRiskChart(): void {
    const ctx = this.riskChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
        datasets: [{
          data: [1124, 487, 198, 38],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#991b1b'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }

  private loadDashboard(): void {
    this.dashboardLoading = true;
    this.dashboardError = '';
    this.dashboardData = null;

    const routeScope = this.route.snapshot.data['dashboardScope'] as 'system' | 'department' | undefined;

    this.auth.getCurrentAccount().subscribe({
      next: account => {
        this.account = account;
        const shouldUseDepartmentDashboard = routeScope === 'department'
          || (!routeScope && (this.auth.hasRole('Department Admin') || this.auth.hasRole('Stakeholder'))
            && !this.auth.isSuperAdmin() && account.departmentId);

        if (shouldUseDepartmentDashboard && account.departmentId) {
          this.dashboardScope = 'department';
          this.complianceService.getDepartmentDashboard(account.departmentId).subscribe({
            next: dashboard => this.applyDashboard(dashboard),
            error: (error) => {
              // If department dashboard fails and user is department admin, handle gracefully
              console.warn('Department dashboard error:', error);
              this.handleDashboardError('Unable to load department dashboard.');
            }
          });
        } else {
          this.dashboardScope = 'system';
          this.complianceService.getSystemDashboard().subscribe({
            next: dashboard => this.applyDashboard(dashboard),
            error: (error) => {
              // If system dashboard fails and user is department admin, try department dashboard
              if (this.auth.hasRole('Department Admin') && this.account?.departmentId) {
                console.warn('System dashboard error, attempting department dashboard:', error);
                this.dashboardScope = 'department';
                this.complianceService.getDepartmentDashboard(this.account.departmentId).subscribe({
                  next: dashboard => this.applyDashboard(dashboard),
                  error: () => this.handleDashboardError('Unable to load dashboard. Please refresh the page.')
                });
              } else {
                this.handleDashboardError('Unable to load system dashboard.');
              }
            }
          });
        }
      },
      error: () => this.handleDashboardError('Unable to load user account data.'),
    });
  }

  private applyDashboard(dashboard: ComplianceDashboard): void {
    this.dashboardData = dashboard;
    this.dashboardLoading = false;
    this.dashboardError = '';
    this.statCards = this.buildStatCards(dashboard);
    this.updateRiskChart(dashboard);
  }

  private handleDashboardError(message: string): void {
    this.dashboardLoading = false;
    this.dashboardError = message;
    this.statCards = [];
  }

  private buildStatCards(dashboard: ComplianceDashboard): StatCard[] {
    return [
      {
        key: 'users',
        value: dashboard.totalUsers,
        label: this.dashboardScope === 'department' ? 'Department Members' : 'Total Users',
        sublabel: this.dashboardScope === 'department' ? 'Members in your department' : 'Active users in system',
        iconBg: '#e0e7ff',
        iconColor: '#4f46e5',
        iconPath: 'users',
      },
      {
        key: 'compliant',
        value: dashboard.compliantUsers,
        label: 'Compliant Users',
        sublabel: 'Full compliance achieved',
        iconBg: '#dcfce7',
        iconColor: '#16a34a',
        iconPath: 'check',
      },
      {
        key: 'noncompliant',
        value: dashboard.nonCompliantUsers,
        label: 'Non-Compliant Users',
        sublabel: 'Immediate remediation needed',
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        iconPath: 'x',
      },
      {
        key: 'review',
        value: dashboard.reviewRequiredUsers,
        label: 'Review Required',
        sublabel: 'Awaiting compliance review',
        iconBg: '#fef3c7',
        iconColor: '#d97706',
        iconPath: 'clock',
      },
      {
        key: 'alerts',
        value: dashboard.totalOpenAlerts,
        label: 'Open Alerts',
        sublabel: 'Outstanding compliance actions',
        iconBg: '#fee2e2',
        iconColor: '#991b1b',
        iconPath: 'triangle',
      },
      {
        key: 'complianceRate',
        value: `${dashboard.overallCompliancePercentage?.toFixed(1) ?? 0}%`,
        label: 'Compliance Rate',
        sublabel: 'Across current scope',
        iconBg: '#1e2a3a',
        iconColor: '#fff',
        iconPath: 'trend',
      }
    ];
  }

  private updateRiskChart(dashboard: ComplianceDashboard): void {
    const chart = this.charts.find((c, index) => index === 2);
    if (!chart || !dashboard) return;

    chart.data.datasets[0].data = [
      dashboard.lowRiskUsers ?? 0,
      dashboard.mediumRiskUsers ?? 0,
      dashboard.highRiskUsers ?? 0,
      dashboard.criticalRiskUsers ?? 0,
    ];
    chart.update();
  }

  private loadComplianceData(): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      this.complianceError = 'No current user available.';
      return;
    }

    this.complianceLoading = true;
    this.complianceError = '';

    this.complianceService.getUserCompliance(currentUserId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        this.complianceSummary = payload ?? null;
        this.hasComplianceData = !!payload;
        this.complianceLoading = false;
      },
      error: () => {
        this.complianceLoading = false;
        this.complianceError = 'Unable to load compliance information right now.';
      },
    });

    this.complianceService.getUserIssues(currentUserId).subscribe({
      next: (response: any) => {
        this.complianceIssues = response?.data ?? response ?? [];
      },
      error: () => {
        this.complianceIssues = [];
      },
    });

    this.complianceService.getUserMissingDocuments(currentUserId).subscribe({
      next: (response: any) => {
        this.complianceMissingDocuments = response?.data ?? response ?? [];
      },
      error: () => {
        this.complianceMissingDocuments = [];
      },
    });
  }

  private getCurrentUserId(): string | null {
    const token = localStorage.getItem('docuvault_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = atob(padded);
      const claims = JSON.parse(decoded) as Record<string, unknown>;
      return typeof claims['sub'] === 'string' ? claims['sub'] : null;
    } catch {
      return null;
    }
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }
}