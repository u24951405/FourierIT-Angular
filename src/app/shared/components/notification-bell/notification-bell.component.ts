import { Component, DestroyRef, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, catchError, finalize, interval, startWith, switchMap } from 'rxjs';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';

const UNREAD_POLL_MS = 60_000;

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly unreadCount = signal(0);
  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    interval(UNREAD_POLL_MS)
      .pipe(
        startWith(0),
        // A failed poll keeps the last known count instead of ending the polling.
        switchMap(() => this.notificationService.getUnreadCount().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(count => this.unreadCount.set(count));
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) this.load();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target;
    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  select(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.notificationId).subscribe({
        next: () => {
          this.notifications.update(list => list.map(item =>
            item.notificationId === notification.notificationId ? { ...item, isRead: true } : item
          ));
          this.unreadCount.update(count => Math.max(count - 1, 0));
        }
      });
    }

    if (notification.documentId != null) {
      this.open.set(false);
      this.router.navigate(['/my-documents'], { queryParams: { document: notification.documentId } });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(item => ({ ...item, isRead: true })));
        this.unreadCount.set(0);
      }
    });
  }

  isRejection(notification: AppNotification): boolean {
    return notification.category === 'DocumentRejected';
  }

  isApproval(notification: AppNotification): boolean {
    return notification.category === 'DocumentApproved';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.getMine()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: list => this.notifications.set(list ?? []),
        error: () => this.error.set('Could not load notifications.')
      });
  }
}
