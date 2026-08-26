import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { ComplianceDashboard, ComplianceService } from '../../../core/services/compliance.service';
import { DocumentsApiService, DocumentListItem } from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDepartmentAccessRequest } from '../../../core/models/institution.models';
import { countDocumentsByCategory } from '../my-documents/category-counts';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-department-documents-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './department-documents-dashboard.component.html',
  styleUrls: [
    '../../../features/dashboard/dashboard/dashboard.component.scss'
  ]
})
export class DepartmentDocumentsDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly complianceService = inject(ComplianceService);
  private readonly docsApi = inject(DocumentsApiService);
  private readonly requestService = inject(DocumentAccessRequestService);
  private charts: Chart[] = [];

  readonly today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<ComplianceDashboard | null>(null);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly pendingRequests = signal<PendingDepartmentAccessRequest[]>([]);
  readonly departmentId = signal<number | null>(null);

  readonly totalDocuments = computed(() => this.dashboard()?.totalUploaded ?? 0);
  readonly verifiedDocuments = computed(() => this.dashboard()?.totalVerified ?? 0);
  readonly pendingReview = computed(() => this.dashboard()?.totalPendingReview ?? 0);
  readonly rejectedDocuments = computed(() => this.dashboard()?.totalRejected ?? 0);
  readonly expiringSoon = computed(() => this.dashboard()?.totalExpiringSoon ?? 0);
  readonly missingDocuments = computed(() => this.dashboard()?.totalMissing ?? 0);
  readonly unreviewedDocuments = computed(() => Math.max(
    this.totalDocuments() - this.verifiedDocuments() - this.pendingReview() - this.rejectedDocuments(),
    0
  ));
  readonly categoryCounts = computed(() => countDocumentsByCategory(this.documents()));
  readonly recentDocuments = computed(() => [...this.documents()]
    .sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime())
    .slice(0, 5));
  readonly overallStatus = computed(() => {
    const summary = this.dashboard();
    if (!summary) return 'Unknown';
    if (summary.overallCompliancePercentage >= 90) return 'Compliant';
    if (summary.overallCompliancePercentage >= 70) return 'Review Required';
    if (summary.nonCompliantUsers > 0) return 'Non-Compliant';
    return 'Unknown';
  });
  readonly riskLevel = computed(() => {
    const summary = this.dashboard();
    if (!summary) return 'Unknown';
    if (summary.criticalRiskUsers > 0) return 'Critical';
    if (summary.highRiskUsers > 0) return 'High';
    if (summary.mediumRiskUsers > 0) return 'Medium';
    return 'Low';
  });

  ngOnInit(): void {
    this.auth.getCurrentAccount().subscribe({
      next: account => {
        if (account.departmentId == null) {
          this.error.set('Unable to identify the current department.');
          return;
        }

        this.departmentId.set(account.departmentId);
        this.loadDepartmentData(account.departmentId);
      },
      error: () => this.error.set('Unable to identify the current department.')
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.refreshCharts(), 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(chart => chart.destroy());
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  private loadDepartmentData(departmentId: number): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      dashboard: this.complianceService.getDepartmentDashboard(departmentId),
      documents: this.docsApi.getDepartmentDocuments(departmentId),
      requests: this.requestService.getPendingDepartmentRequests()
    }).subscribe({
      next: data => {
        this.dashboard.set(data.dashboard);
        this.documents.set(data.documents ?? []);
        this.pendingRequests.set(data.requests ?? []);
        this.loading.set(false);
        this.refreshCharts();
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Unable to load the department dashboard.');
      }
    });
  }

  private refreshCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    if (!this.verificationChartRef || !this.categoryChartRef) return;
    this.buildVerificationChart();
    this.buildCategoryChart();
  }

  private buildVerificationChart(): void {
    const canvas = this.verificationChartRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified', 'Pending', 'Rejected', 'Unreviewed'],
        datasets: [{
          data: [this.verifiedDocuments(), this.pendingReview(), this.rejectedDocuments(), this.unreviewedDocuments()],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#d1d5db'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private buildCategoryChart(): void {
    const canvas = this.categoryChartRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const existing = Chart.getChart(canvas);
    existing?.destroy();
    const counts = this.categoryCounts();

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['KYC', 'FICA', 'Tax', 'Other'],
        datasets: [{
          data: [counts.kyc, counts.fica, counts.tax, counts.other],
          backgroundColor: ['#1e2a3a', '#2d5282', '#7bafd4', '#b0cfe8'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private toIsoDate(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}
