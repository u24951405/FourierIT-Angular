import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ComplianceReportData, ComplianceTransition } from '../../reports.models';

@Component({
  selector: 'app-compliance-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-report.html',
  styleUrls: ['./compliance-report.scss'],
})
export class ComplianceReportComponent {
  private router = inject(Router);

  data: ComplianceReportData = {
    reportId: 'DV-CMP-4163721330',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    launchDate: '15 Jan 2023',
    presentDate: '02 Jul 2026',
    compliantDays: 1252,
    totalDays: 1264,
    nonCompliantDays: 12,
    incidentCount: 8,
    uptimePercentage: 99.05,
    transitions: [
      { transitionDate: '15 Jan 2023', previousState: 'Non-Compliant', newState: 'Compliant', triggeringEvent: 'DocuVault platform launch — full document ingestion cycle completed', downtime: null },
      { transitionDate: '10 Mar 2023', previousState: 'Compliant', newState: 'Non-Compliant', triggeringEvent: 'FICA documentation gap — 3 natural person files missing proof of residential address', downtime: null },
      { transitionDate: '12 Mar 2023', previousState: 'Non-Compliant', newState: 'Compliant', triggeringEvent: 'Remediation complete — outstanding proof of address documents uploaded and verified', downtime: '2 days' },
      { transitionDate: '22 Jul 2023', previousState: 'Compliant', newState: 'Non-Compliant', triggeringEvent: 'KYC verification failure — director ID expiry not detected by legacy monitoring', downtime: null },
      { transitionDate: '23 Jul 2023', previousState: 'Non-Compliant', newState: 'Compliant', triggeringEvent: 'Updated director ID documents received and verified by compliance officer', downtime: '1 day' },
      { transitionDate: '05 Jan 2024', previousState: 'Compliant', newState: 'Non-Compliant', triggeringEvent: 'System migration gap — document verification queue paused during infrastructure upgrade', downtime: null },
      { transitionDate: '08 Jan 2024', previousState: 'Non-Compliant', newState: 'Compliant', triggeringEvent: 'Infrastructure migration finalised — verification queue resumed and backlog cleared', downtime: '3 days' },
    ],
  };

  // Timeline segments for visual uptime bar
  get timelineSegments(): { isCompliant: boolean; widthPct: number }[] {
    return [
      { isCompliant: true, widthPct: 15 },
      { isCompliant: false, widthPct: 1 },
      { isCompliant: true, widthPct: 25 },
      { isCompliant: false, widthPct: 1 },
      { isCompliant: true, widthPct: 20 },
      { isCompliant: false, widthPct: 1 },
      { isCompliant: true, widthPct: 15 },
      { isCompliant: false, widthPct: 1 },
      { isCompliant: true, widthPct: 21 },
    ];
  }

  viewCertificate(): void {
    this.router.navigate(['/reports/compliance-certificate']);
  }

  downloadReport(): void {
    window.print();
  }
}