import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackupService } from '../../core/services/backup';
import { Backup } from '../../core/models/backup';

@Component({
  selector: 'app-backup-restore',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup-restore.html',
  styleUrls: ['./backup-restore.css']
})
export class BackupRestoreComponent implements OnInit {
  private backupService = inject(BackupService);

  backupHistory: Backup[] = [];
  isLoading = false;

  // Modal Visibility States
  showCreateModal = false;
  showConfirmRestoreModal = false;
  showRestoringModal = false;
  showCompleteModal = false;
  showSuccessBanner = false;

  // Selected Backup for Restoration
  selectedBackup: Backup | null = null;

  ngOnInit(): void {
    this.loadBackupHistory();
  }

  loadBackupHistory(): void {
    this.isLoading = true;
    this.backupService.getBackupHistory().subscribe({
      next: (data) => {
        this.backupHistory = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load backup history', err);
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
    const request = { userId: 'USR-0042', isManualBackup: true }; 

    this.backupService.createBackup(request).subscribe({
      next: () => {
        this.showSuccessBanner = true;
        this.loadBackupHistory();
      },
      error: (err) => console.error('Error initiating backup', err)
    });
  }

  dismissBanner(): void {
    this.showSuccessBanner = false;
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
      next: () => {
        this.showRestoringModal = false;
        this.showCompleteModal = true;
        this.loadBackupHistory();
      },
      error: (err) => {
        console.error('Error restoring backup', err);
        this.showRestoringModal = false;
      }
    });
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    this.selectedBackup = null;
  }
}