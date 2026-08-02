import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentService, ApiDepartmentDto } from '../../../core/services/department.service';
import { InstitutionService, InstitutionDto } from '../../../core/services/institution.service';
import {
  ReportsService,
  ReportFilters,
  SortDirection,
  DocumentOwnerComplianceReportRow,
  InstitutionDocumentRequestReportRow,
  DepartmentComplianceReportRow,
  InstitutionRequestControlBreakGroup,
  DepartmentComplianceControlBreakGroup,
  DepartmentDocumentInventoryReportRow,
  InstitutionAccessHistoryReportRow,
  ExpiringDocumentsReportRow,
  OutstandingComplianceReportRow,
} from '../../../core/services/reports.service';

@Component({
  selector: 'app-super-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-reports.component.html',
  styleUrl: './super-admin-reports.component.scss',
})
export class SuperAdminReportsComponent {
  private reportsService = inject(ReportsService);
  private institutionService = inject(InstitutionService);
  private departmentService = inject(DepartmentService);
  private authService = inject(AuthService);

  activeTab: 'owner' | 'requests' | 'department' | 'cb-institution' | 'cb-department' | 'inventory' | 'access' | 'expiring' | 'outstanding' = 'owner';
  loading = false;
  error: string | null = null;

  institutions: InstitutionDto[] = [];
  departments: ApiDepartmentDto[] = [];

  filters: ReportFilters = {
    startDate: '',
    endDate: '',
    institutionId: null,
    departmentId: null,
    complianceStatus: '',
    requestStatus: '',
    recipientType: '',
  };

  ownerSortBy = 'documentOwner';
  ownerSortDirection: SortDirection = 'asc';

  requestSortBy = 'requestDate';
  requestSortDirection: SortDirection = 'desc';

  departmentSortBy = 'department';
  departmentSortDirection: SortDirection = 'asc';

  ownerRows: DocumentOwnerComplianceReportRow[] = [];
  requestRows: InstitutionDocumentRequestReportRow[] = [];
  departmentRows: DepartmentComplianceReportRow[] = [];
  controlBreakInstitutionRows: InstitutionRequestControlBreakGroup[] = [];
  controlBreakDepartmentRows: DepartmentComplianceControlBreakGroup[] = [];
  departmentInventoryRows: DepartmentDocumentInventoryReportRow[] = [];
  accessHistoryRows: InstitutionAccessHistoryReportRow[] = [];
  expiringDocumentsRows: ExpiringDocumentsReportRow[] = [];
  outstandingComplianceRows: OutstandingComplianceReportRow[] = [];

  readonly reportCards = [
    {
      id: 'owner' as const,
      icon: '📊',
      title: 'Document Owner Compliance',
      description: 'Tracks every document owner against required uploads, missing records and current compliance posture.',
    },
    {
      id: 'requests' as const,
      icon: '📥',
      title: 'Institution Document Requests',
      description: 'Shows all institution request activity, deadlines, recipients and status progress for follow-up.',
    },
    {
      id: 'department' as const,
      icon: '🏢',
      title: 'Department Compliance',
      description: 'Summarises department-wide document coverage, compliance percentage and risk rating at a glance.',
    },
    {
      id: 'cb-institution' as const,
      icon: '🏛️',
      title: 'Requests by Institution',
      description: 'Breaks request volume down by institution with grouped totals and drill-down request detail.',
    },
    {
      id: 'cb-department' as const,
      icon: '🧭',
      title: 'Compliance by Department',
      description: 'Provides a department control-break view with owner-level compliance detail and supporting totals.',
    },
    {
      id: 'inventory' as const,
      icon: '📦',
      title: 'Department Document Inventory',
      description: 'Lists each department’s required KYC/FICA documents with upload state and compliance posture.',
    },
    {
      id: 'access' as const,
      icon: '🔐',
      title: 'Institution Access History',
      description: 'Surface institution access approvals, expiry, and the documents that were accessed for each request.',
    },
    {
      id: 'expiring' as const,
      icon: '⏳',
      title: 'Expiring Documents',
      description: 'Shows near-expiry documents by owner and department with the remaining days to expiry.',
    },
    {
      id: 'outstanding' as const,
      icon: '⚠️',
      title: 'Outstanding Compliance',
      description: 'Highlights current non-compliance by document owner and department with missing requirements.',
    },
  ];

