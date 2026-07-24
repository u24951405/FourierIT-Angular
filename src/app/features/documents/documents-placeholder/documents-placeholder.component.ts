import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AllUserDocumentsItem, DocumentsApiService, DocumentListItem } from '../../../core/services/documents-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-documents-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents-placeholder.component.html',
  styleUrl: './documents-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsPlaceholderComponent {
  private route = inject(ActivatedRoute);
  private docsApi = inject(DocumentsApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly title =
    this.route.snapshot.data?.['documentPageTitle']
    ?? 'Documents';

  readonly message = this.route.snapshot.data?.['subtitle'] ?? 'Coming soon.';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly allUsers = signal<AllUserDocumentsItem[]>([]);
  readonly myDocuments = signal<DocumentListItem[]>([]);

  constructor() {
    this.loadDocuments();
  }

  get canSeeAllUsersDocuments(): boolean {
    return this.auth.hasRole('Department Admin')
      || this.auth.hasRole('Compliance Officer')
      || this.auth.hasRole('Stakeholder');
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.canSeeAllUsersDocuments) {
      this.docsApi.getAllUsersDocuments()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (rows: AllUserDocumentsItem[]) => {
            this.allUsers.set(
              (rows ?? []).filter(row => row.userName?.trim().toLowerCase() !== 'superadmin')
            );
          },
          error: (err: any) => {
            const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load the document library.';
            this.error.set(message);
            this.toast.show(message, 'error');
          }
        });
      return;
    }

    this.docsApi.getMyDocuments()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows: DocumentListItem[]) => {
          this.myDocuments.set(rows ?? []);
        },
        error: (err: any) => {
          const message = err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Could not load your documents.';
          this.error.set(message);
          this.toast.show(message, 'error');
        }
      });
  }
}
