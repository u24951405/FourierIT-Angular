import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { BackupService } from '../../core/services/backup';
import { AuthService } from '../../core/services/auth.service';
import { Backup, BackupJob } from '../../core/models/backup';

@Component({
  selector: 'app-backup-restore',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup-restore.html',
  styleUrls: ['./backup-restore.css']
})
export class BackupRestoreComponent implements OnInit, OnDestroy {
  private backupService = inject(BackupService);
  private auth = inject(AuthService);

  backupHistory: Backup[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  backupFilePath = '';
  showBackingUpModal = false;
  /** A backup is running in the background; the page keeps working meanwhile. */
  backupRunning = false;
  private statusPolling?: Subscription;

  // Modal Visibility States
  showCreateModal = false;
  showConfirmRestoreModal = false;
  showRestoringModal = false;
  showCompleteModal = false;
  showSuccessBanner = false;
  showErrorBanner = false;

  // Selected Backup for Restoration
  selectedBackup: Backup | null = null;

  ngOnInit(): void {
    this.loadBackupHistory();
    // If a backup is still running (e.g. started before a refresh), pick up where it is.
    this.backupService.getBackupStatus().subscribe({
      next: job => { if (job?.status === 'Running') this.followBackup(); },
      error: () => { /* the status is a nicety; the page works without it */ },
    });
  }

  ngOnDestroy(): void {
    this.statusPolling?.unsubscribe();
  }

  /** Checks the running backup every 2 seconds until it finishes, then reports how it went. */
  private followBackup(): void {
    this.backupRunning = true;
    this.statusPolling?.unsubscribe();
    this.statusPolling = timer(2000, 2000).pipe(
      switchMap(() => this.backupService.getBackupStatus()),
      takeWhile(job => job?.status === 'Running', true),
    ).subscribe({
      next: job => { if (job && job.status !== 'Running') this.backupFinished(job); },
      error: () => {
        this.backupRunning = false;
        this.errorMessage = 'Lost track of the backup. Refresh the page to see whether it finished.';
        this.showErrorBanner = true;
      },
    });
  }

  private backupFinished(job: BackupJob): void {
    this.backupRunning = false;
    const result = job.result;
    if (job.status === 'Succeeded') {
      this.successMessage = result?.statusMessage || 'Backup created successfully.';
      this.backupFilePath = '';
      this.showSuccessBanner = true;
      this.showErrorBanner = false;
      this.loadBackupHistory();
    } else {
      this.errorMessage = result?.statusMessage || 'The backup failed.';
      this.showErrorBanner = true;
      this.showSuccessBanner = false;
    }
  }

  loadBackupHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.backupService.getBackupHistory().subscribe({
      next: (data) => {
        this.backupHistory = data.sort((a, b) => new Date(b.dateBackedUp).getTime() - new Date(a.dateBackedUp).getTime());
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load backup history', err);
        this.errorMessage = 'Unable to load backup history at this time.';
        this.isLoading = false;
      }
    });
  }

  // --- Backup Creation Flow ---
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  proceedWithBackup(): void {
    this.closeCreateModal();
    this.showSuccessBanner = false;
    this.showErrorBanner = false;
    const currentUser = this.auth.currentUser();
    const request = {
      userId: currentUser?.id ?? '',
      isManualBackup: true
    };
    // The backup runs in the background; the page follows it instead of waiting on the request.
    this.backupService.createBackup(request).subscribe({
      next: () => this.followBackup(),
      error: (err) => {
        if (err?.status === 409) {
          this.followBackup(); // one is already running: follow that one
          return;
        }
        console.error('Error starting backup', err);
        this.errorMessage = err?.error?.error || err?.error?.message || err?.error?.title || 'The backup could not be started. Please try again.';
        this.showErrorBanner = true;
      }
    });
  }

  dismissBanner(): void {
    this.showSuccessBanner = false;
    this.showErrorBanner = false;
  }

  // --- Backup Restoration Flow ---
  openRestoreModal(backup: Backup): void {
    this.selectedBackup = backup;
    this.showConfirmRestoreModal = true;
  }

  closeRestoreModal(): void {
    this.showConfirmRestoreModal = false;
    this.selectedBackup = null;
  }

  confirmRestore(): void {
    if (!this.selectedBackup) return;

    const backupId = this.selectedBackup.backupId;
    this.showConfirmRestoreModal = false;
    this.showRestoringModal = true;

    this.backupService.restoreBackup(backupId).subscribe({
      next: (response) => {
        this.showRestoringModal = false;
        this.showCompleteModal = true;
        this.showSuccessBanner = true;
        this.showErrorBanner = false;
        this.successMessage = response.message || 'Restore completed successfully.';
        this.loadBackupHistory();
      },
      error: (err) => {
        console.error('Error restoring backup', err);
        const message = err?.error?.message || err?.error?.error || err?.error?.title || 'Restore failed. Please try again.';
        this.errorMessage = message;
        this.showRestoringModal = false;
        this.showErrorBanner = true;
        this.showSuccessBanner = false;
      }
    });
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    this.selectedBackup = null;
  }
}