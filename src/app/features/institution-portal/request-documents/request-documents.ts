import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { InstitutionDocumentRequestPayload } from '../../../core/models/institution.models';

enum RequestPurpose {
  KYC = 'KYC',
  FICA = 'FICA',
}

enum DocumentCategory {
  KYC = 'KYC',
  FICA = 'FICA',
}

type RequestType = 'Department' | 'Individual';

@Component({
  selector: 'app-request-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './request-documents.html',
  styleUrl: './request-documents.css',
})
export class RequestDocuments {
  private router = inject(Router);
  private authService = inject(InstitutionAuthService);
  private requestService = inject(DocumentAccessRequestService);

  institutionName = this.authService.institutionName();
  currentStep = 1;
  purposes = Object.values(RequestPurpose);
  categories = Object.values(DocumentCategory);
  requestTypes: RequestType[] = ['Department', 'Individual'];
  PURPOSE_LABELS: Record<RequestPurpose, string> = {
    [RequestPurpose.KYC]: 'KYC Purpose',
    [RequestPurpose.FICA]: 'FICA Purpose',
  };
  CATEGORY_LABELS: Record<DocumentCategory, string> = {
    [DocumentCategory.KYC]: 'KYC Documents',
    [DocumentCategory.FICA]: 'FICA Documents',
  };
  REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    Department: 'Department Request',
    Individual: 'Individual Request',
  };
  wizard = {
    purpose: null as RequestPurpose | null,
    category: null as DocumentCategory | null,
    requestType: null as RequestType | null,
    selectedDocumentTypeIds: [] as number[],
    targetDepartmentId: '',
    targetUserId: '',
    submissionDeadline: '',
    referenceNumber: '',
    justification: '',
    submittedRequestId: null as string | null,
  };
  availableDocuments = [
    { documentTypeId: 1, documentName: 'South African ID Book' },
    { documentTypeId: 7, documentName: 'Utility Bill' },
    { documentTypeId: 10, documentName: 'Bank Statement' },
    { documentTypeId: 11, documentName: 'Certificate of Incorporation' },
    { documentTypeId: 18, documentName: 'Director / Trustee ID' },
  ];
  submitting = false;
  submitError: string | null = null;

  get selectedCount(): number {
    return this.wizard.selectedDocumentTypeIds.length;
  }

  get canContinueStep1(): boolean {
    return this.wizard.purpose !== null;
  }

  get canContinueStep2(): boolean {
    return this.wizard.category !== null;
  }

  get canContinueStep3(): boolean {
    return this.selectedCount > 0;
  }

  get canSubmit(): boolean {
    if (!this.wizard.submissionDeadline || !this.wizard.referenceNumber || !this.wizard.justification) {
      return false;
    }

    if (!this.wizard.requestType) {
      return false;
    }

    if (this.wizard.requestType === 'Department') {
      return !!this.wizard.targetDepartmentId.trim();
    }

    return !!this.wizard.targetUserId.trim();
  }

  get todayString(): string {
    return this.formatDateInputValue(new Date());
  }

  formatDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get institutionId(): number | null {
    const id = this.authService.getInstitutionId();
    if (!id) {
      return null;
    }
    const parsed = Number(id);
    return Number.isInteger(parsed) ? parsed : null;
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
    } else {
      this.goToDashboard();
    }
  }

  nextStep(): void {
    if (this.currentStep < 5) {
      this.currentStep += 1;
    }
  }

  selectPurpose(purpose: RequestPurpose): void {
    this.wizard.purpose = purpose;
  }

  selectCategory(category: DocumentCategory): void {
    this.wizard.category = category;
    this.wizard.selectedDocumentTypeIds = [];
  }

  selectRequestType(type: RequestType): void {
    this.wizard.requestType = type;
    this.wizard.targetDepartmentId = '';
    this.wizard.targetUserId = '';
  }

  getCategoryPreview(category: DocumentCategory): string[] {
    return this.availableDocuments.slice(0, 3).map((doc) => doc.documentName);
  }

  getCategoryMoreCount(category: DocumentCategory): number {
    return Math.max(0, this.availableDocuments.length - 3);
  }

  toggleDocument(documentTypeId: number): void {
    const ids = this.wizard.selectedDocumentTypeIds;
    this.wizard.selectedDocumentTypeIds = ids.includes(documentTypeId)
      ? ids.filter((id) => id !== documentTypeId)
      : [...ids, documentTypeId];
  }

  isDocSelected(documentTypeId: number): boolean {
    return this.wizard.selectedDocumentTypeIds.includes(documentTypeId);
  }

  onDeadlineChange(value: string): void {
    this.wizard.submissionDeadline = value;
  }

  onRefChange(value: string): void {
    this.wizard.referenceNumber = value;
  }

  onJustificationChange(value: string): void {
    this.wizard.justification = value;
  }

  onTargetDepartmentChange(value: string): void {
    this.wizard.targetDepartmentId = value;
  }

  onTargetUserChange(value: string): void {
    this.wizard.targetUserId = value;
  }

  submitRequest(): void {
    if (!this.canSubmit || this.submitting) return;

    const institutionId = this.institutionId;
    if (!institutionId) {
      this.submitError = 'Unable to resolve the institution. Please refresh the portal and try again.';
      return;
    }

    const payload: InstitutionDocumentRequestPayload = {
      requestType: this.wizard.requestType!,
      purposeNote: this.wizard.justification.trim(),
      submissionDeadline: this.wizard.submissionDeadline || null,
      referenceNumber: this.wizard.referenceNumber.trim(),
      requestedDocuments: this.wizard.selectedDocumentTypeIds.map((documentTypeId) => ({
        documentTypeId,
        isMandatory: false,
      })),
    };

    if (this.wizard.requestType === 'Department') {
      const departmentId = Number(this.wizard.targetDepartmentId.trim());
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        this.submitError = 'Target department ID must be a valid number.';
        return;
      }
      payload.targetDepartmentId = departmentId;
    } else {
      payload.targetUserId = this.wizard.targetUserId.trim();
    }

    this.submitError = null;
    this.submitting = true;

    console.debug('Submitting institution document access request', { institutionId, payload });

    this.requestService
      .createRequest(institutionId, payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (response) => {
          console.debug('Document request created', response);
          this.wizard.submittedRequestId = response.enquiryRequestId?.toString() ?? null;
          this.currentStep = 5;
        },
        error: (err) => {
          console.error('Document request submission failed', {
            status: err?.status,
            statusText: err?.statusText,
            error: err?.error,
            message: err?.message,
            fullError: err
          });
          this.submitError = this.getRequestErrorMessage(err);
        },
      });
  }

  private getRequestErrorMessage(error: any): string {
    if (!error) {
      return 'An unknown error occurred while submitting the request.';
    }

    const serverError = error.error;
    if (serverError) {
      if (typeof serverError === 'string') {
        return serverError;
      }
      if (serverError.error) {
        return serverError.error;
      }
      if (serverError.message) {
        return serverError.message;
      }
    }

    if (error.status && error.statusText) {
      return `Request failed (${error.status} ${error.statusText}).`;
    }

    return 'Could not submit the request. Check your network connection and try again.';
  }

  copyRequestId(): void {
    if (this.wizard.submittedRequestId) {
      navigator.clipboard.writeText(this.wizard.submittedRequestId);
    }
  }

  goToMyRequests(): void {
    this.router.navigate(['/institution/my-requests']);
  }

  goToDashboard(): void {
    this.router.navigate(['/institution/dashboard']);
  }
}
