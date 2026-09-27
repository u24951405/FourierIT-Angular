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

export interface RolePermissionDto {
  permissionId: number;
  permissionKey: string;
  isAssigned: boolean;
}

export interface RoleDetailDto {
  roleId: string;
  roleName: string;
  permissions: RolePermissionDto[];
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

  getPermissions(): Observable<RolePermissionDto[]> {
    return this.http.get<RolePermissionDto[]>(`${this.base}/permissions`);
  }

  getRoleWithPermissions(roleId: string): Observable<RoleDetailDto> {
    return this.http.get<RoleDetailDto>(`${this.base}/${roleId}/permissions`);
  }

  addPermissionToRole(roleId: string, permissionId: number): Observable<any> {
    return this.http.post(`${this.base}/${roleId}/permissions/${permissionId}`, {});
  }

  removePermissionFromRole(roleId: string, permissionId: number): Observable<any> {
    return this.http.delete(`${this.base}/${roleId}/permissions/${permissionId}`);
  }

  delete(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${roleId}`);
  }
}
