import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { AdHocReportData, REPORT_FOCUS_LABELS, ReportFocus } from '../../reports.models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-ad-hoc-results',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './ad-hoc-results.html',
  styleUrls: ['./ad-hoc-results.scss'],
})
export class AdHocResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  data: AdHocReportData | null = null;
  error = '';
  focusLabels = REPORT_FOCUS_LABELS;
  pdfUrl = '';
  frameConfig: ReportFrameConfig = {
    reportId: 'AD-HOC-LOADING',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Loading...',
    reportType: 'Saved Ad-Hoc Report',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'AD-HOC',
    badgeIcon: 'bar',
    accentColors: ['#0f766e', '#3b82f6'],
  };

  ngOnInit(): void {
    const reportId = this.route.snapshot.paramMap.get('id');
    if (!reportId) {
      this.error = 'Report ID is missing.';
      return;
    }

    this.http.get<AdHocReportData>(`${environment.apiUrl}/reports/ad-hoc/${reportId}`).subscribe({
      next: response => {
        this.data = response;
        this.pdfUrl = `${environment.apiUrl}/reports/ad-hoc/${response.reportId}/pdf`;
        this.frameConfig = {
          ...this.frameConfig,
          reportId: String(response.reportId),
          dateGenerated: response.dateGenerated,
          createdBy: response.createdBy,
        };
      },
      error: () => this.error = 'The saved report could not be loaded.',
    });
  }

  focusLabel(focus: string): string {
    return this.focusLabels[focus as ReportFocus] ?? focus;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
