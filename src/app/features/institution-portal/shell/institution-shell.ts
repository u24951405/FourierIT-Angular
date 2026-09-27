import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import type { InstitutionNotification } from '../../../core/models/institution.models';

const SEEN_KEY = 'institution_notifications_seen_at';

/**
 * The frame around every signed-in institution portal page: the top bar (institution, updates, sign out),
 * the page tabs and the footer. Pages only render their own content.
 */
@Component({
  selector: 'app-institution-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './institution-shell.html',
  styleUrl: './institution-shell.css',
})
export class InstitutionShellComponent {
  private readonly auth = inject(InstitutionAuthService);
  private readonly requests = inject(DocumentAccessRequestService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly institutionName = this.auth.institutionName;
  readonly institutionCode = this.auth.institutionCode;

  readonly tabs = [
    { label: 'Home', path: '/institution/dashboard' },
    { label: 'Request documents', path: '/institution/request-documents' },
    { label: 'My requests', path: '/institution/my-requests' },
    { label: 'Approved documents', path: '/institution/approved-documents' },
  ];

  readonly updatesOpen = signal(false);
  readonly updates = signal<InstitutionNotification[]>([]);
  readonly updatesLoading = signal(false);
  readonly updatesError = signal<string | null>(null);
  readonly unseenCount = signal(0);

  constructor() {
    this.loadUpdates();
  }

  toggleUpdates(event: MouseEvent): void {
    event.stopPropagation();
    const open = !this.updatesOpen();
    this.updatesOpen.set(open);
    if (open) {
      this.loadUpdates();
      this.markSeen();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.updatesOpen() && event.target instanceof Node && !this.host.nativeElement.contains(event.target)) {
      this.updatesOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.updatesOpen.set(false);
  }

  signOut(): void {
    this.auth.signOut();
  }

  private loadUpdates(): void {
    const token = this.auth.getSessionToken();
    if (!token) return;

    this.updatesLoading.set(true);
    this.updatesError.set(null);
    this.requests.getInstitutionNotifications(token)
      .pipe(finalize(() => this.updatesLoading.set(false)))
      .subscribe({
        next: list => {
          this.updates.set(list ?? []);
          this.unseenCount.set(this.updatesOpen() ? 0 : this.countUnseen(list ?? []));
        },
        error: () => this.updatesError.set('Could not load updates.'),
      });
  }

  /** The badge counts updates that arrived since the institution last opened the list. */
  private countUnseen(list: InstitutionNotification[]): number {
    let seenAt = 0;
    try { seenAt = Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { /* storage unavailable */ }
    return list.filter(item => new Date(item.timestamp).getTime() > seenAt).length;
  }

  private markSeen(): void {
    this.unseenCount.set(0);
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* storage unavailable */ }
  }
}
