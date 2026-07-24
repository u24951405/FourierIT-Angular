export interface AuditLog {
  auditLogId: number;
  userId: string;
  actionCode: string;
  timeStamp: string;
  description?: string;
  tableAffected: string;
  recordID?: number;
  previousBlockHash?: string;
  blockHash?: string;
}