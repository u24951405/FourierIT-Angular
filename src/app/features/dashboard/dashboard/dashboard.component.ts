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
  ComplianceRuleSummary,
  ComplianceHistoryItem,
  ComplianceAlert,
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
  complianceRules: ComplianceRuleSummary[] = [];
  complianceHistory: ComplianceHistoryItem[] = [];
  complianceAlerts: ComplianceAlert[] = [];
  hasComplianceData = false;

  statCards: StatCard[] = [];

  get verificationLegendItems() {
    return [
      { label: 'Compliant', value: this.dashboardData?.compliantUsers ?? 0, color: '#10b981' },
      { label: 'Review Required', value: this.dashboardData?.reviewRequiredUsers ?? 0, color: '#f59e0b' },
      { label: 'Non-Compliant', value: this.dashboardData?.nonCompliantUsers ?? 0, color: '#ef4444' },
      { label: 'Pending', value: this.dashboardData?.pendingUsers ?? 0, color: '#d1d5db' },
    ];
  }

  get categoryLegendItems() {
    return [
      { label: 'Partial Compliant', value: this.dashboardData?.partialCompliantUsers ?? 0, color: '#1e2a3a' },
      { label: 'Open Alerts', value: this.dashboardData?.totalOpenAlerts ?? 0, color: '#2d5282' },
      { label: 'Critical Risk', value: this.dashboardData?.criticalRiskUsers ?? 0, color: '#7bafd4' },
      { label: 'High Risk', value: this.dashboardData?.highRiskUsers ?? 0, color: '#b0cfe8' },
    ];
  }

  get riskLegendItems() {
    return [
      { label: 'Low Risk', value: this.dashboardData?.lowRiskUsers ?? 0, color: '#10b981' },
      { label: 'Medium Risk', value: this.dashboardData?.mediumRiskUsers ?? 0, color: '#f59e0b' },
      { label: 'High Risk', value: this.dashboardData?.highRiskUsers ?? 0, color: '#ef4444' },
      { label: 'Critical Risk', value: this.dashboardData?.criticalRiskUsers ?? 0, color: '#991b1b' },
    ];
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildVerificationChart();
      this.buildCategoryChart();
      this.buildRiskChart();
      this.loadDashboard();
    }, 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  // ── Verification Status Doughnut ──────────────────────────────────────────

  private buildVerificationChart(): void {
    const ctx = this.verificationChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    // destroy any existing Chart instance attached to this canvas to avoid "canvas is already in use" errors
    try {
      const existing = Chart.getChart(this.verificationChartRef.nativeElement as HTMLCanvasElement);
      if (existing) existing.destroy();
    } catch { /* ignore if not available */ }

    const data = this.dashboardData ? [
      this.dashboardData.compliantUsers,
      this.dashboardData.reviewRequiredUsers,
      this.dashboardData.nonCompliantUsers,
      this.dashboardData.pendingUsers ?? 0,
    ] : [0, 0, 0, 0];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Compliant', 'Review Required', 'Non-Compliant', 'Pending'],
        datasets: [{
          data,
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
    // destroy any existing Chart instance attached to this canvas
    try {
      const existing = Chart.getChart(this.categoryChartRef.nativeElement as HTMLCanvasElement);
      if (existing) existing.destroy();
    } catch { /* ignore if not available */ }

    const data = this.dashboardData ? [
      this.dashboardData.partialCompliantUsers,
      this.dashboardData.totalOpenAlerts,
      this.dashboardData.criticalRiskUsers,
      this.dashboardData.highRiskUsers,
    ] : [0, 0, 0, 0];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Partial', 'Open Alerts', 'Critical Risk', 'High Risk'],
        datasets: [{
          data,
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
    // destroy any existing Chart instance attached to this canvas
    try {
      const existing = Chart.getChart(this.riskChartRef.nativeElement as HTMLCanvasElement);
      if (existing) existing.destroy();
    } catch { /* ignore if not available */ }

    const initialData = this.dashboardData ? [
      this.dashboardData.lowRiskUsers ?? 0,
      this.dashboardData.mediumRiskUsers ?? 0,
      this.dashboardData.highRiskUsers ?? 0,
      this.dashboardData.criticalRiskUsers ?? 0,
    ] : [0, 0, 0, 0];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
        datasets: [{
          data: initialData,
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
            next: dashboard => {
              this.applyDashboard(dashboard);
              this.loadComplianceData();
            },
            error: (error) => {
              console.warn('Department dashboard error:', error);
              this.handleDashboardError('Unable to load department dashboard.');
            }
          });
        } else {
          this.dashboardScope = 'system';
          this.complianceService.getSystemDashboard().subscribe({
            next: dashboard => {
              this.applyDashboard(dashboard);
              this.loadComplianceData();
            },
            error: (error) => {
              if (this.auth.hasRole('Department Admin') && this.account?.departmentId) {
                console.warn('System dashboard error, attempting department dashboard:', error);
                this.dashboardScope = 'department';
                this.complianceService.getDepartmentDashboard(this.account.departmentId).subscribe({
                  next: dashboard => {
                    this.applyDashboard(dashboard);
                    this.loadComplianceData();
                  },
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
    this.dashboardData = this.normalizeDashboard(dashboard);
    this.dashboardLoading = false;
    this.dashboardError = '';
    this.statCards = this.buildStatCards(this.dashboardData);
    this.updateVerificationChart(this.dashboardData);
    this.updateCategoryChart(this.dashboardData);
    this.updateRiskChart(this.dashboardData);
  }

  private handleDashboardError(message: string): void {
    this.dashboardLoading = false;
    this.dashboardError = message;
    this.statCards = [];
  }

  private normalizeDashboard(dashboard: ComplianceDashboard | null | undefined): ComplianceDashboard {
    if (!dashboard || typeof dashboard !== 'object') {
      return {
        totalUsers: 0,
        compliantUsers: 0,
        nonCompliantUsers: 0,
        partialCompliantUsers: 0,
        reviewRequiredUsers: 0,
        totalOpenAlerts: 0,
        overallCompliancePercentage: 0,
        averageComplianceScore: 0,
        criticalRiskUsers: 0,
        highRiskUsers: 0,
        mediumRiskUsers: 0,
        lowRiskUsers: 0,
      };
    }

    return {
      ...dashboard,
      totalUsers: Number(dashboard.totalUsers ?? 0),
      compliantUsers: Number(dashboard.compliantUsers ?? 0),
      nonCompliantUsers: Number(dashboard.nonCompliantUsers ?? 0),
      partialCompliantUsers: Number(dashboard.partialCompliantUsers ?? 0),
      reviewRequiredUsers: Number(dashboard.reviewRequiredUsers ?? 0),
      pendingUsers: Number(dashboard.pendingUsers ?? 0),
      totalOpenAlerts: Number(dashboard.totalOpenAlerts ?? 0),
      overallCompliancePercentage: Number(dashboard.overallCompliancePercentage ?? 0),
      averageComplianceScore: Number(dashboard.averageComplianceScore ?? 0),
      criticalRiskUsers: Number(dashboard.criticalRiskUsers ?? 0),
      highRiskUsers: Number(dashboard.highRiskUsers ?? 0),
      mediumRiskUsers: Number(dashboard.mediumRiskUsers ?? 0),
      lowRiskUsers: Number(dashboard.lowRiskUsers ?? 0),
    };
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

  private updateVerificationChart(dashboard: ComplianceDashboard): void {
    const chart = this.charts.find((c, index) => index === 0);
    if (!chart || !dashboard) return;

    chart.data.datasets[0].data = [
      dashboard.compliantUsers,
      dashboard.reviewRequiredUsers,
      dashboard.nonCompliantUsers,
      dashboard.pendingUsers ?? 0,
    ];
    chart.update();
  }

  private updateCategoryChart(dashboard: ComplianceDashboard): void {
    const chart = this.charts.find((c, index) => index === 1);
    if (!chart || !dashboard) return;

    chart.data.datasets[0].data = [
      dashboard.partialCompliantUsers,
      dashboard.totalOpenAlerts,
      dashboard.criticalRiskUsers,
      dashboard.highRiskUsers,
    ];
    chart.update();
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
    this.complianceLoading = true;
    this.complianceError = '';

    if (this.dashboardScope === 'department' && this.dashboardData) {
      const summary = this.buildDepartmentComplianceSummary(this.dashboardData);
      this.complianceSummary = summary;
      this.hasComplianceData = !!summary;
      this.complianceLoading = false;
      this.complianceRules = [];
      this.complianceHistory = [];
      this.complianceAlerts = [];
      this.complianceIssues = [];
      this.complianceMissingDocuments = [];
      return;
    }

    const currentUserId = this.auth.getCurrentUserId();
    if (!currentUserId) {
      this.complianceError = 'No current user available.';
      this.complianceLoading = false;
      return;
    }

    this.complianceService.getUserCompliance(currentUserId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        const normalized = this.normalizeComplianceSummary(payload);
        this.complianceSummary = normalized ?? null;
        this.hasComplianceData = !!normalized;
        this.complianceLoading = false;
      },
      error: () => {
        this.complianceLoading = false;
        this.complianceError = 'Unable to load compliance information right now.';
      },
    });

    this.complianceService.getComplianceRules().subscribe({
      next: (rules) => this.complianceRules = rules,
      error: () => this.complianceRules = []
    });

    this.complianceService.getComplianceHistory(currentUserId).subscribe({
      next: (history) => this.complianceHistory = history,
      error: () => this.complianceHistory = []
    });

    this.complianceService.getAlerts(currentUserId).subscribe({
      next: (alerts) => this.complianceAlerts = alerts,
      error: () => this.complianceAlerts = []
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

  private buildDepartmentComplianceSummary(dashboard: ComplianceDashboard | null): ComplianceUserSummary | null {
    if (!dashboard) {
      return null;
    }

    const totalUsers = Number(dashboard.totalUsers ?? 0);
    const compliantUsers = Number(dashboard.compliantUsers ?? 0);
    const nonCompliantUsers = Number(dashboard.nonCompliantUsers ?? 0);
    const reviewRequiredUsers = Number(dashboard.reviewRequiredUsers ?? 0);
    const compliancePercentage = Number(dashboard.overallCompliancePercentage ?? 0);
    const averageScore = Number(dashboard.averageComplianceScore ?? 0);

    let overallStatus = 'Unknown';
    if (compliancePercentage >= 90) {
      overallStatus = 'Compliant';
    } else if (compliancePercentage >= 70) {
      overallStatus = 'Review Required';
    } else if (nonCompliantUsers > 0) {
      overallStatus = 'Non-Compliant';
    }

    let riskLevel = 'Low';
    if ((dashboard.criticalRiskUsers ?? 0) > 0) {
      riskLevel = 'Critical';
    } else if ((dashboard.highRiskUsers ?? 0) > 0) {
      riskLevel = 'High';
    } else if ((dashboard.mediumRiskUsers ?? 0) > 0) {
      riskLevel = 'Medium';
    }

    return {
      overallStatus,
      riskLevel,
      compliancePercentage,
      complianceScore: averageScore,
      uploaded: totalUsers,
      compliant: compliantUsers,
      nonCompliant: nonCompliantUsers,
      missing: Math.max(0, totalUsers - compliantUsers),
      pendingReviewDocuments: reviewRequiredUsers,
      totalRequired: totalUsers,
    };
  }

  private normalizeComplianceSummary(payload: any): ComplianceUserSummary | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const summary = { ...payload } as Record<string, any>;
    const uploaded = Number(summary['uploaded'] ?? summary['Uploaded'] ?? 0);
    const compliant = Number(summary['compliant'] ?? summary['Compliant'] ?? 0);
    const nonCompliant = Number(summary['nonCompliant'] ?? summary['NonCompliant'] ?? 0);
    const pendingReviewDocuments = Number(summary['pendingReviewDocuments'] ?? summary['PendingReviewDocuments'] ?? 0);
    const expired = Number(summary['expired'] ?? summary['Expired'] ?? 0);
    const missing = Number(summary['missing'] ?? summary['Missing'] ?? 0);

    summary['uploaded'] = uploaded;
    summary['compliant'] = compliant;
    summary['nonCompliant'] = nonCompliant;
    summary['pendingReviewDocuments'] = pendingReviewDocuments;
    summary['expired'] = expired;
    summary['missing'] = missing;

    if (summary['compliancePercentage'] == null && summary['CompliancePercentage'] != null) {
      summary['compliancePercentage'] = Number(summary['CompliancePercentage']);
    }
    if (summary['complianceScore'] == null && summary['ComplianceScore'] != null) {
      summary['complianceScore'] = Number(summary['ComplianceScore']);
    }
    if (!summary['overallStatus'] && summary['OverallStatus']) {
      summary['overallStatus'] = summary['OverallStatus'];
    }
    if (!summary['riskLevel'] && summary['RiskLevel']) {
      summary['riskLevel'] = summary['RiskLevel'];
    }

    return summary as ComplianceUserSummary;
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }
}