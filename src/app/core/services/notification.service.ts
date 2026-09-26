import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  notificationId: number;
  subject: string;
  message: string;
  category: string | null;
  documentId: number | null;
  createdAt: string;
  isRead: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  getMine(take = 20): Observable<AppNotification[]> {
    const params = new HttpParams().set('take', take);
    return this.http.get<AppNotification[]>(this.base, { params });
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`).pipe(map(res => res?.count ?? 0));
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
