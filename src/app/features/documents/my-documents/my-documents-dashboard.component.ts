import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ComplianceService, ComplianceUserSummary } from '../../../core/services/compliance.service';
import { DocumentsApiService, DocumentListItem } from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { finalize } from 'rxjs';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { countDocumentsByCategory } from './category-counts';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-my-documents-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-documents-dashboard.component.html',
  styleUrls: ['../../../features/dashboard/dashboard/dashboard.component.scss']
})
export class MyDocumentsDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildVerificationChart();
      this.buildCategoryChart();
    }, 100);
  }
  private router = inject(Router);
  private docsApi = inject(DocumentsApiService);
  private complianceService = inject(ComplianceService);
  private requestService = inject(DocumentAccessRequestService);
  readonly auth = inject(AuthService);

  readonly today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequestsError = signal<string | null>(null);
  readonly complianceSummary = signal<ComplianceUserSummary | null>(null);

  readonly documentCount = computed(() => this.complianceSummary()?.uploaded ?? this.documents().length);
  readonly approvedDocumentCount = computed(() => this.complianceSummary()?.compliant ?? this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'approved').length);
  readonly rejectedDocumentCount = computed(() => this.complianceSummary()?.nonCompliant ?? this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'rejected').length);
  readonly documentsPendingReviewCount = computed(() => this.complianceSummary()?.pendingReviewDocuments ?? this.documents().filter(doc => {
    const status = doc.currentStatus?.toLowerCase() ?? '';
    return status === 'pending' || status === 'under review' || status === 'awaiting verification';
  }).length);
  readonly expiringDocumentCount = computed(() => this.complianceSummary()?.expired ?? this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'expiring' || doc.currentStatus?.toLowerCase() === 'expires soon').length);
  readonly pendingRequestCount = computed(() => this.pendingRequests().length);
  readonly recentDocuments = computed(() => [...this.documents()].sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()).slice(0, 5));
  readonly complianceRate = computed(() => this.complianceSummary()?.compliancePercentage ?? 0);
  readonly complianceRateDelta = computed(() => {
    const summary = this.complianceSummary();
    if (summary?.overallStatus) {
      return `Status: ${summary.overallStatus}`;
    }
    return '+6% vs last month';
  });
  readonly categoryCounts = computed(() => countDocumentsByCategory(this.documents()));

  ngOnInit(): void {
    this.loadDocuments();
    this.loadPendingRequests();
    this.loadComplianceSummary();
  }

  openTemporaryUploadPage(): void {
    this.router.navigate(['/documents/upload']);
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: docs => {
          this.documents.set(docs ?? []);
          this.refreshCharts();
        },
        error: err => {
          this.documents.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
        }
      });
  }

  private loadComplianceSummary(): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      this.complianceSummary.set(null);
      return;
    }

    this.complianceService.getUserCompliance(currentUserId).subscribe({
      next: response => {
        const payload = response?.data ?? response;
        this.complianceSummary.set(this.normalizeComplianceSummary(payload) ?? null);
        this.refreshCharts();
      },
      error: err => {
        console.warn('Unable to load owner compliance summary', err);
        this.complianceSummary.set(null);
      }
    });
  }

  private refreshCharts(): void {
    console.log('refreshCharts called', {
      hasVerificationRef: !!this.verificationChartRef,
      hasCategoryRef: !!this.categoryChartRef,
      documents: this.documents().length,
      compliance: this.complianceSummary(),
    });

    // destroy existing charts
    this.charts.forEach(c => {
      try { c.destroy(); } catch { /* ignore */ }
    });
    this.charts = [];

    // only build if view children are available
    if (this.verificationChartRef && this.categoryChartRef) {
      this.buildVerificationChart();
      this.buildCategoryChart();
    }
  }

  private loadPendingRequests(): void {
    this.pendingRequestsLoading.set(true);
    this.pendingRequestsError.set(null);

    this.requestService.getPendingRequests()
      .pipe(finalize(() => this.pendingRequestsLoading.set(false)))
      .subscribe({
        next: requests => this.pendingRequests.set(requests ?? []),
        error: err => {
          this.pendingRequests.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load pending requests.';
          this.pendingRequestsError.set(message);
        }
      });
  }

  private normalizeComplianceSummary(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const summary = { ...payload } as Record<string, any>;
    const uploaded = Number(summary['uploaded'] ?? summary['Uploaded'] ?? 0);
    const compliant = Number(summary['compliant'] ?? summary['Compliant'] ?? 0);
    const nonCompliant = Number(summary['nonCompliant'] ?? summary['NonCompliant'] ?? 0);
    const pendingReviewDocuments = Number(summary['pendingReviewDocuments'] ?? summary['PendingReviewDocuments'] ?? 0);
    const expired = Number(summary['expired'] ?? summary['Expired'] ?? 0);
    const missing = Number(summary['missing'] ?? summary['Missing'] ?? 0);

    summary['uploaded'] = uploaded;
    summary['compliant'] = compliant;
    summary['nonCompliant'] = nonCompliant;
    summary['pendingReviewDocuments'] = pendingReviewDocuments;
    summary['expired'] = expired;
    summary['missing'] = missing;

    if (summary['compliancePercentage'] == null && summary['CompliancePercentage'] != null) {
      summary['compliancePercentage'] = Number(summary['CompliancePercentage']);
    }
    if (summary['complianceScore'] == null && summary['ComplianceScore'] != null) {
      summary['complianceScore'] = Number(summary['ComplianceScore']);
    }
    if (!summary['overallStatus'] && summary['OverallStatus']) {
      summary['overallStatus'] = summary['OverallStatus'];
    }
    if (!summary['riskLevel'] && summary['RiskLevel']) {
      summary['riskLevel'] = summary['RiskLevel'];
    }

    return summary;
  }

  private getCurrentUserId(): string | null {
    return this.auth.getCurrentUserId();
  }

  private buildVerificationChart(): void {
    const ctx = this.verificationChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    // destroy any existing Chart instance attached to this canvas to avoid double-initialization
    try {
      const existing = Chart.getChart(this.verificationChartRef.nativeElement as HTMLCanvasElement);
      if (existing) existing.destroy();
    } catch { /* ignore */ }
    const approved = this.approvedDocumentCount();
    const pending = this.documentsPendingReviewCount();
    const rejected = this.rejectedDocumentCount();
    const unreviewed = Math.max(this.documentCount() - (approved + pending + rejected), 0);

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified', 'Pending', 'Rejected', 'Unreviewed'],
        datasets: [{
          data: [approved, pending, rejected, unreviewed],
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
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    // destroy any existing Chart instance attached to this canvas
    try {
      const existing = Chart.getChart(this.categoryChartRef.nativeElement as HTMLCanvasElement);
      if (existing) existing.destroy();
    } catch { /* ignore */ }
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
}
