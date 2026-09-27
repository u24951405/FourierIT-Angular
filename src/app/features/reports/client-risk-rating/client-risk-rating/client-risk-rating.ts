import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportsService, RiskRatingLevel, RiskRatingReport } from '../../../../core/services/reports.service';

/** Every document owner grouped by risk level, with the real factors behind each level. */
@Component({
  selector: 'app-client-risk-rating',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './client-risk-rating.html',
  styleUrls: ['./client-risk-rating.scss'],
})
export class ClientRiskRatingComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reports = inject(ReportsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly report = signal<RiskRatingReport | null>(null);

  frameConfig: ReportFrameConfig = {
    reportId: '—',
    dateGenerated: new Date().toISOString(),
    createdBy: this.generatedBy(),
    reportType: 'Client Risk Rating',
    framework: 'FICA risk-based approach',
    badgeLabel: 'RISK MATRIX',
    badgeIcon: 'trend',
    accentColors: ['#991b1b', '#ef4444', '#f59e0b', '#10b981'],
  };

  /** How each level is reached, from the compliance risk rules (points add up per owner). */
  readonly scale: { level: RiskRatingLevel; rule: string }[] = [
    { level: 'Critical', rule: '75+ points' },
    { level: 'High', rule: '50–74 points' },
    { level: 'Medium', rule: '25–49 points' },
    { level: 'Low', rule: 'under 25 points' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports.getClientRiskRating()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: report => {
          this.report.set(report);
          this.frameConfig = { ...this.frameConfig, reportId: report.reportId, dateGenerated: report.dateGenerated };
        },
        error: err => this.error.set(err?.error?.error ?? 'Could not load the risk rating report.'),
      });
  }

  countFor(level: RiskRatingLevel): number {
    return this.report()?.strata.find(s => s.level === level)?.profiles.length ?? 0;
  }

  levelColor(level: RiskRatingLevel): string {
    return ({ Critical: '#991b1b', High: '#ef4444', Medium: '#f59e0b', Low: '#10b981', 'Not assessed': '#94a3b8' } as const)[level];
  }

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown user';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown user';
  }
}
