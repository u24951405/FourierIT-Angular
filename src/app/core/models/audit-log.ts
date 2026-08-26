export interface AuditLog {
  auditLogId: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  institutionId?: number;
  institutionName?: string;
  actionCode: string;
  timeStamp: string;
  description?: string;
  tableAffected: string;
  recordID?: number;
  previousBlockHash?: string;
  blockHash?: string;
}