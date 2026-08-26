import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiRoleDto {
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface SaveRolePayload {
  roleId?: string;
  roleName: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class RolesManagementService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/roles`;

  getAll(): Observable<ApiRoleDto[]> {
    return this.http.get<ApiRoleDto[]>(this.base);
  }

  create(payload: SaveRolePayload): Observable<ApiRoleDto> {
    return this.http.post<ApiRoleDto>(this.base, payload);
  }

  update(roleId: string, payload: { roleName: string; newRoleId?: string; permissions: string[] }): Observable<ApiRoleDto> {
    return this.http.put<ApiRoleDto>(`${this.base}/${roleId}`, payload);
  }

  getPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/permissions`);
  }

  delete(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${roleId}`);
  }
}
