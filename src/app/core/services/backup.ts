import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Backup, BackupResponse, CreateBackupRequest, RestoreResponse, BackupJob } from '../models/backup';
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

  /** Starts a backup in the background; follow it with getBackupStatus(). */
  createBackup(request: CreateBackupRequest): Observable<BackupJob> {
    return this.http.post<BackupJob>(`${this.apiUrl}/create`, request);
  }

  /** The running backup, or the last one to finish (null if none since the API started). */
  getBackupStatus(): Observable<BackupJob | null> {
    return this.http.get<BackupJob | null>(`${this.apiUrl}/status`);
  }

  restoreBackup(id: number): Observable<RestoreResponse> {
    return this.http.post<RestoreResponse>(`${this.apiUrl}/restore/${id}`, {});
  }
}