import { Component, inject, OnInit } from '@angular/core';
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
export class AdHocReportComponent implements OnInit {
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

  recentReports: RecentReport[] = [];

  ngOnInit(): void {
    this.http.get<RecentReport[]>(`${this.base}/ad-hoc/recent`).subscribe({
      next: reports => this.recentReports = reports,
      error: () => this.recentReports = [],
    });
  }

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
        if (this.config.exportFormat === ExportFormat.EXCEL) {
          this.downloadExcel(res.reportId);
        } else {
          this.router.navigate(['/reports/ad-hoc-results', res.reportId]);
        }
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

  private downloadExcel(reportId: string): void {
    this.http.get(`${this.base}/ad-hoc/${reportId}/excel`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${this.config.title.trim() || 'ad-hoc-report'}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error = 'Report was saved, but the Excel download failed.'
    });
  }
}
