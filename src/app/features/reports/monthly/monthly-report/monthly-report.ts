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
  @ViewChild('processingChart') processingChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('securityChart') securityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('storageChart') storageChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('uploadChart') uploadChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private resizeObserver?: ResizeObserver;
  private readonly handleViewportResize = () => {
    this.charts.forEach(chart => chart.resize());
  };

  frameConfig: ReportFrameConfig = {
    reportId: 'DV-OPR-4163721330',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    reportType: 'Monthly Automated',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'MONTHLY',
    badgeIcon: 'bar',
    accentColors: ['#10b981', '#3b82f6'],
  };

  // Mock data — replace with API call
  data: MonthlyReportData = {
    reportId: 'DV-OPR-4163721330',
    month: 'July 2026',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    processing: { verified: 1842, pendingVerification: 312, flaggedAnomalies: 87, partOfEnquiry: 43 },
    securityEvents: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      failedLogins: Math.floor(Math.random() * 5 + 1),
      unusualAccessPattern: Math.floor(Math.random() * 8 + 2),
      permissionElevationRequest: Math.floor(Math.random() * 6 + 1),
    })),
    distribution: [
      { label: 'Natural Person Ingestion', count: 634, percentage: 34, color: '#1e2a3a' },
      { label: 'Juristic / Corporate Assets', count: 487, percentage: 26, color: '#2d5282' },
      { label: 'Beneficial Ownership Manifests', count: 312, percentage: 17, color: '#4a7fb5' },
      { label: 'Fiduciary Frameworks', count: 219, percentage: 12, color: '#7bafd4' },
      { label: 'Supplementary Verification', count: 194, percentage: 11, color: '#b0cfe8' },
    ],
    storage: { usedGb: 847, availableGb: 176, totalGb: 1023, usedPercentage: 82.8 },
    uploadVolume: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      count: Math.floor(Math.random() * 70 + 10),
    })),
    totalUploads: 1304,
    dailyAverage: 42,
    peakDay: 23,
  };

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildProcessingChart();
      this.buildSecurityChart();
      this.buildDistributionChart();
      this.buildStorageChart();
      this.buildUploadChart();

      const chartHost = this.processingChartRef?.nativeElement?.parentElement;
      if (typeof ResizeObserver !== 'undefined' && chartHost) {
        this.resizeObserver = new ResizeObserver(() => this.handleViewportResize());
        this.resizeObserver.observe(chartHost);
      }

      window.addEventListener('resize', this.handleViewportResize);
    }, 100);
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
          barThickness: 20,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
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
        plugins: { legend: { display: false } },
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
        plugins: { legend: { display: false } },
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