  private logoDataUrl: string | null = null;

  constructor() {
    this.loadLookups();
    this.refreshReports();
  }

  loadLookups(): void {
    forkJoin({
      institutions: this.institutionService.getAll(),
      departments: this.departmentService.getAll(),
    }).subscribe({
      next: ({ institutions, departments }) => {
        this.institutions = institutions;
        this.departments = departments;
      },
      error: () => {
        this.institutions = [];
        this.departments = [];
      },
    });
  }

  refreshReports(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = null;

    const normalized = this.normalizedFilters();

    forkJoin({
      owner: this.reportsService.getDocumentOwnerComplianceReport(normalized, this.ownerSortBy, this.ownerSortDirection),
      requests: this.reportsService.getInstitutionDocumentRequestReport(normalized, this.requestSortBy, this.requestSortDirection),
      department: this.reportsService.getDepartmentComplianceReport(normalized, this.departmentSortBy, this.departmentSortDirection),
      cbInstitution: this.reportsService.getDocumentRequestsByInstitutionControlBreak(normalized),
      cbDepartment: this.reportsService.getComplianceByDepartmentControlBreak(normalized),
      inventory: this.reportsService.getDepartmentDocumentInventoryReport(normalized),
      access: this.reportsService.getInstitutionAccessHistoryReport(normalized),
      expiring: this.reportsService.getExpiringDocumentsReport(normalized),
      outstanding: this.reportsService.getOutstandingComplianceReport(normalized),
    }).subscribe({
      next: (res) => {
        this.ownerRows = res.owner;
        this.requestRows = res.requests;
        this.departmentRows = res.department;
        this.controlBreakInstitutionRows = res.cbInstitution;
        this.controlBreakDepartmentRows = res.cbDepartment;
        this.departmentInventoryRows = res.inventory;
        this.accessHistoryRows = res.access;
        this.expiringDocumentsRows = res.expiring;
        this.outstandingComplianceRows = res.outstanding;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.error ?? err?.error?.message ?? 'The report could not be loaded right now. Please try again in a moment.';
        this.error = typeof msg === 'string' ? msg : 'The report could not be loaded right now. Please try again in a moment.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  clearFilters(): void {
    this.filters = {
      startDate: '',
      endDate: '',
      institutionId: null,
      departmentId: null,
      complianceStatus: '',
      requestStatus: '',
      recipientType: '',
    };
    this.refreshReports();
  }

  setTab(tab: 'owner' | 'requests' | 'department' | 'cb-institution' | 'cb-department' | 'inventory' | 'access' | 'expiring' | 'outstanding'): void {
    this.activeTab = tab;
  }

  isFilterVisible(key: 'startDate' | 'endDate' | 'institutionId' | 'departmentId' | 'complianceStatus' | 'requestStatus' | 'recipientType'): boolean {
    switch (this.activeTab) {
      case 'owner':
        return ['startDate', 'endDate', 'institutionId', 'departmentId', 'complianceStatus'].includes(key);
      case 'requests':
      case 'cb-institution':
        return ['startDate', 'endDate', 'institutionId', 'departmentId', 'requestStatus', 'recipientType'].includes(key);
      case 'department':
      case 'cb-department':
      case 'inventory':
      case 'outstanding':
        return ['startDate', 'endDate', 'institutionId', 'departmentId', 'complianceStatus'].includes(key);
      case 'access':
        return ['startDate', 'endDate', 'institutionId', 'departmentId', 'recipientType'].includes(key);
      case 'expiring':
        return ['startDate', 'endDate', 'institutionId', 'departmentId'].includes(key);
      default:
        return true;
    }
  }

  statusBadgeClass(value: string): string {
    const normalized = (value || '').trim().toLowerCase().replace(/\s+/g, '-');

    if (normalized.includes('compliant')) return 'is-compliant';
    if (normalized.includes('partial')) return 'is-partial';
    if (normalized.includes('non-compliant') || normalized.includes('noncompliant')) return 'is-noncompliant';
    if (normalized.includes('pending') || normalized.includes('department_pending')) return 'is-pending';
    if (normalized.includes('approved') || normalized.includes('routed_to_owner')) return 'is-approved';
    if (normalized.includes('denied')) return 'is-denied';

    return 'is-neutral';
  }

  ownerTotals(): { uploaded: number; missing: number } {
    return {
      uploaded: this.ownerRows.reduce((sum, row) => sum + row.uploadedDocuments, 0),
      missing: this.ownerRows.reduce((sum, row) => sum + row.missingDocuments, 0),
    };
  }

  controlBreakInstitutionTotals(): { total: number; approved: number; pending: number; denied: number } {
    return {
      total: this.controlBreakInstitutionRows.reduce((sum, group) => sum + group.totalRequests, 0),
      approved: this.controlBreakInstitutionRows.reduce((sum, group) => sum + group.approved, 0),
      pending: this.controlBreakInstitutionRows.reduce((sum, group) => sum + group.pending, 0),
      denied: this.controlBreakInstitutionRows.reduce((sum, group) => sum + group.denied, 0),
    };
  }

  controlBreakDepartmentTotals(): { required: number; uploaded: number; missing: number } {
    return {
      required: this.controlBreakDepartmentRows.reduce((sum, group) => sum + group.requiredDocuments, 0),
      uploaded: this.controlBreakDepartmentRows.reduce((sum, group) => sum + group.uploadedDocuments, 0),
      missing: this.controlBreakDepartmentRows.reduce((sum, group) => sum + group.missingDocuments, 0),
    };
  }

  requestTotals(): { total: number; approved: number; pending: number; denied: number } {
    return {
      total: this.requestRows.length,
      approved: this.requestRows.filter(r => this.statusBucket(r.status) === 'approved').length,
      pending: this.requestRows.filter(r => this.statusBucket(r.status) === 'pending').length,
      denied: this.requestRows.filter(r => this.statusBucket(r.status) === 'denied').length,
    };
  }

  departmentTotals(): { required: number; uploaded: number; missing: number; avgCompliance: number } {
    const required = this.departmentRows.reduce((sum, row) => sum + row.requiredDocuments, 0);
    const uploaded = this.departmentRows.reduce((sum, row) => sum + row.uploadedDocuments, 0);
    const missing = this.departmentRows.reduce((sum, row) => sum + row.missingDocuments, 0);
    const avgCompliance = this.departmentRows.length
      ? this.departmentRows.reduce((sum, row) => sum + row.compliancePercentage, 0) / this.departmentRows.length
      : 0;

    return { required, uploaded, missing, avgCompliance };
  }

  departmentInventoryTotals(): { required: number; uploaded: number; missing: number; avgCompliance: number } {
    const required = this.departmentInventoryRows.reduce((sum, row) => sum + row.requiredDocuments, 0);
    const uploaded = this.departmentInventoryRows.reduce((sum, row) => sum + row.uploadedDocuments, 0);
    const missing = this.departmentInventoryRows.reduce((sum, row) => sum + row.missingDocuments, 0);
    const avgCompliance = this.departmentInventoryRows.length
      ? this.departmentInventoryRows.reduce((sum, row) => sum + row.compliancePercentage, 0) / this.departmentInventoryRows.length
      : 0;

    return { required, uploaded, missing, avgCompliance };
  }

  accessHistoryTotals(): { total: number; active: number; expired: number } {
    return {
      total: this.accessHistoryRows.length,
      active: this.accessHistoryRows.filter(r => this.accessStatusBucket(r.accessStatus) === 'active').length,
      expired: this.accessHistoryRows.filter(r => this.accessStatusBucket(r.accessStatus) === 'expired').length,
    };
  }

  expiringDocumentsTotals(): { total: number; severe: number } {
    return {
      total: this.expiringDocumentsRows.length,
      severe: this.expiringDocumentsRows.filter(r => r.daysRemaining <= 7).length,
    };
  }

  outstandingComplianceTotals(): { total: number; missing: number } {
    return {
      total: this.outstandingComplianceRows.length,
      missing: this.outstandingComplianceRows.reduce((sum, row) => sum + row.missingDocuments, 0),
    };
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-ZA');
  }

  formatDateTime(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-ZA');
  }

  async exportOwnerCompliancePdf(): Promise<void> {
    const totals = this.ownerTotals();
    await this.exportTablePdf({
      fileName: 'document-owner-compliance-report.pdf',
      title: 'Document Owner Compliance Report',
      columns: ['Document Owner', 'Entity Type', 'Email', 'Compliance Status', 'Uploaded', 'Missing', 'Compliance %', 'Last Upload Date', 'Risk Rating'],
      body: this.ownerRows.map(r => [
        r.documentOwner,
        r.entityType || '-',
        r.email,
        r.complianceStatus,
        String(r.uploadedDocuments),
        String(r.missingDocuments),
        `${r.compliancePercentage.toFixed(2)}%`,
        this.formatDate(r.lastUploadDate),
        r.riskRating,
      ]),
      totals: [
        ['Total Uploaded Documents', String(totals.uploaded)],
        ['Total Missing Documents', String(totals.missing)],
      ],
    });
  }

  async exportInstitutionRequestsPdf(): Promise<void> {
    const totals = this.requestTotals();
    await this.exportTablePdf({
      fileName: 'institution-document-request-report.pdf',
      title: 'Institution Document Request Report',
      columns: ['Institution', 'Recipient', 'Recipient Type', 'Request Date', 'Submission Deadline', 'Reference Number', 'Request Justification', 'Status', 'Approval / Denial Date', 'Requested Documents'],
      body: this.requestRows.map(r => [
        r.institution,
        r.recipient,
        r.recipientType,
        this.formatDateTime(r.requestDate),
        this.formatDateTime(r.submissionDeadline),
        r.referenceNumber || '-',
        r.requestJustification || '-',
        r.status,
        this.formatDateTime(r.approvalDenialDate),
        r.requestedDocuments.join(', '),
      ]),
      totals: [
        ['Total Requests', String(totals.total)],
        ['Approved', String(totals.approved)],
        ['Pending', String(totals.pending)],
        ['Denied', String(totals.denied)],
      ],
    });
  }

  async exportDepartmentCompliancePdf(): Promise<void> {
    const totals = this.departmentTotals();
    await this.exportTablePdf({
      fileName: 'department-compliance-report.pdf',
      title: 'Department Compliance Report',
      columns: ['Department', 'Department Admin', 'Required Documents', 'Uploaded Documents', 'Missing Documents', 'Compliance %', 'Risk Rating'],
      body: this.departmentRows.map(r => [
        r.department,
        r.departmentAdmin,
        String(r.requiredDocuments),
        String(r.uploadedDocuments),
        String(r.missingDocuments),
        `${r.compliancePercentage.toFixed(2)}%`,
        r.riskRating,
      ]),
      totals: [
        ['Total Required Documents', String(totals.required)],
        ['Total Uploaded Documents', String(totals.uploaded)],
        ['Total Missing Documents', String(totals.missing)],
        ['Average Compliance Percentage', `${totals.avgCompliance.toFixed(2)}%`],
      ],
    });
  }

  async exportControlBreakInstitutionPdf(): Promise<void> {
    const body: string[][] = [];
    const totals = this.controlBreakInstitutionTotals();

    for (const group of this.controlBreakInstitutionRows) {
      body.push([
        `Institution: ${group.institution}`,
        `Requests: ${group.totalRequests}`,
        `Approved: ${group.approved}`,
        `Pending: ${group.pending}`,
        `Denied: ${group.denied}`,
      ]);
      for (const request of group.requests) {
        body.push([
          '',
          request.recipient,
          request.recipientType,
          this.formatDateTime(request.requestDate),
          `${request.status} (${request.referenceNumber || '-'})`,
        ]);
      }
    }

    await this.exportTablePdf({
      fileName: 'control-break-document-requests-by-institution.pdf',
      title: 'Control Break - Document Requests by Institution',
      columns: ['Institution / Group', 'Recipient', 'Recipient Type', 'Request Date', 'Status / Ref'],
      body,
      totals: [
        ['Institutions', String(this.controlBreakInstitutionRows.length)],
        ['Total Requests', String(totals.total)],
        ['Approved', String(totals.approved)],
        ['Pending', String(totals.pending)],
        ['Denied', String(totals.denied)],
      ],
    });
  }

  async exportControlBreakDepartmentPdf(): Promise<void> {
    const body: string[][] = [];
    const totals = this.controlBreakDepartmentTotals();

    for (const group of this.controlBreakDepartmentRows) {
      body.push([
        `Department: ${group.department} (${group.departmentAdmin}) - ${group.institution}`,
        `Required: ${group.requiredDocuments}`,
        `Uploaded: ${group.uploadedDocuments}`,
        `Missing: ${group.missingDocuments}`,
        `Compliance: ${group.compliancePercentage.toFixed(2)}%`,
      ]);
      for (const detail of group.details) {
        body.push([
          '',
          detail.documentOwner,
          detail.complianceStatus,
          `Uploaded ${detail.uploadedDocuments} / Missing ${detail.missingDocuments}`,
          `${detail.compliancePercentage.toFixed(2)}% (${detail.riskRating})`,
        ]);
      }
    }

    await this.exportTablePdf({
      fileName: 'control-break-compliance-by-department.pdf',
      title: 'Control Break - Compliance by Department',
      columns: ['Department / Group', 'Owner', 'Compliance Status', 'Documents', 'Compliance % / Risk'],
      body,
      totals: [
        ['Departments', String(this.controlBreakDepartmentRows.length)],
        ['Required Documents', String(totals.required)],
        ['Uploaded Documents', String(totals.uploaded)],
        ['Missing Documents', String(totals.missing)],
      ],
    });
  }

  async exportDepartmentInventoryPdf(): Promise<void> {
    const totals = this.departmentInventoryTotals();
    await this.exportTablePdf({
      fileName: 'department-document-inventory-report.pdf',
      title: 'Department Document Inventory Report',
      columns: ['Department', 'Department Admin', 'Institution', 'Required Document', 'Uploaded', 'Upload Date', 'Compliance %', 'Risk Rating'],
      body: this.departmentInventoryRows.map(r => [
        r.department,
        r.departmentAdmin,
        r.institution,
        r.requiredDocument,
        r.isUploaded ? 'Yes' : 'No',
        this.formatDate(r.uploadDate),
        `${r.compliancePercentage.toFixed(2)}%`,
        r.riskRating,
      ]),
      totals: [
        ['Total Required Documents', String(totals.required)],
        ['Total Uploaded Documents', String(totals.uploaded)],
        ['Total Missing Documents', String(totals.missing)],
        ['Average Compliance Percentage', `${totals.avgCompliance.toFixed(2)}%`],
      ],
    });
  }

  async exportAccessHistoryPdf(): Promise<void> {
    const totals = this.accessHistoryTotals();
    await this.exportTablePdf({
      fileName: 'institution-access-history-report.pdf',
      title: 'Institution Access History Report',
      columns: ['Institution', 'Recipient', 'Recipient Type', 'Access Granted Date', 'Access Expiry', 'Access Status', 'Documents Accessed'],
      body: this.accessHistoryRows.map(r => [
        r.institution,
        r.recipient,
        r.recipientType,
        this.formatDateTime(r.accessGrantedDate),
        this.formatDateTime(r.accessExpiry),
        r.accessStatus,
        r.documentsAccessed.join(', '),
      ]),
      totals: [
        ['Total Access Entries', String(totals.total)],
        ['Active', String(totals.active)],
        ['Expired', String(totals.expired)],
      ],
    });
  }

  async exportExpiringDocumentsPdf(): Promise<void> {
    const totals = this.expiringDocumentsTotals();
    await this.exportTablePdf({
      fileName: 'expiring-documents-report.pdf',
      title: 'Expiring Documents Report',
      columns: ['Owner', 'Department', 'Document Type', 'Expiry Date', 'Days Remaining'],
      body: this.expiringDocumentsRows.map(r => [
        r.owner,
        r.department,
        r.documentType,
        this.formatDateTime(r.expiryDate),
        String(r.daysRemaining),
      ]),
      totals: [
        ['Total Near-Expiry Documents', String(totals.total)],
        ['7 Days or Less', String(totals.severe)],
      ],
    });
  }

  async exportOutstandingCompliancePdf(): Promise<void> {
    const totals = this.outstandingComplianceTotals();
    await this.exportTablePdf({
      fileName: 'outstanding-compliance-report.pdf',
      title: 'Outstanding Compliance Report',
      columns: ['Entity Type', 'Name', 'Department', 'Institution', 'Missing Documents', 'Compliance %', 'Risk Rating', 'Outstanding Requirements'],
      body: this.outstandingComplianceRows.map(r => [
        r.entityType,
        r.name,
        r.department,
        r.institution,
        String(r.missingDocuments),
        `${r.compliancePercentage.toFixed(2)}%`,
        r.riskRating,
        r.outstandingRequirements.join(', '),
      ]),
      totals: [
        ['Total Outstanding Records', String(totals.total)],
        ['Missing Documents', String(totals.missing)],
      ],
    });
  }

  private normalizedFilters(): ReportFilters {
    return {
      startDate: this.filters.startDate?.trim() || undefined,
      endDate: this.filters.endDate?.trim() || undefined,
      institutionId: this.filters.institutionId || undefined,
      departmentId: this.filters.departmentId || undefined,
      complianceStatus: this.filters.complianceStatus?.trim() || undefined,
      requestStatus: this.filters.requestStatus?.trim() || undefined,
      recipientType: this.filters.recipientType?.trim() || undefined,
    };
  }

  private statusBucket(status: string): 'approved' | 'pending' | 'denied' | 'other' {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'routed_to_owner') return 'approved';
    if (normalized === 'pending' || normalized === 'department_pending') return 'pending';
    if (normalized === 'denied') return 'denied';
    return 'other';
  }

  private accessStatusBucket(status: string): 'active' | 'expired' | 'other' {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'routed_to_owner' || normalized === 'active') return 'active';
    if (normalized === 'denied' || normalized === 'expired') return 'expired';
    return 'other';
  }

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown User';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown User';
  }

