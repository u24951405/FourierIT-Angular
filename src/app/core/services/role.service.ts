import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RoleDto {
  roleId: string;
  roleName: string;
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/roles`;

  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[] | { value?: RoleDto[] }>(this.base).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.value)) return response.value;
        return [];
      }),
      catchError(() => of([]))
    );
  }
}
