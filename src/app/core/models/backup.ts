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
  success?: boolean;
  /** How long writing the backup and uploading it took, in seconds. */
  backupSeconds?: number;
  uploadSeconds?: number;
  sizeBytes?: number;
}

/** A backup running in the background (or the last one to finish). */
export interface BackupJob {
  jobId: string;
  status: 'Running' | 'Succeeded' | 'Failed';
  startedAt: string;
  finishedAt?: string | null;
  result?: BackupResponse | null;
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