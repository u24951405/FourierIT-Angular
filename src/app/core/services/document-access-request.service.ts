import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApproveRequestResponse,
  ApprovedInstitutionDocument,
  DenyRequestPayload,
  DenyRequestResponse,
  DocumentRequestedType,
  InstitutionDocumentRequestPayload,
  InstitutionDocumentRequestResponse,
  InstitutionRecipientDocumentType,
  InstitutionNotification,
  InstitutionRequestSummary,
  InstitutionRequestChecklistResponse,
  PendingDepartmentAccessRequest,
  PendingDocumentAccessRequest,
  RouteRequestToOwnerPayload,
  RouteRequestToOwnerResponse,
} from '../models/institution.models';

@Injectable({ providedIn: 'root' })
export class DocumentAccessRequestService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}`;

  createRequest(
    payload: InstitutionDocumentRequestPayload
  ): Observable<InstitutionDocumentRequestResponse> {
    const sessionJson = sessionStorage.getItem('institution_session');
    const sessionToken = sessionJson ? JSON.parse(sessionJson).sessionToken : '';
    
    console.debug('[DocumentAccessRequestService] Creating request', {
      sessionJson,
      sessionToken,
      endpoint: `${this.base}/institution-access/requests`,
      payload
    });
    
    return this.http.post<InstitutionDocumentRequestResponse>(
      `${this.base}/institution-access/requests`,
      payload,
      { params: new HttpParams().set('token', sessionToken) }
    );
  }

  getPendingRequests(): Observable<PendingDocumentAccessRequest[]> {
    return this.http.get<PendingDocumentAccessRequest[]>(`${this.base}/document-access-requests/pending`);
  }

  getPendingDepartmentRequests(): Observable<PendingDepartmentAccessRequest[]> {
    return this.http.get<PendingDepartmentAccessRequest[]>(`${this.base}/department-access-requests/pending`);
  }

  getInstitutionRequestSummary(institutionId: number): Observable<InstitutionRequestSummary> {
    return this.http.get<InstitutionRequestSummary>(
      `${this.base}/institutions/${institutionId}/document-access-requests/summary`
    );
  }

  getInstitutionAccessRequestSummary(token: string): Observable<InstitutionRequestSummary> {
    const params = new HttpParams().set('token', token);
    return this.http.get<InstitutionRequestSummary>(
      `${this.base}/institution-access/requests/summary`,
      { params }
    );
  }

  getInstitutionRequests(token: string): Observable<PendingDocumentAccessRequest[]> {
    const params = new HttpParams().set('token', token);
    return this.http.get<PendingDocumentAccessRequest[]>(`${this.base}/institution-access/requests`, { params });
  }

  getInstitutionRequestChecklist(token: string, requestId: number): Observable<InstitutionRequestChecklistResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<InstitutionRequestChecklistResponse>(`${this.base}/institution-access/requests/${requestId}/checklist`, { params });
  }

  getInstitutionDepartments(token: string): Observable<{ departmentId: number; departmentName: string }[]> {
    const params = new HttpParams().set('token', token);
    return this.http.get<{ departmentId: number; departmentName: string }[]>(
      `${this.base}/institution-access/requests/departments`,
      { params }
    );
  }

  getInstitutionUsers(token: string): Observable<{ userId: string; userName: string; displayName: string }[]> {
    const params = new HttpParams().set('token', token);
    return this.http.get<{ userId: string; userName: string; displayName: string }[]>(
      `${this.base}/institution-access/requests/users`,
      { params }
    );
  }

  getInstitutionRecipientDocumentTypes(
    token: string,
    requestType: 'Department' | 'Individual',
    recipientId: string
  ): Observable<InstitutionRecipientDocumentType[] | { documentTypes?: InstitutionRecipientDocumentType[]; warning?: string }> {
    const params = new HttpParams()
      .set('token', token)
      .set('requestType', requestType)
      .set('recipientId', recipientId);

    return this.http.get<InstitutionRecipientDocumentType[] | { documentTypes?: InstitutionRecipientDocumentType[]; warning?: string }>(
      `${this.base}/institution-access/requests/document-types`,
      { params }
    );
  }

  routeRequestToOwner(
    requestId: number,
    payload: RouteRequestToOwnerPayload
  ): Observable<RouteRequestToOwnerResponse> {
    return this.http.post<RouteRequestToOwnerResponse>(
      `${this.base}/department-access-requests/${requestId}/route-to-owner`,
      payload
    );
  }

  approveRequest(requestId: number): Observable<ApproveRequestResponse> {
    return this.http.post<ApproveRequestResponse>(
      `${this.base}/document-access-requests/${requestId}/approve`,
      null
    );
  }

  denyRequest(
    requestId: number,
    payload?: DenyRequestPayload
  ): Observable<DenyRequestResponse> {
    return this.http.post<DenyRequestResponse>(
      `${this.base}/document-access-requests/${requestId}/deny`,
      payload ?? null
    );
  }

  revokeInstitutionRequest(requestId: number): Observable<any> {
    const sessionJson = sessionStorage.getItem('institution_session');
    const sessionToken = sessionJson ? JSON.parse(sessionJson).sessionToken : '';
    const params = new HttpParams().set('token', sessionToken);
    return this.http.post<any>(`${this.base}/institution-access/requests/${requestId}/revoke`, null, { params });
  }

  getApprovedInstitutionDocuments(token: string): Observable<ApprovedInstitutionDocument[]> {
    const params = new HttpParams().set('token', token);
    return this.http.get<ApprovedInstitutionDocument[]>(`${this.base}/institution-access/documents`, { params });
  }

  getInstitutionNotifications(token: string): Observable<InstitutionNotification[]> {
    const params = new HttpParams().set('token', token);
    return this.http.get<InstitutionNotification[]>(`${this.base}/institution-access/notifications`, { params });
  }

  downloadInstitutionDocument(documentId: number, token: string): Observable<Blob> {
    const params = new HttpParams().set('token', token);
    return this.http.get(`${this.base}/institution-access/documents/${documentId}`, {
      params,
      responseType: 'blob',
    });
  }

  flagApprovedDocument(documentId: number, token: string, payload: { reason: string }): Observable<any> {
    const params = new HttpParams().set('token', token);
    return this.http.post<any>(`${this.base}/institution-access/documents/${documentId}/flag`, payload, { params });
  }
}
