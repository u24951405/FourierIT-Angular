import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuditLog } from '../models/audit-log';
import { environment } from '../../../environments/environment';

export interface AuditLogQuery {
  userId?: string;
  actionCode?: string;
  from?: string;
  to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/AuditLog`;

  getAuditLogs(filters?: AuditLogQuery & { page?: number; pageSize?: number; query?: string; }): Observable<{ items: AuditLog[]; totalCount: number }> {
    let params = new HttpParams();

    if (filters?.userId && filters.userId !== 'ALL') {
      params = params.set('userId', filters.userId);
    }

    if (filters?.actionCode && filters.actionCode !== 'ALL') {
      params = params.set('actionCode', filters.actionCode);
    }

    if (filters?.from) {
      params = params.set('from', filters.from);
    }

    if (filters?.to) {
      params = params.set('to', filters.to);
    }

    if (filters?.page) {
      params = params.set('page', String(filters.page));
    }

    if (filters?.pageSize) {
      params = params.set('pageSize', String(filters.pageSize));
    }

    if (filters?.query) {
      params = params.set('query', filters.query);
    }

    return this.http.get<{ items: AuditLog[]; totalCount: number }>(this.apiUrl, { params });
  }

  getAuditLogById(id: number): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.apiUrl}/${id}`);
  }
}