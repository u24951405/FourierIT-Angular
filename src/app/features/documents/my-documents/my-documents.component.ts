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

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-documents.component.html',
  styleUrls: ['./my-documents.component.scss', '../../../features/dashboard/dashboard/dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MyDocumentsComponent implements OnInit, AfterViewInit {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private router = inject(Router);
  private docsApi = inject(DocumentsApiService);
  private requestService = inject(DocumentAccessRequestService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly loading = signal(false);
  readonly documents = signal<DocumentListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly detailDocument = signal<DocumentDetailItem | null>(null);
  readonly shareDocumentId = signal<number | null>(null);
  readonly shareRecipient = signal('');
  readonly shareAccessLevel = signal('0');
  readonly shareExpiryDate = signal('');
  readonly shareReason = signal('');
  readonly sharing = signal(false);
  readonly loadingDetail = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly previewName = signal<string | null>(null);
  readonly previewType = signal<'pdf' | 'image' | 'other'>('other');
  readonly previewLoading = signal(false);
  readonly pendingRequests = signal<PendingDocumentAccessRequest[]>([]);
  readonly pendingRequestsLoading = signal(false);
  readonly pendingRequestsError = signal<string | null>(null);

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
  readonly calendarDays = computed(() => this.buildCalendarDays(this.calendarMonth()));
  readonly calendarEvents = computed(() => this.buildCalendarEvents(this.documents(), this.calendarMonth()));
  readonly calendarSummary = computed(() => {
    const events = this.calendarEvents();
    return {
      expiring: events.filter(item => item.type === 'expiring').length,
      update: events.filter(item => item.type === 'update').length
    };
  });

  ngOnInit(): void {
    this.loadDocuments();
    this.loadPendingRequests();
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

  previousMonth(): void {
    const monthDate = this.calendarMonth();
    this.calendarMonth.set(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const monthDate = this.calendarMonth();
    this.calendarMonth.set(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
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

  openPreview(doc: DocumentListItem): void {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }

    this.previewLoading.set(true);
    this.previewName.set(doc.fileName);
    this.previewType.set('other');
    this.previewUrl.set(null);

    this.docsApi.downloadDocument(doc.documentId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const type = (blob.type || '').toLowerCase();
        if (type.includes('pdf')) {
          this.previewType.set('pdf');
        } else if (type.startsWith('image/')) {
          this.previewType.set('image');
        } else {
          this.previewType.set('other');
        }
        this.previewUrl.set(url);
        this.previewLoading.set(false);
      },
      error: err => {
        this.previewLoading.set(false);
        this.previewUrl.set(null);
        const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not open the document preview.';
        this.toast.show(message, 'error');
      }
    });
  }

  closePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
    this.previewName.set(null);
    this.previewType.set('other');
    this.previewLoading.set(false);
  }

  openPreviewInNewTab(): void {
    const url = this.previewUrl();
    if (!url) return;

    if (this.previewType() === 'other') {
      this.toast.show('This file type cannot be opened in a new tab.', 'error');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openEventDocument(event: { documentId: number; fileName: string }): void {
    const doc = this.documents().find(item => item.documentId === event.documentId);
    if (!doc) {
      this.toast.show(`Could not find ${event.fileName}.`, 'error');
      return;
    }

    this.openPreview(doc);
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

  private buildCalendarDays(monthDate: Date): Date[] {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startDay = start.getDay();
    const offset = (startDay + 6) % 7;
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - offset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      days.push(day);
    }

    return days;
  }

  private buildCalendarEvents(documents: DocumentListItem[], monthDate: Date): Array<{ date: string; type: 'expiring' | 'update'; label: string; title: string; documentId: number; fileName: string }> {
    const events: Array<{ date: string; type: 'expiring' | 'update'; label: string; title: string; documentId: number; fileName: string }> = [];
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    for (const doc of documents) {
      const status = (doc.currentStatus ?? '').toLowerCase();
      const sourceDate = this.parseDate(doc.lastModifiedDate || doc.uploadedDate) ?? new Date();
      let dueDate: Date | null = null;

      if (status.includes('expiring') || status.includes('expires soon') || status.includes('expired')) {
        dueDate = new Date(sourceDate);
        dueDate.setDate(dueDate.getDate() + 365);
      } else if (status.includes('rejected') || status.includes('pending') || status.includes('review') || status.includes('awaiting verification')) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
      }

      if (!dueDate) {
        continue;
      }

      if (dueDate < monthStart || dueDate > monthEnd) {
        continue;
      }

      const eventType: 'expiring' | 'update' = status.includes('reject') || status.includes('pending') || status.includes('review') || status.includes('awaiting verification') ? 'update' : 'expiring';
      const title = `${doc.fileName} (${eventType === 'expiring' ? 'Expiring' : 'Needs update'})`;
      events.push({
        date: this.toIsoDate(dueDate),
        type: eventType,
        label: eventType === 'expiring' ? 'Expiring' : 'Update',
        title,
        documentId: doc.documentId,
        fileName: doc.fileName
      });
    }

    return events;
  }

  private parseDate(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toIsoDate(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
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

