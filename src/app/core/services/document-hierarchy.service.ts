import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentItemDto {
  documentId: number;
  fileName: string;
  currentStatus: string;
  isCertified: boolean;
  uploadedDate: string;
  fileSizeBytes: number;
  userCanView: boolean;
  userCanDownload: boolean;
  userCanDelete: boolean;
  userCanEdit: boolean;
  userCanShare: boolean;
}

export interface DocumentTypeHierarchyDto {
  documentTypeId: number;
  typeName: string;
  description: string;
  isMandatory: boolean;
  documents: DocumentItemDto[];
}

export interface EntityTypeHierarchyDto {
  entityTypeId: number;
  name: string;
  documentTypes: DocumentTypeHierarchyDto[];
  userHasAccess: boolean;
}

export interface SearchResultDto {
  documentId: number;
  documentName: string;
  documentTypeName: string;
  entityTypeName: string;
  status: string;
  isCertified: boolean;
  uploadedDate: string;
  fileSizeBytes: number;
  userCanView: boolean;
  userCanDownload: boolean;
  userCanDelete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentHierarchyService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  /**
   * Get document hierarchy for current user (auto-filtered by role)
   */
  getDocumentHierarchy(): Observable<EntityTypeHierarchyDto[]> {
    return this.http.get<EntityTypeHierarchyDto[]>(`${this.apiUrl}/hierarchy`);
  }

  /**
   * Get full hierarchy (Super Admin only)
   */
  getFullHierarchy(): Observable<EntityTypeHierarchyDto[]> {
    return this.http.get<EntityTypeHierarchyDto[]>(`${this.apiUrl}/hierarchy/full`);
  }

  /**
   * Search documents by query string
   */
  searchDocuments(query: string): Observable<SearchResultDto[]> {
    return this.http.get<SearchResultDto[]>(`${this.apiUrl}/hierarchy/search`, {
      params: { q: query }
    });
  }

  /**
   * Get document types for a specific entity type
   */
  getDocumentTypesByEntityType(entityTypeId: number): Observable<DocumentTypeHierarchyDto[]> {
    return this.http.get<DocumentTypeHierarchyDto[]>(
      `${this.apiUrl}/hierarchy/entity-type/${entityTypeId}`
    );
  }

  /**
   * Get documents for a specific document type
   */
  getDocumentsByType(documentTypeId: number): Observable<DocumentItemDto[]> {
    return this.http.get<DocumentItemDto[]>(
      `${this.apiUrl}/hierarchy/document-type/${documentTypeId}`
    );
  }
}
