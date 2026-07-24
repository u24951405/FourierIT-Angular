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

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-activity-report',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './activity-report.html',
  styleUrls: ['./activity-report.scss'],
})
export class ActivityReportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('totalDocsChart') totalDocsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  frameConfig: ReportFrameConfig = {
    reportId: 'DV-DAR-4164163896',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    reportType: 'Document Activity Report',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'ID VERIFIED',
    badgeIcon: 'check',
    accentColors: ['#10b981', '#3b82f6'],
  };

  data: ActivityReportData = {
    reportId: 'DV-DAR-4164163896',
    dateGenerated: new Date().toISOString(),
    documentOwner: 'James Fourier',
    ownerId: 'DOC-OWNER-00142',
    activeDocuments: 9,
    inactiveDocuments: 3,
    totalDocuments: 12,
    distributionByCategory: [
      { label: 'Proof of Identity', count: 3, percentage: 25, color: '#1e2a3a' },
      { label: 'Proof of Residence', count: 3, percentage: 25, color: '#2d5282' },
      { label: 'Company Registration', count: 2, percentage: 17, color: '#4a7fb5' },
      { label: 'Authority to Act / Signing Mandate', count: 2, percentage: 17, color: '#7bafd4' },
      { label: 'Shareholder / Ownership Structure', count: 2, percentage: 17, color: '#b0cfe8' },
    ],
    inventory: [
      { documentName: 'SA Identity Document', category: 'Proof of Identity', categoryColor: '#dbeafe', uploadDate: '2023-02-10', expiryDate: '2028-02-10', verificationStatus: 'Verified' },
      { documentName: 'Certified Passport Copy', category: 'Proof of Identity', categoryColor: '#dbeafe', uploadDate: '2023-02-10', expiryDate: '2028-02-10', verificationStatus: 'Verified' },
      { documentName: 'Utility Bill — March 2026', category: 'Proof of Residence', categoryColor: '#dcfce7', uploadDate: '2026-03-15', expiryDate: '2026-06-15', verificationStatus: 'Expiring Soon' },
      { documentName: 'Lease Agreement', category: 'Proof of Residence', categoryColor: '#dcfce7', uploadDate: '2025-01-05', expiryDate: '2026-01-05', verificationStatus: 'Verified' },
      { documentName: 'CIPC Registration Certificate', category: 'Company Registration', categoryColor: '#fef9c3', uploadDate: '2024-04-20', expiryDate: '2027-04-20', verificationStatus: 'Verified' },
      { documentName: 'Certificate of Incorporation', category: 'Company Registration', categoryColor: '#fef9c3', uploadDate: '2024-04-20', expiryDate: null, verificationStatus: 'Verified' },
      { documentName: 'Board Resolution — Jan 2026', category: 'Authority to Act / Signing Mandate', categoryColor: '#fce7f3', uploadDate: '2026-01-12', expiryDate: '2027-01-12', verificationStatus: 'Verified' },
      { documentName: 'Signing Mandate (Notarised)', category: 'Authority to Act / Signing Mandate', categoryColor: '#fce7f3', uploadDate: '2025-06-01', expiryDate: '2026-06-01', verificationStatus: 'Expiring Soon' },
      { documentName: 'Beneficial Ownership Declaration', category: 'Shareholder / Ownership Structure', categoryColor: '#ede9fe', uploadDate: '2026-02-28', expiryDate: '2027-02-28', verificationStatus: 'Pending' },
      { documentName: 'SARS Tax Clearance Certificate', category: 'Proof of Identity', categoryColor: '#dbeafe', uploadDate: '2025-11-10', expiryDate: '2026-11-10', verificationStatus: 'Verified' },
      { documentName: 'Bank Confirmation Letter', category: 'Proof of Residence', categoryColor: '#dcfce7', uploadDate: '2026-04-01', expiryDate: '2026-07-01', verificationStatus: 'Expiring Soon' },
    ],
    vaultAccessLog: [
      { timestamp: '2026-07-02 09:14', accessorName: 'Sarah Johnson', accessorRole: 'FICA Compliance Officer', actionReason: 'Document verification — SA Identity Document', organisation: 'Fourier Financial Services' },
      { timestamp: '2026-07-01 15:45', accessorName: 'Michael Chen', accessorRole: 'KYC Analyst', actionReason: 'Viewed Shareholder Register for due diligence review', organisation: 'Global Compliance Corp' },
      { timestamp: '2026-07-01 11:38', accessorName: 'Emma Davis', accessorRole: 'Compliance Officer', actionReason: 'Downloaded Board Resolution for account opening', organisation: 'Enterprise Solutions Ltd' },
      { timestamp: '2026-06-30 14:22', accessorName: 'James Wilson', accessorRole: 'Audit Lead', actionReason: 'Reviewed full document inventory for regulatory audit', organisation: 'Legal Partners Group' },
      { timestamp: '2026-06-25 10:05', accessorName: 'Lisa Anderson', accessorRole: 'FICA Compliance Officer', actionReason: 'Verified Beneficial Ownership Declaration', organisation: 'Audit Associates' },
      { timestamp: '2026-06-25 08:58', accessorName: 'Robert Chen', accessorRole: 'KYC Analyst', actionReason: 'Requested access to CIPC Registration Certificate', organisation: 'Fourier Financial Services' },
      { timestamp: '2026-06-25 15:18', accessorName: 'Anna Müller', accessorRole: 'Risk Officer', actionReason: 'Viewed Signing Mandate for risk classification', organisation: 'Global Compliance Corp' },
      { timestamp: '2026-06-18 13:42', accessorName: 'System Engine', accessorRole: 'Automated Monitor', actionReason: 'Expiry alert triggered — Utility Bill approaching 3-month limit', organisation: 'DocuVault Platform' },
    ],
    clientRelationships: [
      { organisation: 'Fourier Financial Services', documentsShared: 45, status: 'Active' },
      { organisation: 'Global Compliance Corp', documentsShared: 32, status: 'Active' },
      { organisation: 'Enterprise Solutions Ltd', documentsShared: 28, status: 'Active' },
      { organisation: 'Legal Partners Group', documentsShared: 15, status: 'Pending' },
      { organisation: 'Audit Associates', documentsShared: 12, status: 'Active' },
    ],
  };

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
        plugins: { legend: { display: false } },
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
        plugins: { legend: { display: false } },
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