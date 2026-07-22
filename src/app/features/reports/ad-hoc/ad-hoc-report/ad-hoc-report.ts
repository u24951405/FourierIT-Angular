import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  AdHocReportConfig,
  ReportFocus,
  ExportFormat,
  RecentReport,
  REPORT_FOCUS_LABELS,
  REPORT_FOCUS_DESCRIPTIONS,
} from '../../reports.models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-ad-hoc-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ad-hoc-report.html',
  styleUrls: ['./ad-hoc-report.scss'],
})
export class AdHocReportComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/reports`;

  ReportFocus = ReportFocus;
  ExportFormat = ExportFormat;
  FOCUS_LABELS = REPORT_FOCUS_LABELS;
  FOCUS_DESCRIPTIONS = REPORT_FOCUS_DESCRIPTIONS;

  focusAreas = Object.values(ReportFocus);

  config: AdHocReportConfig = {
    title: '',
    dateFrom: '',
    dateTo: '',
    focusAreas: [],
    exportFormat: ExportFormat.PDF,
  };

  generating = false;
  error: string | null = null;

  recentReports: RecentReport[] = [
    { id: 'r1', title: 'Document Processing — June 2026', date: '2026-06-30', sizeKb: 312, status: 'ready' },
    { id: 'r2', title: 'Security & Anomalies — Q2 2026', date: '2026-06-20', sizeKb: 178, status: 'ready' },
    { id: 'r3', title: 'Upload Volume — May 2026', date: '2026-05-31', sizeKb: 224, status: 'ready' },
    { id: 'r4', title: 'System Storage — May 2026', date: '2026-05-28', sizeKb: 156, status: 'generating' },
  ];

  get todayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  get canGenerate(): boolean {
    return (
      !!this.config.title.trim() &&
      !!this.config.dateFrom &&
      !!this.config.dateTo &&
      this.config.focusAreas.length > 0 &&
      !this.generating
    );
  }

  toggleFocus(focus: ReportFocus): void {
    const idx = this.config.focusAreas.indexOf(focus);
    if (idx === -1) {
      this.config.focusAreas = [...this.config.focusAreas, focus];
    } else {
      this.config.focusAreas = this.config.focusAreas.filter((f: ReportFocus) => f !== focus);
    }
  }

  isFocusSelected(focus: ReportFocus): boolean {
    return this.config.focusAreas.includes(focus);
  }

  setFormat(format: ExportFormat): void {
    this.config.exportFormat = format;
  }

  generate(): void {
    if (!this.canGenerate) return;
    this.generating = true;
    this.error = null;

    this.http.post<{ reportId: string }>(`${this.base}/ad-hoc`, this.config).subscribe({
      next: (res) => {
        this.generating = false;
        // Navigate to the generated report or download it
        this.router.navigate(['/reports/monthly'], { queryParams: { id: res.reportId } });
      },
      error: () => {
        this.generating = false;
        this.error = 'Failed to generate report. Please try again.';
      },
    });
  }

  reset(): void {
    this.config = {
      title: '',
      dateFrom: '',
      dateTo: '',
      focusAreas: [],
      exportFormat: ExportFormat.PDF,
    };
    this.error = null;
  }

  downloadRecent(report: RecentReport): void {
    if (report.status !== 'ready') return;
    window.open(`${this.base}/download/${report.id}`, '_blank');
  }
}
