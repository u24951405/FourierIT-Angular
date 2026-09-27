import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportsService, SystemAuditReport } from '../../../../core/services/reports.service';

/** What each institution did, and what was decided about its requests, from the audit log. */
@Component({
  selector: 'app-system-audit-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportFrameComponent],
  templateUrl: './system-audit-report.html',
  styleUrls: ['./system-audit-report.scss'],
})
export class SystemAuditReportComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reports = inject(ReportsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly report = signal<SystemAuditReport | null>(null);

  /** Defaults to the last 90 days. */
  from = this.isoDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  to = this.isoDate(new Date());

  frameConfig: ReportFrameConfig = {
    reportId: '—',
    dateGenerated: new Date().toISOString(),
    createdBy: this.generatedBy(),
    reportType: 'Institution activity audit',
    framework: 'FICA · POPIA',
    badgeLabel: 'AUDIT TRAIL',
    badgeIcon: 'lock',
    accentColors: ['#1e2a3a', '#4b5a6e', '#7bafd4'],
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.from && this.to && this.from > this.to) {
      this.error.set('The start date must be on or before the end date.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.reports.getSystemAudit(this.from, this.to)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: report => {
          this.report.set(report);
          this.frameConfig = {
            ...this.frameConfig,
            reportId: report.reportId,
            dateGenerated: report.dateGenerated,
            period: `${this.formatDay(report.periodFrom)} – ${this.formatDay(report.periodTo)}`,
          };
        },
        error: err => this.error.set(err?.error?.error ?? 'Could not load the audit report.'),
      });
  }

  private formatDay(value: string): string {
    return new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private isoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown user';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown user';
  }
}
