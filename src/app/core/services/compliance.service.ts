import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
