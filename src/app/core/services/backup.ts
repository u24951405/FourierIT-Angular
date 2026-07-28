import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Backup, BackupResponse, CreateBackupRequest, RestoreResponse } from '../models/backup';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Backup`;

  getBackupHistory(): Observable<Backup[]> {
    return this.http.get<Backup[]>(`${this.apiUrl}/history`);
  }

  createBackup(request: CreateBackupRequest): Observable<BackupResponse> {
    return this.http.post<BackupResponse>(`${this.apiUrl}/create`, request);
  }

  restoreBackup(id: number): Observable<RestoreResponse> {
    return this.http.post<RestoreResponse>(`${this.apiUrl}/restore/${id}`, {});
  }
}