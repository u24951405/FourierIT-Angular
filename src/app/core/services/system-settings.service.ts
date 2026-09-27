import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SystemSettingUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'count';

/** A timer or limit the Super Admin can change. The API supplies the title, unit and allowed range. */
export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  title: string;
  unit: SystemSettingUnit;
  min: number;
  max: number;
  default: number;
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
