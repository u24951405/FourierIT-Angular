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
  requestedDocuments: DocumentRequestedType[];
}

export interface InstitutionDocumentRequestResponse {
  enquiryRequestId: number;
  institutionId: number;
  requestType: string;
  targetDepartmentId?: number;
  targetUserId?: string;
  status: string;
  requestDate: string;
  requestedDocumentTypeIds: number[];
  message?: string;
}

export interface PendingDocumentAccessRequestDocument {
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  ficaRuleId?: number;
}

export interface PendingDocumentAccessRequest {
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  targetUserId?: string;
  status: string;
  purposeNote: string;
  requestDate: string;
  documents: PendingDocumentAccessRequestDocument[];
}

export interface PendingDepartmentAccessRequest {
  enquiryRequestId: number;
  institutionId: number;
  institutionName: string;
  targetDepartmentId: number;
  departmentName: string;
  status: string;
  purposeNote: string;
  requestDate: string;
  documents: PendingDocumentAccessRequestDocument[];
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
