import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportFrameComponent, ReportFrameConfig } from '../../shared/report-frame/report-frame';
import { SystemAuditReportData, InstitutionAuditBlock, AuditLogRow } from '../../reports.models';

@Component({
  selector: 'app-system-audit-report',
  standalone: true,
  imports: [CommonModule, ReportFrameComponent],
  templateUrl: './system-audit-report.html',
  styleUrls: ['./system-audit-report.scss'],
})
export class SystemAuditReportComponent {
  frameConfig: ReportFrameConfig = {
    reportId: 'DV-SAR-4164163896',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    reportType: 'External Enquiry & Token Lifecycle',
    framework: 'FICA · POPIA · DocuVault v35',
    badgeLabel: 'AUDIT TRAIL',
    badgeIcon: 'lock',
    accentColors: ['#1e2a3a', '#4b5a6e', '#7bafd4'],
  };

  data: SystemAuditReportData = {
    reportId: 'DV-SAR-4164163896',
    dateGenerated: new Date().toISOString(),
    createdBy: 'Admin User',
    totalLogs: 8,
    totalSessions: 2,
    totalAnomalies: 2,
    cleanInteractions: 6,
    institutions: [
      {
        institutionName: 'SARS',
        tokenWindow: '48 hours',
        windowStatus: 'Expired',
        enquiryReason: 'Statutory tax compliance verification — annual FICA obligation under s25(B) of the Income Tax Act',
        tokenId: '#E7A55B934F7E3E55D3EA2368',
        totalInteractions: 4,
        anomalies: 1,
        logs: [
          { sessionId: 'SARS-SYS-SESSION-4471', sessionRole: 'Automated Revenue Verification Engine', targetDocument: 'SARS Income Tax Registration Confirmation', actionExecuted: 'Document View', timestamp: '2026-05-14 08:32:17 SAST', securityStatus: 'Clean' },
          { sessionId: 'SARS-SYS-SESSION-4471', sessionRole: 'Automated Revenue Verification Engine', targetDocument: 'SARS VAT Registration Certificate', actionExecuted: 'Document View', timestamp: '2026-05-14 08:33:05 SAST', securityStatus: 'Clean' },
          { sessionId: 'SARS-USR-SESSION-8812', sessionRole: 'Senior Compliance Auditor', targetDocument: 'Tax Clearance Certificate — 2025', actionExecuted: 'Document Download (Watermarked)', timestamp: '2026-05-14 09:11:44 SAST', securityStatus: 'Clean' },
          { sessionId: 'SARS-USR-SESSION-8812', sessionRole: 'Senior Compliance Auditor', targetDocument: 'Shareholder Register v3', actionExecuted: 'Access Attempt — Permission Denied', timestamp: '2026-05-14 09:17:22 SAST', securityStatus: 'Anomaly Detected' },
        ],
      },
      {
        institutionName: 'FNB',
        tokenWindow: '12 hours',
        windowStatus: 'Expired',
        enquiryReason: 'Commercial facility renewal — credit risk and FICA document refresh for existing facilities',
        tokenId: '#9CD845088E331CDF02F8F12E',
        totalInteractions: 4,
        anomalies: 1,
        logs: [
          { sessionId: 'FNB-RM-SESSION-2209', sessionRole: 'Relationship Manager', targetDocument: 'CIPC Registration Certificate', actionExecuted: 'Document View', timestamp: '2026-06-02 11:04:38 SAST', securityStatus: 'Clean' },
          { sessionId: 'FNB-RM-SESSION-2209', sessionRole: 'Relationship Manager', targetDocument: 'Memorandum of Incorporation (CoR14.1)', actionExecuted: 'Document Download', timestamp: '2026-06-02 11:06:12 SAST', securityStatus: 'Clean' },
          { sessionId: 'FNB-CRED-SESSION-5530', sessionRole: 'Credit Risk Analyst', targetDocument: 'Bank Statement — FG HQ (Q1 2026)', actionExecuted: 'Document View', timestamp: '2026-06-02 13:22:57 SAST', securityStatus: 'Clean' },
          { sessionId: 'FNB-CRED-SESSION-5530', sessionRole: 'Credit Risk Analyst', targetDocument: 'Beneficial Ownership Declaration', actionExecuted: 'Token Expiry — Access Revoked Mid-Session', timestamp: '2026-06-02 21:05:11 SAST', securityStatus: 'Expired Token' },
        ],
      },
    ],
  };

  statusClass(status: string): string {
    if (status === 'Clean') return 'audit-status--clean';
    if (status === 'Anomaly Detected') return 'audit-status--anomaly';
    if (status === 'Expired Token') return 'audit-status--expired';
    return '';
  }
}