import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiProfileDto {
  profileId: number;
  firstName: string;
  lastName: string;
  userName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  role: string[];
  jobTitle: string;
}

export interface ManagedUserDto {
  profileId: number | null;
  id: string;
  userName: string;
  email: string;
  phoneNumber: string;
  accountStatus: string;
  departmentId: number | null;
  departmentName: string | null;
  entityTypeId: number | null;
  entityTypeName: string | null;
  entityIdentificationNumber: string;
  roles: string[];
  profile: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    dateOfBirth: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private profileBase = `${environment.apiUrl}/Profile`;
  private userBase = `${environment.apiUrl}/user`;

  getProfiles(): Observable<ApiProfileDto[]> {
    return this.http.get<ApiProfileDto[] | { value?: ApiProfileDto[] }>(this.profileBase).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.value)) return response.value;
        return [];
      })
    );
  }

  getAllUsers(): Observable<ManagedUserDto[]> {
    return this.http.get<ManagedUserDto[] | { value?: ManagedUserDto[] }>(`${this.userBase}/all`).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.value)) return response.value;
        return [];
      })
    );
  }

  /** Replaces a user's role (Super Admin / Admin only). */
  changeRole(userId: string, role: string): Observable<{ roles: string[]; message: string }> {
    return this.http.put<{ roles: string[]; message: string }>(`${this.userBase}/${encodeURIComponent(userId)}/role`, { role });
  }

  deleteUser(profileId: number | null, userId: string): Observable<void> {
    if (profileId && profileId > 0) {
      return this.http.delete<void>(`${this.userBase}/profile/${profileId}`);
    }

    return this.http.delete<void>(`${this.userBase}/by-user/${encodeURIComponent(userId)}`);
  }
}
