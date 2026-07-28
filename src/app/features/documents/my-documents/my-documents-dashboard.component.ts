import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ComplianceService, ComplianceUserSummary } from '../../../core/services/compliance.service';
import { DocumentsApiService, DocumentListItem } from '../../../core/services/documents-api.service';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { PendingDocumentAccessRequest } from '../../../core/models/institution.models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-my-documents-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-documents-dashboard.component.html',
  styleUrls: ['../../../features/dashboard/dashboard/dashboard.component.scss']
})
export class MyDocumentsDashboardComponent implements OnInit {
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
        next: docs => this.documents.set(docs ?? []),
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
        this.complianceSummary.set(payload ?? null);
      },
      error: err => {
        console.warn('Unable to load owner compliance summary', err);
        this.complianceSummary.set(null);
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

  private getCurrentUserId(): string | null {
    const token = localStorage.getItem('docuvault_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = atob(padded);
      const claims = JSON.parse(decoded) as Record<string, unknown>;
      return typeof claims['sub'] === 'string' ? claims['sub'] : null;
    } catch {
      return null;
    }
  }
}
