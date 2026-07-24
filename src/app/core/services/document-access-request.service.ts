import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApproveRequestResponse,
  DenyRequestPayload,
  DenyRequestResponse,
  DocumentRequestedType,
  InstitutionDocumentRequestPayload,
  InstitutionDocumentRequestResponse,
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
    institutionId: number,
    payload: InstitutionDocumentRequestPayload
  ): Observable<InstitutionDocumentRequestResponse> {
    return this.http.post<InstitutionDocumentRequestResponse>(
      `${this.base}/institutions/${institutionId}/document-access-requests`,
      payload
    );
  }

  getPendingRequests(): Observable<PendingDocumentAccessRequest[]> {
    return this.http.get<PendingDocumentAccessRequest[]>(
      `${this.base}/document-access-requests/pending`
    );
  }

  getPendingDepartmentRequests(): Observable<PendingDepartmentAccessRequest[]> {
    return this.http.get<PendingDepartmentAccessRequest[]>(
      `${this.base}/department-access-requests/pending`
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

  downloadInstitutionDocument(documentId: number, token: string): Observable<Blob> {
    const params = new HttpParams().set('token', token);
    return this.http.get(`${this.base}/institution-access/documents/${documentId}`, {
      params,
      responseType: 'blob',
    });
  }
}
