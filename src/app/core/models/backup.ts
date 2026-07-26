export interface Backup {
  backupId: number;
  userId?: string;
  fileName: string;
  dateBackedUp: string; // ISO Date String
  isManualBackup: boolean;
}

export interface BackupResponse {
  backupId: number;
  userId: string;
  fileName: string;
  filePath: string;
  dateBackedUp: string; // ISO Date String
  isManualBackup: boolean;
  statusMessage: string;
}

export interface CreateBackupRequest {
  userId: string;
  isManualBackup: boolean;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  restoredAt: string;
}