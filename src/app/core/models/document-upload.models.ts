export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export enum DocumentCategory {
  KYC = 'KYC',
  FICA = 'FICA',
}

export enum DocumentStatus {
  NOT_UPLOADED = 'NOT_UPLOADED',
  UPLOADED = 'UPLOADED',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Director {
  id: string;
  name: string;
}

export interface BeneficialOwner {
  id: string;
  name: string;
  shareholdingPercentage: number;
}

export interface DocumentItem {
  id: string;
  category: DocumentCategory;
  title: string;
  label: string;
  required: boolean;
  conditional?: boolean;
  dateSensitive?: boolean;
}

export interface UploadedDocument {
  documentId: string;
  itemId: string;
  fileName: string;
  status: DocumentStatus;
  category: DocumentCategory;
  uploadDate?: string;
  uploadedBy?: string;
  mimeType?: string;
}

export interface UploadPageState {
  consentGiven: boolean;
  entityType: EntityType | null;
  canSubmit: boolean;
  uploadedDocuments: UploadedDocument[];
  declarations: {
    isForeignNational: boolean;
    hasNoPersonalProofOfAddress: boolean;
    directors: Director[];
    beneficialOwners: BeneficialOwner[];
  };
}

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface ConsentRecord {
  consentGiven: boolean;
  subjectId: string;
  userId: string;
}
