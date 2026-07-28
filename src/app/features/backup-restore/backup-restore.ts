import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackupService } from '../../core/services/backup';
import { AuthService } from '../../core/services/auth.service';
import { Backup, BackupResponse } from '../../core/models/backup';

@Component({
  selector: 'app-backup-restore',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup-restore.html',
  styleUrls: ['./backup-restore.css']
})
export class BackupRestoreComponent implements OnInit {
  private backupService = inject(BackupService);
  private auth = inject(AuthService);

  backupHistory: Backup[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  backupFilePath = '';
  showBackingUpModal = false;

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
    this.showBackingUpModal = true;
    const currentUser = this.auth.currentUser();
    const request = {
      userId: currentUser?.id ?? '',
      isManualBackup: true
    };
    this.backupService.createBackup(request).subscribe({
      next: (result: BackupResponse) => {
        this.showBackingUpModal = false;
        this.showSuccessBanner = true;
        this.showErrorBanner = false;
        const message = result.statusMessage || 'Backup created successfully.';
        this.successMessage = message;
        this.backupFilePath = result.filePath || '';
        this.loadBackupHistory();
      },
      error: (err) => {
        console.error('Error initiating backup', err);
        this.showBackingUpModal = false;
        const message = err?.error?.message || err?.error?.error || err?.error?.title || 'Backup initiation failed. Please try again.';
        this.errorMessage = message;
        this.showErrorBanner = true;
        this.showSuccessBanner = false;
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