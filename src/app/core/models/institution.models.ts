export interface InstitutionSession {
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  email: string;
  sessionToken: string;
  accessToken: string;
  authenticatedAt: string;
  expiresAt: string;
  authMethod: string;
}

export interface TokenValidationRequest {
  accessToken: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  maskedEmail?: string;
}

export interface OtpVerifyRequest {
  institutionId: string;
  otp: string;
  accessToken: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  sessionToken?: string;
  expiresAt?: string;
  message?: string;
}

export interface OtpResendRequest {
  institutionId: string;
  accessToken: string;
}

export interface InviteInstitutionRequest {
  institutionId: number;
  email: string;
}

export interface InviteInstitutionResponse {
  accessToken: string;
  expiresAt: string;
  maskedEmail: string;
}

export interface DocumentRequestedType {
  documentTypeId: number;
  ficaRuleId?: number;
  isMandatory?: boolean;
}

export interface InstitutionDocumentRequestPayload {
  requestType: 'Department' | 'Individual';
  targetDepartmentId?: number | null;
  targetUserId?: string | null;
  purposeNote?: string;
  submissionDeadline?: string | null;
  referenceNumber?: string;
  requestedDocuments: DocumentRequestedType[];
}

export interface InstitutionDocumentRequestResponse {
  enquiryRequestId: number;
  institutionId: number;
  requestType: string;
  targetDepartmentId?: number;
  targetUserId?: string;
  status: string;
  submissionDeadline?: string;
  referenceNumber?: string;
  requestDate: string;
  requestedDocumentTypeIds: number[];
  message?: string;
}

export interface InstitutionRequestEditData {
  enquiryRequestId: number;
  institutionId: number;
  requestType: 'Department' | 'Individual';
  targetDepartmentId?: number;
  targetUserId?: string;
  recipientName: string;
  status: string;
  purposeNote: string;
  submissionDeadline?: string;
  referenceNumber?: string;
  documents: Array<{ documentTypeId: number; documentTypeName: string; isMandatory: boolean }>;
}

export interface InstitutionRequestSummary {
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
}

export interface InstitutionRecipientDocumentType {
  documentTypeId: number;
  typeName: string;
  description: string | null;
  isMandatory: boolean;
  requirementNote: string | null;
}

export interface PendingDocumentAccessRequestDocument {
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  ficaRuleId?: number;
}

export interface PendingRequestRecipient {
  type: 'Department' | 'Individual';
  name: string;
}

export interface PendingDocumentAccessRequest {
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  requestType: 'Department' | 'Individual';
  recipient: PendingRequestRecipient;
  // Backward-compatible fields for components still using the legacy request shape
  senderName?: string;
  recipientName?: string;
  recipientType?: 'Department' | 'Individual';
  status: string;
  purposeNote: string;
  requestDate: string;
  documents: PendingDocumentAccessRequestDocument[];
  referenceNumber?: string | null;
  submissionDeadline?: string | null;
  /** When the recipient decided (approved/denied) or the institution cancelled. */
  respondedAt?: string | null;
  /** The recipient's note, e.g. the reason a request was denied. */
  responseNote?: string | null;
  /** When access to an approved request's documents ends (null once withdrawn). */
  accessExpiresAt?: string | null;
  /** Pending, Approved or Denied when more time was asked for. */
  extensionStatus?: string | null;
  extensionRequestedUntil?: string | null;
  extensionResponseNote?: string | null;
  /** Only filled while the request is still waiting for a decision. */
  isComplete?: boolean | null;
  missingCount?: number | null;
  requestedDocumentStatuses?: InstitutionRequestChecklistResponse['requestedDocumentStatuses'] | null;
}

export interface PendingDepartmentAccessRequest {
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  targetDepartmentId: number;
  departmentName: string;
  senderName?: string;
  senderType?: 'Institution';
  recipientName?: string;
  recipientType?: 'Department' | 'Individual';
  status: string;
  purposeNote: string;
  requestDate: string;
  documents: PendingDocumentAccessRequestDocument[];
  isComplete?: boolean;
  missingCount?: number;
}

export interface InstitutionRequestChecklistResponse {
  enquiryRequestId: number;
  requestType: 'Department' | 'Individual';
  status: string;
  recipient: {
    type: 'Department' | 'Individual';
    name: string;
  };
  isComplete: boolean;
  missingCount: number;
  requestedDocumentStatuses: Array<{
    documentTypeId: number;
    documentTypeName: string;
    isMandatory: boolean;
    state: 'Uploaded' | 'Rejected' | 'Missing';
    isUploaded: boolean;
    isRejected: boolean;
    uploadCount: number;
  }>;
}

export interface RouteRequestToOwnerPayload {
  targetUserId: string;
  adminNote?: string;
}

export interface RouteRequestToOwnerResponse {
  enquiryRequestId: number;
  status: string;
  routedTo: {
    id: string;
    userName: string;
  };
  message: string;
}

export interface ApproveRequestResponse {
  enquiryRequestId: number;
  status: string;
  token: string;
  expiresAt: string;
  documentIds: number[];
}

export interface DenyRequestPayload {
  userResponseNote?: string;
}

export interface DenyRequestResponse {
  message: string;
  requestId: number;
  status: string;
}

export interface ApprovedInstitutionDocument {
  requestId: number;
  requestType: 'Department' | 'Individual';
  recipientName: string;
  documentId: number;
  documentName: string;
  documentTypeName: string;
  approvedAt: string;
  expiresAt?: string;
  /** Pending, Approved or Denied when the institution asked for more time on this request. */
  extensionStatus?: string | null;
  extensionRequestedUntil?: string | null;
}

/** An institution asking the owner for more time on access they approved. */
export interface PendingAccessExtension {
  enquiryRequestId: number;
  referenceNumber?: string | null;
  institutionName: string;
  purposeNote: string;
  currentAccessEndsAt?: string | null;
  extensionRequestedUntil: string;
  extensionReason: string;
  extensionRequestedAt: string;
}

export interface InstitutionNotification {
  enquiryRequestId: number;
  status: string;
  requestType: 'Department' | 'Individual';
  recipientName: string;
  message: string;
  timestamp: string;
}

export interface AuditLogEntry {
  userId: string;
  institutionId: string;
  timestamp: string;
  actionType: AuditEventType;
}

export enum AuditEventType {
  OTP_SENT = 'OTP_SENT',
  OTP_VERIFIED = 'OTP_VERIFIED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
}
