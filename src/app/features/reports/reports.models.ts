export enum ReportType {
  AD_HOC = 'AD_HOC',
  MONTHLY = 'MONTHLY',
  COMPLIANCE = 'COMPLIANCE',
  ACTIVITY = 'ACTIVITY',
  SYSTEM_AUDIT = 'SYSTEM_AUDIT',
  CLIENT_RISK_RATING = 'CLIENT_RISK_RATING',
}

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export enum ReportFocus {
  DOCUMENT_PROCESSING = 'DOCUMENT_PROCESSING',
  SECURITY_ANOMALIES = 'SECURITY_ANOMALIES',
  DOCUMENT_DISTRIBUTION = 'DOCUMENT_DISTRIBUTION',
  SYSTEM_STORAGE = 'SYSTEM_STORAGE',
  UPLOAD_VOLUME = 'UPLOAD_VOLUME',
}

export enum RiskLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// ─── Ad Hoc ──────────────────────────────────────────────────────────────────

export interface AdHocReportConfig {
  title: string;
  dateFrom: string;
  dateTo: string;
  focusAreas: ReportFocus[];
  exportFormat: ExportFormat;
}

export interface RecentReport {
  id: string;
  title: string;
  date: string;
  sizeKb: number;
  status: 'ready' | 'generating';
}

// ─── Monthly ─────────────────────────────────────────────────────────────────

export interface DocumentProcessingStats {
  verified: number;
  pendingVerification: number;
  flaggedAnomalies: number;
  partOfEnquiry: number;
}

export interface SecurityEvent {
  day: number;
  failedLogins: number;
  unusualAccessPattern: number;
  permissionElevationRequest: number;
}

export interface DocumentDistributionCategory {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface StorageStats {
  usedGb: number;
  availableGb: number;
  totalGb: number;
  usedPercentage: number;
}

export interface UploadVolumeDay {
  day: number;
  count: number;
}

export interface MonthlyReportData {
  reportId: string;
  month: string;
  dateGenerated: string;
  createdBy: string;
  processing: DocumentProcessingStats;
  securityEvents: SecurityEvent[];
  distribution: DocumentDistributionCategory[];
  storage: StorageStats;
  uploadVolume: UploadVolumeDay[];
  totalUploads: number;
  dailyAverage: number;
  peakDay: number;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export interface ComplianceTransition {
  transitionDate: string;
  previousState: 'Compliant' | 'Non-Compliant';
  newState: 'Compliant' | 'Non-Compliant';
  triggeringEvent: string;
  downtime: string | null;
}

export interface ComplianceReportData {
  reportId: string;
  dateGenerated: string;
  createdBy: string;
  launchDate: string;
  presentDate: string;
  compliantDays: number;
  totalDays: number;
  nonCompliantDays: number;
  incidentCount: number;
  uptimePercentage: number;
  transitions: ComplianceTransition[];
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface DocumentInventoryItem {
  documentName: string;
  category: string;
  categoryColor: string;
  uploadDate: string;
  expiryDate: string | null;
  verificationStatus: 'Verified' | 'Expiring Soon' | 'Pending' | 'Expired';
}

export interface VaultAccessLogEntry {
  timestamp: string;
  accessorName: string;
  accessorRole: string;
  actionReason: string;
  organisation: string;
}

export interface ClientRelationship {
  organisation: string;
  documentsShared: number;
  status: 'Active' | 'Pending' | 'Expired';
}

export interface ActivityReportData {
  reportId: string;
  dateGenerated: string;
  documentOwner: string;
  ownerId: string;
  activeDocuments: number;
  inactiveDocuments: number;
  totalDocuments: number;
  distributionByCategory: DocumentDistributionCategory[];
  inventory: DocumentInventoryItem[];
  vaultAccessLog: VaultAccessLogEntry[];
  clientRelationships: ClientRelationship[];
}

// ─── System Audit ─────────────────────────────────────────────────────────────

export interface AuditLogRow {
  sessionId: string;
  sessionRole: string;
  targetDocument: string;
  actionExecuted: string;
  timestamp: string;
  securityStatus: 'Clean' | 'Anomaly Detected' | 'Expired Token';
}

export interface InstitutionAuditBlock {
  institutionName: string;
  tokenWindow: string;
  windowStatus: 'Active' | 'Expired';
  enquiryReason: string;
  tokenId: string;
  logs: AuditLogRow[];
  totalInteractions: number;
  anomalies: number;
}

export interface SystemAuditReportData {
  reportId: string;
  dateGenerated: string;
  createdBy: string;
  institutions: InstitutionAuditBlock[];
  totalLogs: number;
  totalSessions: number;
  totalAnomalies: number;
  cleanInteractions: number;
}

// ─── Client Risk Rating ───────────────────────────────────────────────────────

export interface ClientRiskProfile {
  name: string;
  referenceId: string;
  entityType: string;
  jurisdiction: string;
  baseScore: number;
  pepMultiplier: number;
  isPep: boolean;
  geographicScore: number;
  finalCompositeScore: number;
  riskLevel: RiskLevel;
}

export interface RiskStrataGroup {
  level: RiskLevel;
  profiles: ClientRiskProfile[];
  averageScore: number;
  pepElevatedCount: number;
}

export interface ClientRiskReportData {
  reportId: string;
  dateGenerated: string;
  createdBy: string;
  totalProfiles: number;
  portfolioAvgScore: number;
  strata: RiskStrataGroup[];
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export const REPORT_FOCUS_LABELS: Record<ReportFocus, string> = {
  [ReportFocus.DOCUMENT_PROCESSING]: 'Document Processing Activity',
  [ReportFocus.SECURITY_ANOMALIES]: 'Security & Anomalies',
  [ReportFocus.DOCUMENT_DISTRIBUTION]: 'Document Distribution by Category',
  [ReportFocus.SYSTEM_STORAGE]: 'System Storage',
  [ReportFocus.UPLOAD_VOLUME]: 'Document Upload Volume',
};

export const REPORT_FOCUS_DESCRIPTIONS: Record<ReportFocus, string> = {
  [ReportFocus.DOCUMENT_PROCESSING]: 'Uploads, verifications, rejections and re-submissions over the period',
  [ReportFocus.SECURITY_ANOMALIES]: 'Suspicious access events, failed logins and flagged activity',
  [ReportFocus.DOCUMENT_DISTRIBUTION]: 'Breakdown of documents across KYC, FICA, Tax, Legal and other categories',
  [ReportFocus.SYSTEM_STORAGE]: 'Storage consumption, growth trends and capacity utilisation',
  [ReportFocus.UPLOAD_VOLUME]: 'Total uploads by date, user and department within the selected period',
};
