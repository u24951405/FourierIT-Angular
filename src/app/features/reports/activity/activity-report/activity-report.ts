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
import { HttpClient } from '@angular/common/http';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import {
  ActivityReportData,
  DocumentInventoryItem,
  VaultAccessLogEntry,
  ClientRelationship,
} from '../../reports.models';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-activity-report',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './activity-report.html',
  styleUrls: ['./activity-report.scss'],
})
export class ActivityReportComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  @ViewChild('totalDocsChart') totalDocsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown User';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown User';
  }

  frameConfig: ReportFrameConfig = {
    reportId: 'DV-DAR-LOADING',
    dateGenerated: new Date().toISOString(),
    createdBy: this.generatedBy(),
    reportType: 'Document Activity Report',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'ID VERIFIED',
    badgeIcon: 'check',
    accentColors: ['#10b981', '#3b82f6'],
  };

  data: ActivityReportData = {
    reportId: '',
    dateGenerated: new Date().toISOString(),
    documentOwner: 'Loading...',
    ownerId: '',
    activeDocuments: 0,
    inactiveDocuments: 0,
    totalDocuments: 0,
    distributionByCategory: [],
    inventory: [],
    vaultAccessLog: [],
    clientRelationships: [],
  };

  pdfUrl = '';

  ngOnInit(): void {
    const ownerId = this.authService.currentUser()?.id || 'unknown';
    this.pdfUrl = `${environment.apiUrl}/reports/activity/${ownerId}/pdf`;
    this.http.get<ActivityReportData>(`${environment.apiUrl}/reports/activity/${ownerId}`).subscribe({
      next: response => {
        this.data = response;
        this.frameConfig = {
          ...this.frameConfig,
          reportId: response.reportId,
          dateGenerated: response.dateGenerated,
          createdBy: this.generatedBy(),
        };
        this.buildTotalDocsChart();
        this.buildCategoryChart();
      },
      error: () => {
        this.data.documentOwner = 'Document activity unavailable';
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildTotalDocsChart();
      this.buildCategoryChart();
    }, 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  private buildTotalDocsChart(): void {
    const ctx = this.totalDocsChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Inactive / Expiring'],
        datasets: [{
          data: [this.data.activeDocuments, this.data.inactiveDocuments],
          backgroundColor: ['#10b981', '#e5e7eb'],
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
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

  private buildCategoryChart(): void {
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.data.distributionByCategory.map(d => d.label),
        datasets: [{
          data: this.data.distributionByCategory.map(d => d.count),
          backgroundColor: this.data.distributionByCategory.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        cutout: '68%',
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

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'Verified': 'inv-status--verified',
      'Expiring Soon': 'inv-status--expiring',
      'Pending': 'inv-status--pending',
      'Expired': 'inv-status--expired',
    };
    return map[status] ?? '';
  }

  clientStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Active': 'client-status--active',
      'Pending': 'client-status--pending',
      'Expired': 'client-status--expired',
    };
    return map[status] ?? '';
  }

  activePercent(): number {
    return Math.round((this.data.activeDocuments / this.data.totalDocuments) * 100);
  }
}