import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentsApiService, DocumentDetailItem, DocumentListItem } from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { ToastService } from '../../../core/services/toast.service';
import { ComplianceService, ComplianceUserSummary } from '../../../core/services/compliance.service';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-my-documents-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-documents-dashboard.component.html',
  styleUrls: ['./my-documents.component.scss', '../../../features/dashboard/dashboard/dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyDocumentsDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private router = inject(Router);
  private docsApi = inject(DocumentsApiService);
  private requestService = inject(DocumentAccessRequestService);
  private complianceService = inject(ComplianceService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly detailDocument = signal<DocumentDetailItem | null>(null);
  readonly shareDocumentId = signal<number | null>(null);
  readonly shareRecipient = signal('');
  readonly shareAccessLevel = signal('0');
  readonly shareExpiryDate = signal('');
  readonly shareReason = signal('');
  readonly sharing = signal(false);
  readonly loadingDetail = signal(false);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequestsError = signal<string | null>(null);
  readonly complianceSummary = signal<ComplianceUserSummary | null>(null);

  readonly documentCount = computed(() => this.documents().length);
  readonly approvedDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'approved').length);
  readonly rejectedDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'rejected').length);
  readonly pendingRequestCount = computed(() => this.pendingRequests().length);
  readonly documentsPendingReviewCount = computed(() => this.documents().filter(doc => {
    const status = doc.currentStatus?.toLowerCase() ?? '';
    return status === 'pending' || status === 'under review' || status === 'awaiting verification';
  }).length);
  readonly expiringDocumentCount = computed(() => this.documents().filter(doc => doc.currentStatus?.toLowerCase() === 'expiring' || doc.currentStatus?.toLowerCase() === 'expires soon').length);
  readonly compliancePercentage = computed(() => {
    const total = this.documents().length;
    return total === 0 ? 0 : Math.round((this.approvedDocumentCount() / total) * 100);
  });
  readonly recentDocuments = computed(() => [...this.documents()].sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()).slice(0, 5));
  readonly unreviewedDocumentCount = computed(() => {
    const total = this.documents().length;
    const counted = this.approvedDocumentCount() + this.documentsPendingReviewCount() + this.rejectedDocumentCount();
    return Math.max(total - counted, 0);
  });
  readonly complianceRate = computed(() => {
    const total = this.documents().length;
    return total === 0 ? 0 : Math.round((this.approvedDocumentCount() / total) * 100);
  });
  readonly complianceRateDelta = computed(() => '+6% vs last month');
  readonly categoryCounts = computed(() => {
    const counts = { kyc: 0, fica: 0, tax: 0, other: 0 };
    this.documents().forEach(doc => {
      const name = (doc.documentTypeName || '').toLowerCase();
      if (name.includes('kyc')) counts.kyc += 1;
      else if (name.includes('fica')) counts.fica += 1;
      else if (name.includes('tax')) counts.tax += 1;
      else counts.other += 1;
    });
    return counts;
  });
  readonly recentComplianceChecks = computed(() =>
    [...this.documents()]
      .sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime())
      .slice(0, 5)
  );
  readonly latestRequests = computed(() => this.pendingRequests().slice(0, 5));

  ngOnInit(): void {
    this.loadDocuments();
    this.loadPendingRequests();
    this.loadComplianceSummary();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildVerificationChart();
      this.buildCategoryChart();
      this.buildRiskChart();
    }, 100);
  }

  get filteredDocuments(): DocumentListItem[] {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.documents();
    return this.documents().filter(doc =>
      doc.fileName.toLowerCase().includes(query) ||
      doc.documentTypeName.toLowerCase().includes(query) ||
      doc.currentStatus.toLowerCase().includes(query)
    );
  }

  openTemporaryUploadPage(): void {
    this.router.navigate(['/documents/upload']);
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  download(doc: DocumentListItem): void {
    this.docsApi.downloadDocument(doc.documentId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.show(`Could not download ${doc.fileName}.`, 'error')
    });
  }

  openDetails(doc: DocumentListItem): void {
    this.loadingDetail.set(true);
    this.detailDocument.set(null);

    this.docsApi.getDocumentById(doc.documentId)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: detail => this.detailDocument.set(detail),
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load document details.';
          this.toast.show(message, 'error');
        }
      });
  }

  openShare(doc: DocumentListItem): void {
    this.shareDocumentId.set(doc.documentId);
    this.shareRecipient.set('');
    this.shareAccessLevel.set('0');
    this.shareExpiryDate.set('');
    this.shareReason.set('');
  }

  closeDetail(): void {
    this.detailDocument.set(null);
  }

  closeShare(): void {
    this.shareDocumentId.set(null);
  }

  submitShare(): void {
    const documentId = this.shareDocumentId();
    if (!documentId || !this.shareRecipient().trim()) {
      this.toast.show('Enter a user id, username, or email to share with.', 'error');
      return;
    }

    this.sharing.set(true);
    this.docsApi.shareDocument(documentId, {
      grantToUserId: this.shareRecipient().trim(),
      accessLevel: Number(this.shareAccessLevel()),
      expiryDate: this.shareExpiryDate() || null,
      reason: this.shareReason().trim() || ''
    })
      .pipe(finalize(() => this.sharing.set(false)))
      .subscribe({
        next: response => {
          this.toast.show(response.message || 'Document shared.', 'success');
          this.closeShare();
        },
        error: err => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not share the document.';
          this.toast.show(message, 'error');
        }
      });
  }

  delete(doc: DocumentListItem): void {
    if (!confirm(`Delete ${doc.fileName}?`)) return;

    this.docsApi.deleteDocument(doc.documentId).subscribe({
      next: () => {
        this.documents.update(list => list.filter(item => item.documentId !== doc.documentId));
        this.toast.show('Document deleted.', 'success');
      },
      error: err => {
        const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not delete document.';
        this.toast.show(message, 'error');
      }
    });
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: docs => this.documents.set(docs ?? []),
        error: err => {
          this.documents.set([]);
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
        }
      });
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

  private loadComplianceSummary(): void {
    const currentUserId = this.auth.getCurrentUserId();
    if (!currentUserId) {
      this.complianceSummary.set(null);
      return;
    }

    this.complianceService.getUserCompliance(currentUserId).subscribe({
      next: response => {
        const payload = response?.data ?? response;
        this.complianceSummary.set(this.normalizeComplianceSummary(payload) ?? null);
      },
      error: err => {
        console.warn('Unable to load owner compliance summary', err);
        this.complianceSummary.set(null);
      }
    });
  }

  private normalizeComplianceSummary(payload: any): ComplianceUserSummary | null {
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

    return summary as ComplianceUserSummary;
  }

  private buildVerificationChart(): void {
    const ctx = this.verificationChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const approved = this.approvedDocumentCount();
    const pending = this.documentsPendingReviewCount();
    const rejected = this.rejectedDocumentCount();
    const unreviewed = this.unreviewedDocumentCount();

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
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });

    this.charts.push(chart);
  }

  private buildCategoryChart(): void {
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

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
        cutout: '72%',
        plugins: { legend: { display: false } }
      }
    });

    this.charts.push(chart);
  }

  private buildRiskChart(): void {
    const ctx = this.riskChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const low = Math.max(this.approvedDocumentCount(), 1);
    const medium = Math.max(this.documentsPendingReviewCount(), 1);
    const high = Math.max(this.rejectedDocumentCount(), 1);
    const critical = Math.max(this.unreviewedDocumentCount(), 1);

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
        datasets: [{
          data: [low, medium, high, critical],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#991b1b'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        cutout: '72%',
        plugins: { legend: { display: false } }
      }
    });

    this.charts.push(chart);
  }
}
