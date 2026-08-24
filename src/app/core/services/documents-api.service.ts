import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentListItem {
  documentId: number;
  fileName: string;
  currentStatus: string;
  isCertified: boolean;
  isEncrypted: boolean;
  encryptionAlgorithm: string | null;
  fileSizeBytes: number;
  uploadedDate: string;
  lastModifiedDate: string | null;
  documentTypeId: number;
  documentTypeName: string;
}

export interface DocumentDetailItem {
  documentId: number;
  documentTypeId: number;
  fileName: string;
  currentStatus: string;
  isCertified: boolean;
  isEncrypted: boolean;
  encryptionAlgorithm: string | null;
  fileSizeBytes: number;
  uploadedDate: string;
  lastModifiedDate: string | null;
  documentTypeName: string;
}

export interface DocumentAccessApprovalItem {
  approvalId: number;
  institutionId: number;
  institutionName: string;
  approvedByUserName: string;
  approvedAt: string;
}

export interface RequiredDocumentStatusItem {
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  description: string | null;
  isUploaded: boolean;
  uploadCount: number;
}

export interface RequiredDocumentsStatusResponse {
  entityType: string;
  isComplete: boolean;
  missingCount: number;
  documents: RequiredDocumentStatusItem[];
}

export interface DocumentTypeOption {
  documentTypeId: number;
  typeName: string;
  description: string | null;
  isMandatory: boolean;
  requirementNote: string | null;
}

export interface MyEntityDocumentTypesResponse {
  entityType: string;
  documentCount: number;
  mandatoryCount: number;
  documentTypes: DocumentTypeOption[];
}

export interface UploadDocumentPayload {
  file: File;
  documentTypeId: number;
  isCertified?: boolean;
  commissionerName?: string;
  certificationDate?: string | null;
  entityTypeId?: number | null;
}

export interface AllUserDocumentsItem {
  id: string;
  email: string;
  userName: string;
  entityType: string;
  documentCount: number;
  documents: Array<{
    documentId: number;
    fileName: string;
    currentStatus: string;
    isCertified: boolean;
    uploadedDate: string;
    documentTypeName: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DocumentsApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/documents`;

  getMyDocuments(): Observable<DocumentListItem[]> {
    return this.http.get<DocumentListItem[]>(this.base);
  }

  getMyRequiredDocumentsStatus(entityTypeId?: number | null): Observable<RequiredDocumentsStatusResponse> {
    let params = new HttpParams();
    if (entityTypeId != null) params = params.set('entityTypeId', entityTypeId);
    return this.http.get<RequiredDocumentsStatusResponse>(`${this.base}/api/users/me/documents/required`, { params });
  }

  getMyDocumentTypes(): Observable<MyEntityDocumentTypesResponse> {
    return this.http.get<MyEntityDocumentTypesResponse>(`${this.base}/api/users/me/document-types`);
  }

  uploadDocument(payload: UploadDocumentPayload): Observable<DocumentListItem> {
    const formData = new FormData();
    formData.append('File', payload.file);
    formData.append('DocumentTypeId', String(payload.documentTypeId));
    formData.append('IsCertified', String(!!payload.isCertified));

    if (payload.commissionerName) {
      formData.append('CommissionerName', payload.commissionerName);
    }

    if (payload.certificationDate) {
      formData.append('CertificationDate', payload.certificationDate);
    }

    if (payload.entityTypeId != null) {
      formData.append('EntityTypeId', String(payload.entityTypeId));
    }

    return this.http.post<DocumentListItem>(`${this.base}/upload`, formData);
  }

  updateDocument(documentId: number, payload: UploadDocumentPayload): Observable<DocumentDetailItem> {
    const formData = new FormData();
    formData.append('File', payload.file);
    formData.append('DocumentTypeId', String(payload.documentTypeId));
    formData.append('IsCertified', String(!!payload.isCertified));

    if (payload.commissionerName) {
      formData.append('CommissionerName', payload.commissionerName);
    }

    if (payload.certificationDate) {
      formData.append('CertificationDate', payload.certificationDate);
    }

    if (payload.entityTypeId != null) {
      formData.append('EntityTypeId', String(payload.entityTypeId));
    }

    return this.http.put<DocumentDetailItem>(`${this.base}/${documentId}`, formData);
  }

  previewDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${documentId}/preview`, { responseType: 'blob' });
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${documentId}/download`, { responseType: 'blob' });
  }

  deleteDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${documentId}`);
  }

  getDocumentById(documentId: number): Observable<DocumentDetailItem> {
    return this.http.get<DocumentDetailItem>(`${this.base}/${documentId}`);
  }

  getDocumentAccess(documentId: number): Observable<DocumentAccessApprovalItem[]> {
    return this.http.get<DocumentAccessApprovalItem[]>(`${this.base}/${documentId}/access`);
  }

  revokeDocumentAccess(documentId: number, approvalId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${documentId}/access/${approvalId}`);
  }

  getAllUsersDocuments(): Observable<AllUserDocumentsItem[]> {
    return this.http.get<AllUserDocumentsItem[]>(`${this.base}/admin/all-users-documents`);
  }
}
