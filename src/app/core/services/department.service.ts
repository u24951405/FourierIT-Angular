import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiDepartmentDto {
  departmentId: number;
  departmentName: string;
  branchId: number;
  createdAt: string;
}

export interface SaveDepartmentPayload {
  departmentName: string;
  branchId: number;
}

export interface BranchListDto {
  branchId: number;
  branchName: string;
  city: string;
}

export interface DepartmentRequiredDocumentDto {
  departmentDocumentTypeId: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  createdAt: string;
}

export interface DepartmentAdminDto {
  userId: string;
  userName: string;
  email: string;
  departmentId?: number | null;
  departmentName?: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string;
  dateOfBirth?: string | null;
}

export interface UnassignedDepartmentAdminDto {
  userId: string;
  userName: string;
  email: string;
  phoneNumber?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
}

export interface CreateDepartmentAdminPayload {
  departmentId?: number;
  userId?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  username?: string;
  password?: string;
  phoneNumber?: string;
  jobTitle?: string;
  dateOfBirth?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Department`;
  private branchBase = `${environment.apiUrl}/Branch`;

  getBranches(): Observable<BranchListDto[]> {
    return this.http.get<BranchListDto[]>(this.branchBase);
  }

  getAll(): Observable<ApiDepartmentDto[]> {
    return this.http.get<ApiDepartmentDto[]>(this.base);
  }

  create(payload: SaveDepartmentPayload): Observable<ApiDepartmentDto> {
    return this.http.post<ApiDepartmentDto>(this.base, payload);
  }

  update(departmentId: number, payload: SaveDepartmentPayload): Observable<ApiDepartmentDto> {
    return this.http.put<ApiDepartmentDto>(`${this.base}/${departmentId}`, payload);
  }

  delete(departmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${departmentId}`);
  }

  getRequiredDocuments(departmentId: number): Observable<DepartmentRequiredDocumentDto[]> {
    return this.http.get<DepartmentRequiredDocumentDto[]>(`${this.base}/${departmentId}/required-documents`);
  }

  getDepartmentAdmin(departmentId: number): Observable<{ departmentId: number; admin: DepartmentAdminDto | null }> {
    return this.http.get<{ departmentId: number; admin: DepartmentAdminDto | null }>(`${environment.apiUrl}/user/departments/${departmentId}/admin`);
  }

  getUnassignedDepartmentAdmins(): Observable<UnassignedDepartmentAdminDto[]> {
    return this.http.get<UnassignedDepartmentAdminDto[]>(`${environment.apiUrl}/user/departments/admins/unassigned`);
  }

  assignDepartmentAdmin(departmentId: number, payload: CreateDepartmentAdminPayload): Observable<{ message: string; admin: DepartmentAdminDto }> {
    return this.http.post<{ message: string; admin: DepartmentAdminDto }>(`${environment.apiUrl}/user/departments/${departmentId}/admin`, payload);
  }

  removeDepartmentAdmin(departmentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/user/departments/${departmentId}/admin`);
  }
}
