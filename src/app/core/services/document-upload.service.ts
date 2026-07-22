import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import {
  BeneficialOwner,
  ConsentRecord,
  Director,
  DocumentCategory,
  DocumentItem,
  DocumentStatus,
  EntityType,
  UploadPageState,
  UploadValidationResult,
  UploadedDocument,
} from '../models/document-upload.models';

@Injectable({ providedIn: 'root' })
export class DocumentUploadService {
  private readonly todoItems: DocumentItem[] = [
    { id: 'kyc-id', category: DocumentCategory.KYC, title: 'Identity document', label: 'Identity document', required: true },
    { id: 'fica-id', category: DocumentCategory.FICA, title: 'FICA declaration', label: 'FICA declaration', required: true },
  ];

  private readonly initialState: UploadPageState = {
    consentGiven: false,
    entityType: null,
    canSubmit: true,
    uploadedDocuments: [],
    declarations: {
      isForeignNational: false,
      hasNoPersonalProofOfAddress: false,
      directors: [],
      beneficialOwners: [],
    },
  };

  private readonly state = new BehaviorSubject<UploadPageState>(this.initialState);

  getState(): Observable<UploadPageState> {
    return this.state.asObservable();
  }

  resetState(): void {
    this.state.next({ ...this.initialState, uploadedDocuments: [] });
  }

  setEntityType(type: EntityType): void {
    const current = this.state.value;
    this.state.next({ ...current, entityType: type });
  }

  getRemainingCount(): number {
    return this.state.value.uploadedDocuments.filter((doc) => doc.status !== DocumentStatus.APPROVED).length;
  }

  isItemUploaded(item: DocumentItem): boolean {
    return this.state.value.uploadedDocuments.some(
      (doc) => doc.category === item.category && doc.status !== DocumentStatus.REJECTED
    );
  }

  getTodoByCategory(category: DocumentCategory): DocumentItem[] {
    return this.todoItems.filter((item) => item.category === category);
  }

  updateDeclaration(values: Partial<UploadPageState['declarations']>): void {
    const current = this.state.value;
    this.state.next({
      ...current,
      declarations: { ...current.declarations, ...values },
    });
  }

  addDirector(director: Director): void {
    const current = this.state.value;
    this.state.next({ ...current, declarations: { ...current.declarations, directors: [...current.declarations.directors, director] } });
  }

  removeDirector(id: string): void {
    const current = this.state.value;
    this.state.next({ ...current, declarations: { ...current.declarations, directors: current.declarations.directors.filter((director) => director.id !== id) } });
  }

  addBeneficialOwner(owner: BeneficialOwner): void {
    const current = this.state.value;
    this.state.next({ ...current, declarations: { ...current.declarations, beneficialOwners: [...current.declarations.beneficialOwners, owner] } });
  }

  removeBeneficialOwner(id: string): void {
    const current = this.state.value;
    this.state.next({ ...current, declarations: { ...current.declarations, beneficialOwners: current.declarations.beneficialOwners.filter((owner) => owner.id !== id) } });
  }

  validateFile(file: File): UploadValidationResult {
    if (!file || file.size === 0) {
      return { valid: false, error: 'Please choose a file with content.' };
    }
    return { valid: true };
  }

  validateDocumentDate(date: Date): UploadValidationResult {
    return { valid: !Number.isNaN(date.getTime()) };
  }

  uploadDocument(file: File, item: DocumentItem, userId: string, documentOwner: string, documentDate?: Date): Observable<UploadedDocument> {
    const doc: UploadedDocument = {
      documentId: `doc_${Date.now()}`,
      itemId: item.id,
      fileName: file.name,
      status: DocumentStatus.UPLOADED,
      category: item.category,
      uploadDate: (documentDate ?? new Date()).toISOString(),
      uploadedBy: userId,
      mimeType: file.type,
    };

    const current = this.state.value;
    this.state.next({
      ...current,
      uploadedDocuments: [...current.uploadedDocuments, doc],
    });

    return of(doc);
  }

  reUploadDocument(file: File, uploaded: UploadedDocument, userId: string): Observable<UploadedDocument> {
    const updated: UploadedDocument = {
      ...uploaded,
      itemId: uploaded.itemId,
      fileName: file.name,
      uploadedBy: userId,
      mimeType: file.type,
      status: DocumentStatus.UPLOADED,
    };

    const current = this.state.value;
    const nextDocuments = current.uploadedDocuments.map((doc) => (doc.documentId === uploaded.documentId ? updated : doc));
    this.state.next({ ...current, uploadedDocuments: nextDocuments });
    return of(updated);
  }

  submitForComplianceReview(userId: string, entityType: EntityType): Observable<UploadedDocument[]> {
    const current = this.state.value;
    const updatedDocs = current.uploadedDocuments.map((doc) => ({ ...doc, status: DocumentStatus.AWAITING_REVIEW }));
    this.state.next({ ...current, uploadedDocuments: updatedDocs, canSubmit: false, entityType });
    return of(updatedDocs);
  }

  approveDocument(documentId: string, userId: string): Observable<void> {
    const current = this.state.value;
    const updatedDocs = current.uploadedDocuments.map((doc) => (doc.documentId === documentId ? { ...doc, status: DocumentStatus.APPROVED } : doc));
    this.state.next({ ...current, uploadedDocuments: updatedDocs });
    return of(void 0);
  }

  rejectDocument(documentId: string, userId: string, reason: string): Observable<void> {
    const current = this.state.value;
    const updatedDocs = current.uploadedDocuments.map((doc) => (doc.documentId === documentId ? { ...doc, status: DocumentStatus.REJECTED } : doc));
    this.state.next({ ...current, uploadedDocuments: updatedDocs });
    return of(void 0);
  }

  checkConsent(subjectId: string): Observable<ConsentRecord | null> {
    const current = this.state.value;
    return of(current.consentGiven ? { consentGiven: true, subjectId, userId: 'system' } : null);
  }

  setConsentGiven(given: boolean): void {
    const current = this.state.value;
    this.state.next({ ...current, consentGiven: given });
  }

  recordConsent(subjectId: string, userId: string): Observable<ConsentRecord> {
    const current = this.state.value;
    this.state.next({ ...current, consentGiven: true });
    return of({ consentGiven: true, subjectId, userId });
  }
}
