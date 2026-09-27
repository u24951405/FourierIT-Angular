import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ComplianceAlert, ComplianceHistoryItem, ComplianceService, ComplianceUserSummary } from '../../../../core/services/compliance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportOwnerOption } from '../../../../core/services/reports.service';
import { OwnerPickerComponent } from '../../shared/owner-picker/owner-picker';

@Component({
  selector: 'app-compliance-report',
  standalone: true,
  imports: [CommonModule, OwnerPickerComponent],
  templateUrl: './compliance-report.html',
  styleUrls: ['./compliance-report.scss'],
})
export class ComplianceReportComponent implements OnInit {
  private router = inject(Router);
  private complianceService = inject(ComplianceService);
  private auth = inject(AuthService);

  /** Built from the history each time data arrives; see buildLedger. */
  ledger: ComplianceLedger = EMPTY_LEDGER;

  historyItems: ComplianceHistoryItem[] = [];
  alerts: ComplianceAlert[] = [];
  complianceSummary: ComplianceUserSummary | null = null;
  isLoading = false;
  errorMessage = '';
  scope: 'user' | 'department' = 'user';

  /**
   * People who don't upload documents (e.g. the Super Admin) have no compliance record of their own,
   * so they choose which document owner the report is about.
   */
  readonly showOwnerPicker = !this.auth.canUploadDocuments();
  selectedOwner: ReportOwnerOption | null = null;

  ngOnInit(): void {
    this.loadComplianceData();
  }

  private loadComplianceData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.showOwnerPicker) {
      // The owner picker loads the owners and reports the chosen one (see onOwnerChange).
      return;
    }

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

  onOwnerChange(owner: ReportOwnerOption): void {
    this.selectedOwner = owner;
    this.scope = 'user';
    this.historyItems = [];
    this.alerts = [];
    this.complianceSummary = null;
    this.isLoading = true;
    this.loadUserComplianceData(owner.userId);
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
        // Oldest first: the first entry is where the record starts, the last is the current state.
        this.historyItems = [...(history ?? [])].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
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
    this.ledger = this.buildLedger();
  }

  /**
   * Each history entry is a status that lasted from when it was recorded until the next change (or until now),
   * so the percentages and the timeline are shares of time, not counts of records.
   */
  private buildLedger(): ComplianceLedger {
    const now = Date.now();
    const entries = this.historyItems
      .map(item => ({ item, at: new Date(item.changedAt).getTime() }))
      .filter(entry => Number.isFinite(entry.at));

    const periods: LedgerPeriod[] = entries.map((entry, index) => {
      const end = index + 1 < entries.length ? entries[index + 1].at : now;
      return {
        status: entry.item.status,
        kind: statusKind(entry.item.status),
        from: entry.at,
        to: end,
        durationMs: Math.max(0, end - entry.at),
      };
    });

    const totalMs = periods.reduce((sum, p) => sum + p.durationMs, 0);
    const msOf = (kind: StatusKind) => periods.filter(p => p.kind === kind).reduce((sum, p) => sum + p.durationMs, 0);
    const share = (ms: number) => (totalMs ? Math.round((ms / totalMs) * 1000) / 10 : 0);

    const changes = entries.map((entry, index) => ({
      changedAt: entry.item.changedAt,
      previous: index === 0 ? null : entries[index - 1].item.status,
      status: entry.item.status,
      kind: statusKind(entry.item.status),
      compliancePercentage: entry.item.compliancePercentage,
      reason: entry.item.changeReason || 'No reason recorded',
    })).reverse(); // newest first

    const currentStatus = this.complianceSummary?.overallStatus || entries.at(-1)?.item.status || '';
    return {
      hasHistory: periods.length > 0,
      firstRecorded: entries[0] ? this.formatDate(entries[0].item.changedAt) : '',
      currentStatus,
      currentKind: statusKind(currentStatus),
      currentPercentage: Number(this.complianceSummary?.compliancePercentage ?? entries.at(-1)?.item.compliancePercentage ?? 0),
      compliantShare: share(msOf('compliant')),
      nonCompliantShare: share(msOf('noncompliant')),
      otherShare: share(msOf('other')),
      trackedDays: Math.max(1, Math.round(totalMs / 86_400_000)),
      statusChanges: Math.max(0, entries.length - 1),
      openAlerts: this.alerts.length,
      segments: periods.map(p => ({
        kind: p.kind,
        widthPct: totalMs ? Math.max((p.durationMs / totalMs) * 100, 0.6) : 100 / periods.length,
        title: `${p.status}: ${this.formatDate(new Date(p.from).toISOString())} – ${p.to === now ? 'now' : this.formatDate(new Date(p.to).toISOString())}`,
      })),
      changes,
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
    this.router.navigate(['/reports/compliance-certificate'], {
      queryParams: this.selectedOwner ? { owner: this.selectedOwner.userId } : {},
    });
  }

  downloadReport(): void {
    window.print();
  }
}

type StatusKind = 'compliant' | 'noncompliant' | 'other';

/** Compliant only when the status says exactly that; Pending, Partial and Review Required are neither. */
function statusKind(status: string | null | undefined): StatusKind {
  const normalized = String(status ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'compliant') return 'compliant';
  if (normalized.startsWith('non')) return 'noncompliant';
  return 'other';
}

interface LedgerPeriod {
  status: string;
  kind: StatusKind;
  from: number;
  to: number;
  durationMs: number;
}

export interface ComplianceLedger {
  hasHistory: boolean;
  firstRecorded: string;
  currentStatus: string;
  currentKind: StatusKind;
  currentPercentage: number;
  compliantShare: number;
  nonCompliantShare: number;
  otherShare: number;
  trackedDays: number;
  statusChanges: number;
  openAlerts: number;
  segments: { kind: StatusKind; widthPct: number; title: string }[];
  changes: { changedAt: string; previous: string | null; status: string; kind: StatusKind; compliancePercentage: number; reason: string }[];
}

const EMPTY_LEDGER: ComplianceLedger = {
  hasHistory: false,
  firstRecorded: '',
  currentStatus: '',
  currentKind: 'other',
  currentPercentage: 0,
  compliantShare: 0,
  nonCompliantShare: 0,
  otherShare: 0,
  trackedDays: 0,
  statusChanges: 0,
  openAlerts: 0,
  segments: [],
  changes: [],
};
