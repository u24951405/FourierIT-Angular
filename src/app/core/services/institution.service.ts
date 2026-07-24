import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InviteInstitutionResponse } from '../models/institution.models';

export interface InstitutionDto {
  institutionId: number;
  institutionName: string;
  verifiedDomain: string;
  regNumber: number;
  typeId: number;
  institutionTypeName: string;
}

export interface InstitutionTypeOption {
  institutionTypeId: number;
  institutionTypeName: string;
}

export interface CreateInstitutionPayload {
  institutionName: string;
  verifiedDomain: string;
  regNumber: number;
  typeId: number;
}

export type UpdateInstitutionPayload = CreateInstitutionPayload;

@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Institution`;

  getAll(): Observable<InstitutionDto[]> {
    return this.http.get<InstitutionDto[]>(this.base);
  }

  getTypes(): Observable<InstitutionTypeOption[]> {
    return this.http.get<InstitutionTypeOption[]>(`${this.base}/types`);
  }

  create(payload: CreateInstitutionPayload): Observable<InstitutionDto> {
    return this.http.post<InstitutionDto>(this.base, payload);
  }

  update(institutionId: number, payload: UpdateInstitutionPayload): Observable<InstitutionDto> {
    return this.http.put<InstitutionDto>(`${this.base}/${institutionId}`, payload);
  }

  delete(institutionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${institutionId}`);
  }

  invite(institutionId: number, email: string): Observable<InviteInstitutionResponse> {
    return this.http.post<InviteInstitutionResponse>(`${this.base}/auth/invite`, {
      institutionId,
      email,
    });
  }
}
