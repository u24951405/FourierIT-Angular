import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ComplianceUserSummary {
  userId?: string;
  userName?: string;
  email?: string;
  overallStatus?: string;
  riskLevel?: string;
  complianceCategory?: string;
  totalRequired?: number;
  uploaded?: number;
  compliant?: number;
  nonCompliant?: number;
  expired?: number;
  missing?: number;
  notCertified?: number;
  pendingReviewDocuments?: number;
  compliancePercentage?: number;
  complianceScore?: number;
  riskScore?: number;
  requiresEnhancedDueDiligence?: boolean;
  isPEP?: boolean;
  hasSanctionFlag?: boolean;
  lastChecked?: string;
  complianceDeadline?: string | null;
  documentIssues?: any[];
  missingDocuments?: any[];
  openAlerts?: any[];
}

export interface ComplianceAlert {
  alertId: number;
  alertType: string;
  severity: string;
  message: string;
  userName?: string;
  dueDate?: string | null;
  createdAt: string;
  requiredAction?: string;
}

export interface ComplianceStatistics {
  totalChecksPerformed: number;
  totalDocumentsProcessed: number;
  totalIssuesIdentified: number;
  issuesResolved: number;
  averageTimeToResolveHours: number;
  averageComplianceScore: number;
  mostCommonIssueType: string;
  documentsExpiredThisMonth: number;
  documentsExpiringNextMonth: number;
}

export interface DepartmentComplianceSummary {
  departmentId: number;
  departmentName: string;
  totalMembers: number;
  compliantMembers: number;
  nonCompliantMembers: number;
  partialMembers: number;
  compliancePercentage: number;
  averageRiskScore: number;
  openAlerts: number;
  overdueActions: number;
  nonCompliantUsers: ComplianceUserSummary[];
}

export interface ComplianceRuleSummary {
  complianceRuleId: number;
  ruleName: string;
  appliesTo: string;
  isMandatory: boolean;
  validationRules: string;
  isActive: boolean;
  description?: string;
}

export interface ComplianceHistoryItem {
  status: string;
  compliancePercentage: number;
  changeReason: string;
  changedAt: string;
}

export interface ComplianceDashboard {
  totalUsers: number;
  compliantUsers: number;
  nonCompliantUsers: number;
  partialCompliantUsers: number;
  pendingUsers?: number;
  reviewRequiredUsers: number;
  totalOpenAlerts: number;
  overallCompliancePercentage: number;
  averageComplianceScore: number;
  totalDocumentsChecked?: number;
  totalCompliantDocuments?: number;
  criticalRiskUsers: number;
  highRiskUsers: number;
  mediumRiskUsers: number;
  lowRiskUsers: number;
  departments?: DepartmentComplianceSummary[];
  criticalAlerts?: ComplianceAlert[];
  statistics?: ComplianceStatistics;
  lastUpdated?: string;
}

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/compliance`;

  getUserCompliance(userId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/users/${userId}`);
  }

  getUserIssues(userId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/users/${userId}/issues`);
  }

  getUserMissingDocuments(userId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/users/${userId}/missing-documents`);
  }

  getSystemDashboard(): Observable<ComplianceDashboard> {
    return this.http.get<{ success: boolean; data: ComplianceDashboard }>(`${this.base}/dashboard`)
      .pipe(map(response => response.data));
  }

  getDepartmentDashboard(departmentId: number): Observable<ComplianceDashboard> {
    return this.http.get<{ success: boolean; data: ComplianceDashboard }>(`${this.base}/departments/${departmentId}/dashboard`)
      .pipe(map(response => response.data));
  }

  getComplianceRules(): Observable<ComplianceRuleSummary[]> {
    return this.http.get<{ success: boolean; data: ComplianceRuleSummary[] }>(`${this.base}/rules`)
      .pipe(map(response => response.data ?? []));
  }

  getComplianceHistory(userId: string): Observable<ComplianceHistoryItem[]> {
    return this.http.get<{ success: boolean; data: ComplianceHistoryItem[] }>(`${this.base}/users/${userId}/history`)
      .pipe(map(response => response.data ?? []));
  }

  getAlerts(userId?: string): Observable<ComplianceAlert[]> {
    const url = userId
      ? `${this.base}/alerts?userId=${encodeURIComponent(userId)}`
      : `${this.base}/alerts`;

    return this.http.get<{ success: boolean; data: ComplianceAlert[] }>(url)
      .pipe(map(response => response.data ?? []));
  }
}
