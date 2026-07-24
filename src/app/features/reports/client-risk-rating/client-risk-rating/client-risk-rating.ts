import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { ClientRiskReportData, RiskLevel } from '../../reports.models';

@Component({
  selector: 'app-client-risk-rating',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './client-risk-rating.html',
  styleUrls: ['./client-risk-rating.scss'],
})
export class ClientRiskRatingComponent {
  RiskLevel = RiskLevel;

  frameConfig: ReportFrameConfig = {
    reportId: 'DV-CRR-4164163897',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    reportType: 'Client Risk Rating — Executive Summary',
    framework: 'FICA · FATF · DocuVault v35',
    badgeLabel: 'RISK MATRIX',
    badgeIcon: 'trend',
    accentColors: ['#ef4444', '#f59e0b', '#10b981'],
  };

  data: ClientRiskReportData = {
    reportId: 'DV-CRR-4164163897',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    totalProfiles: 12,
    portfolioAvgScore: 64.4,
    strata: [
      {
        level: RiskLevel.HIGH,
        averageScore: 108.5,
        pepElevatedCount: 4,
        profiles: [
          { name: 'Meridian Capital Structures (Pty) Ltd', referenceId: 'CRP-00441', entityType: 'Private Company', jurisdiction: 'South Africa / Mauritius', baseScore: 68, pepMultiplier: 1.35, isPep: true, geographicScore: 22, finalCompositeScore: 113.8, riskLevel: RiskLevel.HIGH },
          { name: 'Nkosi Holdings Trust', referenceId: 'CRP-00362', entityType: 'Inter Vivos Trust', jurisdiction: 'South Africa', baseScore: 72, pepMultiplier: 1.20, isPep: true, geographicScore: 15, finalCompositeScore: 101.4, riskLevel: RiskLevel.HIGH },
          { name: 'Vantage Offshore Partners', referenceId: 'CRP-00519', entityType: 'Partnership', jurisdiction: 'Cayman Islands', baseScore: 65, pepMultiplier: 1.25, isPep: true, geographicScore: 28, finalCompositeScore: 109.3, riskLevel: RiskLevel.HIGH },
          { name: 'Zenith Trade Finance Ltd', referenceId: 'CRP-00607', entityType: 'Private Company', jurisdiction: 'UAE / South Africa', baseScore: 61, pepMultiplier: 1.40, isPep: true, geographicScore: 24, finalCompositeScore: 109.4, riskLevel: RiskLevel.HIGH },
        ],
      },
      {
        level: RiskLevel.MEDIUM,
        averageScore: 57.7,
        pepElevatedCount: 2,
        profiles: [
          { name: 'Fourier Group Headquarters', referenceId: 'CRP-00298', entityType: 'Private Company', jurisdiction: 'South Africa', baseScore: 42, pepMultiplier: 1.00, isPep: false, geographicScore: 8, finalCompositeScore: 50, riskLevel: RiskLevel.MEDIUM },
          { name: 'Fourier Group Europe', referenceId: 'CRP-00301', entityType: 'Private Company', jurisdiction: 'United Kingdom', baseScore: 45, pepMultiplier: 1.05, isPep: true, geographicScore: 10, finalCompositeScore: 57.3, riskLevel: RiskLevel.MEDIUM },
          { name: 'Bridgemont Asset Management', referenceId: 'CRP-00334', entityType: 'Juristic Entity', jurisdiction: 'South Africa', baseScore: 55, pepMultiplier: 1.10, isPep: true, geographicScore: 9, finalCompositeScore: 69.5, riskLevel: RiskLevel.MEDIUM },
          { name: 'Horizon Property Holdings', referenceId: 'CRP-00412', entityType: 'Proprietary Ltd', jurisdiction: 'South Africa', baseScore: 48, pepMultiplier: 1.00, isPep: false, geographicScore: 6, finalCompositeScore: 54, riskLevel: RiskLevel.MEDIUM },
        ],
      },
      {
        level: RiskLevel.LOW,
        averageScore: 27.0,
        pepElevatedCount: 0,
        profiles: [
          { name: 'Blue Ridge Consulting (Pty) Ltd', referenceId: 'CRP-00101', entityType: 'Private Company', jurisdiction: 'South Africa', baseScore: 22, pepMultiplier: 1.00, isPep: false, geographicScore: 4, finalCompositeScore: 26, riskLevel: RiskLevel.LOW },
          { name: 'Fourier Group Asia Pacific', referenceId: 'CRP-00158', entityType: 'Private Company', jurisdiction: 'Singapore', baseScore: 28, pepMultiplier: 1.00, isPep: false, geographicScore: 5, finalCompositeScore: 33, riskLevel: RiskLevel.LOW },
          { name: 'Clearwater Legal Associates', referenceId: 'CRP-00203', entityType: 'Professional Partnership', jurisdiction: 'South Africa', baseScore: 18, pepMultiplier: 1.00, isPep: false, geographicScore: 3, finalCompositeScore: 21, riskLevel: RiskLevel.LOW },
          { name: 'Southern Cross Logistics Ltd', referenceId: 'CRP-00247', entityType: 'Private Company', jurisdiction: 'South Africa', baseScore: 24, pepMultiplier: 1.00, isPep: false, geographicScore: 4, finalCompositeScore: 28, riskLevel: RiskLevel.LOW },
        ],
      },
    ],
  };

  strataColor(level: RiskLevel): string {
    return { [RiskLevel.HIGH]: '#ef4444', [RiskLevel.MEDIUM]: '#f59e0b', [RiskLevel.LOW]: '#10b981' }[level];
  }

  strataLabel(level: RiskLevel): string {
    return { [RiskLevel.HIGH]: 'HIGH RISK', [RiskLevel.MEDIUM]: 'MEDIUM RISK', [RiskLevel.LOW]: 'LOW RISK' }[level];
  }

  strataRange(level: RiskLevel): string {
    return { [RiskLevel.HIGH]: 'Score > 75', [RiskLevel.MEDIUM]: 'Score 36-75', [RiskLevel.LOW]: 'Score ≤ 35' }[level];
  }

  strataIcon(level: RiskLevel): string {
    return { [RiskLevel.HIGH]: 'triangle', [RiskLevel.MEDIUM]: 'trend', [RiskLevel.LOW]: 'check' }[level];
  }

  scoreBarWidth(score: number, max = 150): string {
    return `${Math.min((score / max) * 100, 100)}%`;
  }

  get highCount(): number { return this.data.strata.find(s => s.level === RiskLevel.HIGH)?.profiles.length ?? 0; }
  get mediumCount(): number { return this.data.strata.find(s => s.level === RiskLevel.MEDIUM)?.profiles.length ?? 0; }
  get lowCount(): number { return this.data.strata.find(s => s.level === RiskLevel.LOW)?.profiles.length ?? 0; }
}