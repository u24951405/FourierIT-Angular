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
} from '../../reports.models';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { ReportOwnerOption } from '../../../../core/services/reports.service';
import { OwnerPickerComponent } from '../../shared/owner-picker/owner-picker';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-activity-report',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent, OwnerPickerComponent],
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
    badgeLabel: 'ACTIVITY',
    badgeIcon: 'lock',
    accentColors: ['#10b981', '#3b82f6'],
  };

  data: ActivityReportData = {
    reportId: '',
    dateGenerated: new Date().toISOString(),
    documentOwner: 'Loading...',
    ownerId: '',
    complianceStatus: null,
    compliancePercentage: null,
    activeDocuments: 0,
    inactiveDocuments: 0,
    totalDocuments: 0,
    distributionByCategory: [],
    inventory: [],
    vaultAccessLog: [],
    clientRelationships: [],
  };

  pdfUrl = '';
  loaded = false;
  private groups: InventoryGroup[] = [];

  /**
   * People who don't upload documents (e.g. the Super Admin) have no vault of their own,
   * so they choose which document owner the report is about.
   */
  readonly showOwnerPicker = !this.authService.canUploadDocuments();
  selectedOwner: ReportOwnerOption | null = null;

  ngOnInit(): void {
    if (this.showOwnerPicker) return; // the owner picker reports the chosen owner (see onOwnerChange)
    const ownerId = this.authService.currentUser()?.id || 'unknown';
    this.loadReport(ownerId);
  }

  onOwnerChange(owner: ReportOwnerOption): void {
    this.selectedOwner = owner;
    this.loadReport(owner.userId);
  }

  private loadReport(ownerId: string): void {
    this.pdfUrl = `${environment.apiUrl}/reports/activity/${ownerId}/pdf`;
    this.loaded = false;
    this.data = { ...this.data, documentOwner: 'Loading...' };
    this.http.get<ActivityReportData>(`${environment.apiUrl}/reports/activity/${ownerId}`).subscribe({
      next: response => {
        this.data = response;
        this.groups = this.buildInventoryGroups();
        this.loaded = true;
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
    // Drawn when the page appears and again when the data arrives: replace the earlier chart, don't stack on it.
    Chart.getChart(this.totalDocsChartRef.nativeElement)?.destroy();
    this.charts = this.charts.filter(c => c.canvas !== this.totalDocsChartRef.nativeElement);
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Not active'],
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
        // The report prints its own legend (with counts) beside each chart.
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }

  private buildCategoryChart(): void {
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    // Drawn when the page appears and again when the data arrives: replace the earlier chart, don't stack on it.
    Chart.getChart(this.categoryChartRef.nativeElement)?.destroy();
    this.charts = this.charts.filter(c => c.canvas !== this.categoryChartRef.nativeElement);
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
        // The report prints its own legend (with counts) beside each chart.
        plugins: { legend: { display: false } },
      },
    });
    this.charts.push(chart);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'Verified': 'act-pill--good',
      'Expiring Soon': 'act-pill--warn',
      'Pending': 'act-pill--neutral',
      'Expired': 'act-pill--bad',
      'Rejected': 'act-pill--bad',
    };
    return map[status] ?? 'act-pill--neutral';
  }

  clientStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Active': 'act-pill--good',
      'Expired': 'act-pill--neutral',
      'Revoked': 'act-pill--bad',
    };
    return map[status] ?? 'act-pill--neutral';
  }

  /** e.g. "Compliant (100%)", or a plain note when no compliance check has run yet. */
  complianceSummary(): string {
    if (!this.loaded) return 'Loading…';
    if (!this.data.complianceStatus) return 'No compliance check yet';
    return `${this.data.complianceStatus} (${this.data.compliancePercentage ?? 0}%)`;
  }

  complianceClass(): string {
    const status = (this.data.complianceStatus ?? '').toLowerCase();
    if (!this.loaded || !status) return 'act-pill--neutral';
    if (status === 'compliant') return 'act-pill--good';
    return status.includes('non') ? 'act-pill--bad' : 'act-pill--warn';
  }

  activePercent(): number {
    return this.data.totalDocuments ? Math.round((this.data.activeDocuments / this.data.totalDocuments) * 100) : 0;
  }

  inactivePercent(): number {
    return this.data.totalDocuments ? 100 - this.activePercent() : 0;
  }

  activeClientCount(): number {
    return this.data.clientRelationships.filter(c => c.status === 'Active').length;
  }

  totalShared(): number {
    return this.data.clientRelationships.reduce((sum, c) => sum + c.documentsShared, 0);
  }

  inventoryGroups(): InventoryGroup[] {
    return this.groups;
  }

  /** Groups the inventory by document type once per load, rather than on every change detection. */
  private buildInventoryGroups(): InventoryGroup[] {
    const colorByType = new Map(this.data.distributionByCategory.map(d => [d.label, d.color]));
    const groups = new Map<string, DocumentInventoryItem[]>();
    for (const item of this.data.inventory ?? []) {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    }
    return [...groups.entries()].map(([category, rows]) => ({
      category,
      color: colorByType.get(category) ?? rows[0]?.categoryColor ?? '#9ca3af',
      rows,
      totalCount: rows.length,
      activeCount: rows.filter(r => r.verificationStatus === 'Verified' || r.verificationStatus === 'Expiring Soon').length,
      attentionCount: rows.filter(r => r.verificationStatus !== 'Verified' && r.verificationStatus !== 'Pending').length,
    }));
  }
}

interface InventoryGroup {
  category: string;
  color: string;
  rows: DocumentInventoryItem[];
  totalCount: number;
  activeCount: number;
  /** Expiring soon, expired or rejected. */
  attentionCount: number;
}
