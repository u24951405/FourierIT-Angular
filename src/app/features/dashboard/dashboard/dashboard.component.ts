import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { environment } from '../../../../environments/environment';
import { ComplianceService, ComplianceUserSummary } from '../../../core/services/compliance.service';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface DashboardStats {
  totalDocuments: number;
  totalDelta: number;
  verifiedDocuments: number;
  verifiedPercent: number;
  pendingVerification: number;
  pendingUrgent: number;
  rejectedDocuments: number;
  expiringSoon: number;
  complianceRate: number;
  complianceDelta: number;
}

interface StatCard {
  key: string;
  value: string | number;
  label: string;
  sublabel: string;
  iconBg: string;
  iconColor: string;
  iconPath: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('verificationChart') verificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private router = inject(Router);
  private http = inject(HttpClient);
  private complianceService = inject(ComplianceService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Mock data — replace with API call
  stats: DashboardStats = {
    totalDocuments: 2847,
    totalDelta: 156,
    verifiedDocuments: 1842,
    verifiedPercent: 64.7,
    pendingVerification: 312,
    pendingUrgent: 23,
    rejectedDocuments: 98,
    expiringSoon: 47,
    complianceRate: 91,
    complianceDelta: 4,
  };

  complianceLoading = false;
  complianceError = '';
  complianceSummary: ComplianceUserSummary | null = null;
  complianceIssues: any[] = [];
  complianceMissingDocuments: any[] = [];
  hasComplianceData = false;

  statCards: StatCard[] = [
    {
      key: 'total',
      value: '2,847',
      label: 'Total Documents',
      sublabel: '+156 this month',
      iconBg: '#e0e7ff',
      iconColor: '#4f46e5',
      iconPath: 'document',
    },
    {
      key: 'verified',
      value: '1,842',
      label: 'Verified Documents',
      sublabel: '64.7% of total',
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      iconPath: 'check',
    },
    {
      key: 'pending',
      value: '312',
      label: 'Pending Verification',
      sublabel: '23 urgent',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      iconPath: 'clock',
    },
    {
      key: 'rejected',
      value: '98',
      label: 'Rejected Documents',
      sublabel: 'Requires resubmission',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconPath: 'x',
    },
    {
      key: 'expiring',
      value: '47',
      label: 'Expiring Soon',
      sublabel: 'Within 30 days',
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
      iconPath: 'triangle',
    },
    {
      key: 'compliance',
      value: '91%',
      label: 'Compliance Rate',
      sublabel: '+4% vs last month',
      iconBg: '#1e2a3a',
      iconColor: '#fff',
      iconPath: 'trend',
    },
  ];

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildVerificationChart();
      this.buildCategoryChart();
      this.buildRiskChart();
      this.loadComplianceData();
    }, 100);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  // ── Verification Status Doughnut ──────────────────────────────────────────

  private buildVerificationChart(): void {
    const ctx = this.verificationChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified', 'Pending', 'Rejected', 'Unreviewed'],
        datasets: [{
          data: [1842, 312, 98, 595],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#d1d5db'],
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

  // ── Documents by Category Doughnut ────────────────────────────────────────

  private buildCategoryChart(): void {
    const ctx = this.categoryChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['KYC', 'FICA', 'Corporate Gov.', 'Tax Compliance'],
        datasets: [{
          data: [1124, 876, 543, 304],
          backgroundColor: ['#1e2a3a', '#2d5282', '#7bafd4', '#b0cfe8'],
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

  // ── Risk Distribution Doughnut ────────────────────────────────────────────

  private buildRiskChart(): void {
    const ctx = this.riskChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
        datasets: [{
          data: [1124, 487, 198, 38],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#991b1b'],
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

  private loadComplianceData(): void {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) {
      this.complianceError = 'No current user available.';
      return;
    }

    this.complianceLoading = true;
    this.complianceError = '';

    this.complianceService.getUserCompliance(currentUserId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        this.complianceSummary = payload ?? null;
        this.hasComplianceData = !!payload;
        this.complianceLoading = false;
      },
      error: () => {
        this.complianceLoading = false;
        this.complianceError = 'Unable to load compliance information right now.';
      },
    });

    this.complianceService.getUserIssues(currentUserId).subscribe({
      next: (response: any) => {
        this.complianceIssues = response?.data ?? response ?? [];
      },
      error: () => {
        this.complianceIssues = [];
      },
    });

    this.complianceService.getUserMissingDocuments(currentUserId).subscribe({
      next: (response: any) => {
        this.complianceMissingDocuments = response?.data ?? response ?? [];
      },
      error: () => {
        this.complianceMissingDocuments = [];
      },
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

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }
}