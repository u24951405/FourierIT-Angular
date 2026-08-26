import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/system-settings`;

  getAll(): Observable<SystemSetting[]> {
    return this.http.get<SystemSetting[]>(this.url);
  }

  update(key: string, value: string): Observable<SystemSetting> {
    return this.http.put<SystemSetting>(`${this.url}/${encodeURIComponent(key)}`, { value });
  }
}