  private async exportTablePdf(input: {
    fileName: string;
    title: string;
    columns: string[];
    body: string[][];
    totals: Array<[string, string]>;
  }): Promise<void> {
    const { default: JsPdf } = await import('jspdf');

    const doc = new JsPdf({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const filters = this.normalizedFilters();
    const generatedAt = new Date().toLocaleString('en-ZA');
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentX = 40;
    const contentWidth = pageWidth - (contentX * 2);

    await this.ensureLogoDataUrl();

    doc.setFillColor(246, 249, 252);
    doc.rect(0, 0, pageWidth, 92, 'F');
    doc.setDrawColor(214, 223, 238);
    doc.line(contentX, 90, pageWidth - contentX, 90);

    if (this.logoDataUrl) {
      doc.addImage(this.logoDataUrl, 'PNG', contentX, 18, 52, 52);
    }

    doc.setTextColor(27, 53, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('DocuVault', contentX + 64, 37);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Verification and Compliance Platform', contentX + 64, 54);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(contentX, 104, contentWidth, 46, 8, 8, 'F');
    doc.setDrawColor(214, 223, 238);
    doc.roundedRect(contentX, 104, contentWidth, 46, 8, 8, 'S');

    doc.setTextColor(56, 72, 103);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(input.title, contentX + 12, 124);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated by: ${this.generatedBy()}`, contentX + 12, 138);
    doc.text(`Generated at: ${generatedAt}`, contentX + 12, 150);
    doc.text(`Applied filters: ${this.filterSummary(filters)}`, contentX + 12, 162);

    const tableY = 174;
    let nextY = this.drawSimpleTable(doc, {
      startX: contentX,
      startY: tableY,
      headers: input.columns,
      rows: input.body,
      width: contentWidth,
      headerFillColor: [24, 53, 99],
      fontSize: 8,
      rowHeight: 18,
    });

    nextY += 14;
    doc.setFillColor(237, 245, 252);
    doc.roundedRect(contentX, nextY - 8, Math.min(420, contentWidth * 0.55), 24 + (input.totals.length * 18), 6, 6, 'F');
    this.drawSimpleTable(doc, {
      startX: contentX,
      startY: nextY,
      headers: ['Totals', 'Value'],
      rows: input.totals,
      width: Math.min(420, contentWidth * 0.55),
      headerFillColor: [16, 128, 97],
      fontSize: 9,
      rowHeight: 20,
    });

    doc.setDrawColor(214, 223, 238);
    doc.line(contentX, pageWidth - 34, pageWidth - contentX, pageWidth - 34);
    doc.setTextColor(111, 124, 146);
    doc.setFontSize(8);
    doc.text('Prepared for Super Admin review', contentX, pageWidth - 20);

    doc.save(input.fileName);
  }

  private drawSimpleTable(
    doc: any,
    options: {
      startX: number;
      startY: number;
      headers: string[];
      rows: Array<string[] | [string, string]>;
      width: number;
      headerFillColor: [number, number, number];
      fontSize: number;
      rowHeight: number;
    }
  ): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 58;
    const colCount = options.headers.length;
    const colWidth = options.width / colCount;
    let y = options.startY;

    const drawHeader = () => {
      doc.setFillColor(...options.headerFillColor);
      doc.rect(options.startX, y, options.width, options.rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(options.fontSize);
      doc.setFont('helvetica', 'bold');

      for (let i = 0; i < colCount; i += 1) {
        const x = options.startX + i * colWidth;
        doc.text(this.truncateForCell(doc, options.headers[i], colWidth - 8), x + 4, y + options.rowHeight - 6);
      }

      y += options.rowHeight;
    };

    drawHeader();

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 50, 87);

    for (const [rowIndex, row] of options.rows.entries()) {
      const wrappedCells = row.map((value) => {
        const text = String(value ?? '');
        const maxWidth = colWidth - 8;
        return doc.splitTextToSize(text, maxWidth);
      });

      const maxLines = Math.max(1, ...wrappedCells.map(lines => lines.length));
      const rowHeight = Math.max(options.rowHeight, maxLines * 10 + 6);

      if (y + rowHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 40;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 50, 87);
      }

      doc.setDrawColor(215, 224, 238);
      doc.setFillColor(rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 251, rowIndex % 2 === 0 ? 255 : 254);
      doc.rect(options.startX, y, options.width, rowHeight, 'FD');

      for (let i = 0; i < colCount; i += 1) {
        const x = options.startX + i * colWidth;
        const lines = wrappedCells[i];
        const textY = y + 10;
        doc.text(lines, x + 4, textY);
        if (i > 0) {
          doc.line(x, y, x, y + rowHeight);
        }
      }

      y += rowHeight;
    }

    return y;
  }

  private truncateForCell(doc: any, value: string, maxWidth: number): string {
    if (!value) return '';
    const ellipsis = '...';
    if (doc.getTextWidth(value) <= maxWidth) return value;

    let current = value;
    while (current.length > 0 && doc.getTextWidth(`${current}${ellipsis}`) > maxWidth) {
      current = current.slice(0, -1);
    }

    return `${current}${ellipsis}`;
  }

  private filterSummary(filters: ReportFilters): string {
    const parts: string[] = [];

    if (filters.startDate) parts.push(`Start Date: ${filters.startDate}`);
    if (filters.endDate) parts.push(`End Date: ${filters.endDate}`);

    if (filters.institutionId) {
      const institution = this.institutions.find(i => i.institutionId === filters.institutionId);
      parts.push(`Institution: ${institution?.institutionName ?? filters.institutionId}`);
    }

    if (filters.departmentId) {
      const department = this.departments.find(d => d.departmentId === filters.departmentId);
      parts.push(`Department: ${department?.departmentName ?? filters.departmentId}`);
    }

    if (filters.complianceStatus) parts.push(`Compliance Status: ${filters.complianceStatus}`);
    if (filters.requestStatus) parts.push(`Request Status: ${filters.requestStatus}`);
    if (filters.recipientType) parts.push(`Recipient Type: ${filters.recipientType}`);

    return parts.length ? parts.join(' | ') : 'None';
  }

  private async ensureLogoDataUrl(): Promise<void> {
    if (this.logoDataUrl) return;

    try {
      const response = await fetch('/Logo.png');
      const blob = await response.blob();
      this.logoDataUrl = await this.readBlobAsDataUrl(blob);
    } catch {
      this.logoDataUrl = null;
    }
  }

  private readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
