import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
  ChartConfiguration,
} from 'chart.js';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { MonthlyReportData } from '../../reports.models';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

// Register all used Chart.js components
Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend
);

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './monthly-report.html',
  styleUrls: ['./monthly-report.scss'],
})
export class MonthlyReportComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  @ViewChild('processingChart') processingChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('securityChart') securityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('storageChart') storageChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('uploadChart') uploadChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private viewReady = false;
  private resizeObserver?: ResizeObserver;
  private readonly handleViewportResize = () => {
    this.charts.forEach(chart => chart.resize());
  };

  frameConfig: ReportFrameConfig = {
    reportId: 'DV-OPR-0044472555',
    dateGenerated: new Date().toISOString(),
    createdBy: this.generatedBy(),
    reportType: 'Operational Report',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'OPERATIONAL',
    badgeIcon: 'bar',
    accentColors: ['#10b981', '#3b82f6'],
  };

  pdfUrl = '';

  data: MonthlyReportData = {
    reportId: '',
    month: 'Loading',
    dateGenerated: '',
    createdBy: this.generatedBy(),
    processing: { verified: 0, pendingVerification: 0, flaggedAnomalies: 0, partOfEnquiry: 0 },
    securityEvents: [],
    distribution: [],
    storage: { usedGb: 0, availableGb: 0, totalGb: 0, usedPercentage: 0 },
    uploadVolume: [],
    totalUploads: 0,
    dailyAverage: 0,
    peakDay: 0,
  };

  ngOnInit(): void {
    const params = new HttpParams()
      .set('startDate', this.firstDayOfCurrentMonth())
      .set('endDate', this.lastDayOfCurrentMonth());
    this.pdfUrl = `${environment.apiUrl}/reports/monthly/pdf?${params.toString()}`;
    this.http.get<MonthlyReportData>(`${environment.apiUrl}/reports/monthly`, { params }).subscribe({
      next: data => {
        this.data = data;
        this.frameConfig = {
          ...this.frameConfig,
          reportId: data.reportId,
          dateGenerated: data.dateGenerated,
          createdBy: data.createdBy,
        };
        if (this.viewReady) this.renderCharts();
      },
      error: () => {
        this.data.month = 'Monthly report unavailable';
      }
    });
  }

  private firstDayOfCurrentMonth(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  private lastDayOfCurrentMonth(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown User';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown User';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.viewReady = true;
      this.renderCharts();

      const chartHost = this.processingChartRef?.nativeElement?.parentElement;
      if (typeof ResizeObserver !== 'undefined' && chartHost) {
        this.resizeObserver = new ResizeObserver(() => this.handleViewportResize());
        this.resizeObserver.observe(chartHost);
      }

      window.addEventListener('resize', this.handleViewportResize);
    }, 100);
  }

  private renderCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
    this.buildProcessingChart();
    this.buildSecurityChart();
    this.buildDistributionChart();
    this.buildStorageChart();
    this.buildUploadChart();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleViewportResize);
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  // ── Processing (Horizontal Bar) ───────────────────────────────────────────

  private buildProcessingChart(): void {
    const ctx = this.processingChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const p = this.data.processing;
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Verified', 'Pending Verification', 'Flagged Anomalies', 'Part of Enquiry'],
        datasets: [{
          data: [p.verified, p.pendingVerification, p.flaggedAnomalies, p.partOfEnquiry],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderRadius: 3,
          borderSkipped: false,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed.x}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#e5e7eb' },
            ticks: { font: { size: 11 }, color: '#6b7280' },
            title: { display: true, text: 'Documents', color: '#9ca3af', font: { size: 10, weight: 600 } },
            suggestedMax: Math.max(...[p.verified, p.pendingVerification, p.flaggedAnomalies, p.partOfEnquiry].map(value => Number(value || 0)), 1) * 1.25,
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#374151' },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Security (Line) ───────────────────────────────────────────────────────

  private buildSecurityChart(): void {
    const ctx = this.securityChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const days = this.data.securityEvents.map((e: { day: number }) => e.day);
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Failed Logins',
            data: this.data.securityEvents.map((e: { failedLogins: number }) => e.failedLogins),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            tension: 0.4, pointRadius: 3,
          },
          {
            label: 'Unusual Access Pattern',
            data: this.data.securityEvents.map((e: { unusualAccessPattern: number }) => e.unusualAccessPattern),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.4, pointRadius: 3,
          },
          {
            label: 'Permission Elevation Request',
            data: this.data.securityEvents.map((e: { permissionElevationRequest: number }) => e.permissionElevationRequest),
            borderColor: '#8b5cf6',
            backgroundColor: 'transparent',
            tension: 0.4, pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, boxWidth: 12, padding: 16 },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Day of Month', font: { size: 10 }, color: '#9ca3af' },
            grid: { color: '#f3f4f6' },
            ticks: { font: { size: 10 } },
          },
          y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Distribution (Doughnut) ───────────────────────────────────────────────

  private buildDistributionChart(): void {
    const ctx = this.distributionChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.distribution.map((d: { label: string }) => d.label),
        datasets: [{
          data: this.data.distribution.map((d: { count: number }) => d.count),
          backgroundColor: this.data.distribution.map((d: { color: string }) => d.color),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              usePointStyle: true,
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Storage (Doughnut) ────────────────────────────────────────────────────

  private buildStorageChart(): void {
    const ctx = this.storageChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const s = this.data.storage;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Used Storage', 'Available Storage'],
        datasets: [{
          data: [s.usedGb, s.availableGb],
          backgroundColor: ['#1e2a3a', '#e5e7eb'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              usePointStyle: true,
            },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // ── Upload Volume (Bar) ───────────────────────────────────────────────────

  private buildUploadChart(): void {
    const ctx = this.uploadChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.uploadVolume.map((u: { day: number }) => u.day),
        datasets: [{
          data: this.data.uploadVolume.map((u: { count: number }) => u.count),
          backgroundColor: '#1e2a3a',
          borderRadius: 2,
          barThickness: 14,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } },
        },
      },
    });
    this.charts.push(chart);
  }
}
