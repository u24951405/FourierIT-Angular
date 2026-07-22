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
