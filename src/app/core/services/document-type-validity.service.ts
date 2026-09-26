import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** The API sends and accepts these as text (it uses a string enum converter). */
export enum DocumentTypeValidityBasis {
  CertificationDate = 'CertificationDate',
  UploadDate = 'UploadDate'
}

export interface DocumentTypeSummaryDto {
  id: number;
  name: string;
  description?: string | null;
  validityMonths: number;
  neverExpires: boolean;
  validityBasis: DocumentTypeValidityBasis;
  warningDays: number;
  documentCount: number;
}

export interface DocumentTypeValidityUpdateRequest {
  validityMonths: number;
  neverExpires: boolean;
  validityBasis: DocumentTypeValidityBasis;
  warningDays: number;
}

export interface DocumentTypeValiditySummaryDto {
  affectedDocuments: number;
  becomeExpired: number;
  noLongerExpired: number;
  missingSourceDate: number;
  complianceRecalculationFailed: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentTypeValidityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/document-types`;

  getAll(): Observable<DocumentTypeSummaryDto[]> {
    return this.http.get<DocumentTypeSummaryDto[]>(this.url);
  }

  getById(id: number): Observable<DocumentTypeSummaryDto> {
    return this.http.get<DocumentTypeSummaryDto>(`${this.url}/${id}`);
  }

  previewValidity(id: number, payload: DocumentTypeValidityUpdateRequest): Observable<DocumentTypeValiditySummaryDto> {
    return this.http.post<DocumentTypeValiditySummaryDto>(`${this.url}/${id}/validity/preview`, payload);
  }

  updateValidity(id: number, payload: DocumentTypeValidityUpdateRequest): Observable<DocumentTypeValiditySummaryDto> {
    return this.http.put<DocumentTypeValiditySummaryDto>(`${this.url}/${id}/validity`, payload);
  }
}
