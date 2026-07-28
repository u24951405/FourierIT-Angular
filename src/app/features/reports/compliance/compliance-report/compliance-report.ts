import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ComplianceReportData, ComplianceTransition } from '../../reports.models';
import { ComplianceAlert, ComplianceHistoryItem, ComplianceService, ComplianceUserSummary } from '../../../../core/services/compliance.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-compliance-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-report.html',
  styleUrls: ['./compliance-report.scss'],
})
export class ComplianceReportComponent implements OnInit {
  private router = inject(Router);
  private complianceService = inject(ComplianceService);
  private auth = inject(AuthService);

  data: ComplianceReportData = {
    reportId: 'DV-CMP-000000',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Current User',
    launchDate: 'Pending',
    presentDate: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
    compliantDays: 0,
    totalDays: 0,
    nonCompliantDays: 0,
    incidentCount: 0,
    uptimePercentage: 0,
    transitions: [],
  };

  historyItems: ComplianceHistoryItem[] = [];
  alerts: ComplianceAlert[] = [];
  complianceSummary: ComplianceUserSummary | null = null;
  isLoading = false;
  errorMessage = '';
  scope: 'user' | 'department' = 'user';

  ngOnInit(): void {
    this.loadComplianceData();
  }

  // Timeline segments for visual uptime bar
  get timelineSegments(): { isCompliant: boolean; widthPct: number }[] {
    const entries = this.historyItems.length ? this.historyItems : [{ status: this.complianceSummary?.overallStatus || 'Unknown', compliancePercentage: this.complianceSummary?.compliancePercentage ?? 0 } as ComplianceHistoryItem];
    const total = entries.length || 1;
    const width = 100 / total;

    return entries.map((entry) => ({
      isCompliant: !String(entry.status || '').toLowerCase().includes('non') && !String(entry.status || '').toLowerCase().includes('review'),
      widthPct: width,
    }));
  }

  private loadComplianceData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auth.getCurrentAccount().subscribe({
      next: (account) => {
        const isDepartmentScoped = !this.auth.isSuperAdmin()
          && (this.auth.hasRole('Department Admin') || this.auth.hasRole('Stakeholder'))
          && !!account.departmentId;

        if (isDepartmentScoped && account.departmentId) {
          this.scope = 'department';
          this.loadDepartmentComplianceData(account.departmentId);
          return;
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
          this.errorMessage = 'No current user available.';
          this.isLoading = false;
          return;
        }

        this.scope = 'user';
        this.loadUserComplianceData(userId);
      },
      error: () => {
        const userId = this.getCurrentUserId();
        if (!userId) {
          this.errorMessage = 'No current user available.';
          this.isLoading = false;
          return;
        }

        this.scope = 'user';
        this.loadUserComplianceData(userId);
      },
    });
  }

  private loadDepartmentComplianceData(departmentId: number): void {
    this.complianceService.getDepartmentDashboard(departmentId).subscribe({
      next: (dashboard) => {
        this.complianceSummary = this.normalizeDepartmentDashboard(dashboard);
        this.historyItems = [];
        this.alerts = dashboard.criticalAlerts ?? [];
        this.updateReportData();
        this.isLoading = false;
      },
      error: () => {
        this.complianceSummary = null;
        this.historyItems = [];
        this.alerts = [];
        this.updateReportData();
        this.isLoading = false;
      },
    });
  }

  private loadUserComplianceData(userId: string): void {
    this.complianceService.getUserCompliance(userId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        this.complianceSummary = this.normalizeComplianceSummary(payload) ?? null;
        this.updateReportData();
      },
      error: () => {
        this.complianceSummary = null;
        this.updateReportData();
      },
    });

    this.complianceService.getComplianceHistory(userId).subscribe({
      next: (history) => {
        this.historyItems = history ?? [];
        this.updateReportData();
        this.isLoading = false;
      },
      error: () => {
        this.historyItems = [];
        this.updateReportData();
        this.isLoading = false;
      },
    });

    this.complianceService.getAlerts(userId).subscribe({
      next: (alerts) => {
        this.alerts = alerts ?? [];
        this.updateReportData();
      },
      error: () => {
        this.alerts = [];
        this.updateReportData();
      },
    });
  }

  private normalizeDepartmentDashboard(dashboard: any): ComplianceUserSummary | null {
    if (!dashboard || typeof dashboard !== 'object') {
      return null;
    }

    const summary: ComplianceUserSummary = {
      overallStatus: dashboard.overallCompliancePercentage >= 80 ? 'Compliant' : dashboard.overallCompliancePercentage >= 50 ? 'Review Required' : 'Non-Compliant',
      riskLevel: dashboard.criticalRiskUsers ? 'Critical' : dashboard.highRiskUsers ? 'High' : dashboard.mediumRiskUsers ? 'Medium' : 'Low',
      compliancePercentage: Number(dashboard.overallCompliancePercentage ?? 0),
      complianceScore: Number(dashboard.averageComplianceScore ?? 0),
      uploaded: Number(dashboard.totalUsers ?? 0),
      compliant: Number(dashboard.compliantUsers ?? 0),
      nonCompliant: Number(dashboard.nonCompliantUsers ?? 0),
      pendingReviewDocuments: Number(dashboard.reviewRequiredUsers ?? 0),
      expired: Number(dashboard.criticalRiskUsers ?? 0),
      missing: Number(dashboard.totalOpenAlerts ?? 0),
    };

    return summary;
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

  private updateReportData(): void {
    const historyCount = this.historyItems.length;
    const currentCompliance = this.complianceSummary?.compliancePercentage ?? 0;
    const overallStatus = String(this.complianceSummary?.overallStatus || 'Unknown');

    this.data = {
      ...this.data,
      dateGenerated: new Date().toISOString(),
      launchDate: this.formatDate(this.historyItems[0]?.changedAt) || 'Pending',
      presentDate: this.formatDate(this.historyItems[historyCount - 1]?.changedAt) || new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      compliantDays: this.historyItems.filter(item => !String(item.status || '').toLowerCase().includes('non') && !String(item.status || '').toLowerCase().includes('review')).length || (overallStatus.toLowerCase().includes('compliant') ? 1 : 0),
      totalDays: historyCount || 1,
      nonCompliantDays: this.historyItems.filter(item => String(item.status || '').toLowerCase().includes('non') || String(item.status || '').toLowerCase().includes('review')).length || (overallStatus.toLowerCase().includes('non') ? 1 : 0),
      incidentCount: this.alerts.length,
      uptimePercentage: Number.isFinite(currentCompliance) ? currentCompliance : 0,
      transitions: this.historyItems.slice(0, 8).map((item, index) => ({
        transitionDate: this.formatDate(item.changedAt),
        previousState: index === 0 ? 'Pending' : this.historyItems[index - 1].status,
        newState: item.status,
        triggeringEvent: item.changeReason || 'Live compliance update',
        downtime: null,
      })) as ComplianceTransition[],
    };
  }

  private formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private getCurrentUserId(): string | null {
    return this.auth.getCurrentUserId();
  }

  viewCertificate(): void {
    this.router.navigate(['/reports/compliance-certificate']);
  }

  downloadReport(): void {
    window.print();
  }
}