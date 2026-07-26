import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import {
  InstitutionDocumentRequestPayload,
  InstitutionRecipientDocumentType,
} from '../../../core/models/institution.models';

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
  submitting = false;
  requestTypes: RequestType[] = ['Department', 'Individual'];
  REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    Department: 'Company / Department',
    Individual: 'Individual',
  };
  wizard = {
    requestType: null as RequestType | null,
    selectedRecipientId: '',
    recipientName: '',
    selectedDocumentTypeIds: [] as number[],
    submissionDeadline: '',
    referenceNumber: '',
    justification: '',
    submittedRequestId: null as string | null,
  };
  departments: { departmentId: number; departmentName: string }[] = [];
  users: { userId: string; userName: string; displayName: string }[] = [];
  documentTypes: InstitutionRecipientDocumentType[] = [];
  loadingRecipients = false;
  loadingDocuments = false;
  recipientLoadError: string | null = null;
  documentLoadError: string | null = null;
  submitError: string | null = null;

  get selectedCount(): number {
    return this.wizard.selectedDocumentTypeIds.length;
  }

  showAllSelectedDocuments = false;

  get selectedDocumentNames(): string[] {
    return this.documentTypes
      .filter((doc) => this.wizard.selectedDocumentTypeIds.includes(doc.documentTypeId))
      .map((doc) => doc.typeName);
  }

  get visibleSelectedDocumentNames(): string[] {
    const names = this.selectedDocumentNames;
    return this.showAllSelectedDocuments || names.length <= 3 ? names : names.slice(0, 3);
  }

  get hasMoreSelectedDocuments(): boolean {
    return this.selectedDocumentNames.length > 3;
  }

  get canContinueStep1(): boolean {
    return !!this.wizard.requestType;
  }

  get canContinueStep2(): boolean {
    return !!this.wizard.selectedRecipientId;
  }

  get canContinueStep3(): boolean {
    return this.selectedCount > 0;
  }

  get canSubmit(): boolean {
    return (
      !!this.wizard.requestType &&
      !!this.wizard.selectedRecipientId &&
      this.selectedCount > 0 &&
      !!this.wizard.submissionDeadline &&
      !!this.wizard.referenceNumber &&
      !!this.wizard.justification
    );
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
    if (this.currentStep >= 4) {
      return;
    }

    if (this.currentStep === 1 && !this.canContinueStep1) {
      return;
    }

    if (this.currentStep === 2 && !this.canContinueStep2) {
      return;
    }

    if (this.currentStep === 3 && !this.canContinueStep3) {
      return;
    }

    this.currentStep += 1;

    if (this.currentStep === 2) {
      this.loadRecipients();
    }

    if (this.currentStep === 3) {
      this.loadDocumentTypes();
    }
  }

  private getPortalSessionToken(): string | null {
    const tokenFromService = this.authService.getSessionToken();
    if (tokenFromService) {
      return tokenFromService;
    }

    const raw = sessionStorage.getItem('institution_session');
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as { sessionToken?: string };
      return session?.sessionToken ?? null;
    } catch {
      return null;
    }
  }

  loadRecipients(): void {
    const token = this.getPortalSessionToken();
    if (!token || !this.wizard.requestType) {
      this.loadingRecipients = false;
      this.recipientLoadError = 'Unable to load recipients. Please refresh the portal or sign in again.';
      return;
    }

    this.loadingRecipients = true;
    this.recipientLoadError = null;
    this.departments = [];
    this.users = [];
    this.wizard.selectedRecipientId = '';
    this.wizard.recipientName = '';
    this.wizard.selectedDocumentTypeIds = [];
    this.documentTypes = [];

    if (this.wizard.requestType === 'Department') {
      this.requestService
        .getInstitutionDepartments(token)
        .pipe(finalize(() => (this.loadingRecipients = false)))
        .subscribe({
          next: (list) => (this.departments = list ?? []),
          error: () => {
            this.departments = [];
            this.recipientLoadError = 'Failed to load departments. Please try again.';
          },
        });
    } else {
      this.requestService
        .getInstitutionUsers(token)
        .pipe(finalize(() => (this.loadingRecipients = false)))
        .subscribe({
          next: (list) => (this.users = list ?? []),
          error: () => {
            this.users = [];
            this.recipientLoadError = 'Failed to load users. Please try again.';
          },
        });
    }
  }

  private loadDocumentTypes(): void {
    if (!this.wizard.selectedRecipientId || !this.wizard.requestType) {
      this.loadingDocuments = false;
      this.documentLoadError = 'Unable to load documents. Please refresh the portal or select a valid recipient.';
      return;
    }

    const token = this.getPortalSessionToken();
    if (!token) {
      this.loadingDocuments = false;
      this.documentLoadError = 'Unable to load documents. Please refresh the portal or sign in again.';
      return;
    }

    this.loadingDocuments = true;
    this.documentLoadError = null;
    this.documentTypes = [];
    this.wizard.selectedDocumentTypeIds = [];

    this.requestService
      .getInstitutionRecipientDocumentTypes(token, this.wizard.requestType, this.wizard.selectedRecipientId)
      .pipe(finalize(() => {
        this.loadingDocuments = false;
      }))
      .subscribe({
        next: (list) => {
          this.documentTypes = list ?? [];
        },
        error: () => {
          this.documentTypes = [];
          this.documentLoadError = 'Failed to load document types. Please try a different recipient.';
        },
      });
  }

  selectRequestType(type: RequestType): void {
    this.wizard.requestType = type;
    this.wizard.selectedRecipientId = '';
    this.wizard.recipientName = '';
    this.wizard.selectedDocumentTypeIds = [];
    this.documentTypes = [];
    this.showAllSelectedDocuments = false;
    this.recipientLoadError = null;
    this.documentLoadError = null;
  }

  toggleDocument(documentTypeId: number): void {
    const ids = this.wizard.selectedDocumentTypeIds;
    this.wizard.selectedDocumentTypeIds = ids.includes(documentTypeId)
      ? ids.filter((id) => id !== documentTypeId)
      : [...ids, documentTypeId];
  }

  toggleSelectedDocumentList(): void {
    this.showAllSelectedDocuments = !this.showAllSelectedDocuments;
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
    this.wizard.selectedRecipientId = value;
    const selectedDepartment = this.departments.find((d) => d.departmentId.toString() === value);
    this.wizard.recipientName = selectedDepartment?.departmentName || '';
  }

  onTargetUserChange(value: string): void {
    this.wizard.selectedRecipientId = value;
    const selectedUser = this.users.find((u) => u.userId === value);
    this.wizard.recipientName = selectedUser?.displayName || selectedUser?.userName || '';
  }

  submitRequest(): void {
    if (!this.canSubmit || this.submitting) return;

    const sessionToken = this.authService.getSessionToken();
    const institutionId = this.institutionId;

    // Allow submission when a valid session token exists (portal flow).
    if (!institutionId && !sessionToken) {
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
      const departmentId = Number(this.wizard.selectedRecipientId);
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        this.submitError = 'Target department ID must be a valid number.';
        return;
      }
      payload.targetDepartmentId = departmentId;
    } else {
      payload.targetUserId = this.wizard.selectedRecipientId;
    }

    this.submitError = null;
    this.submitting = true;

    console.debug('Submitting institution document access request', { institutionId, payload });

    const idForCall = institutionId ?? 0;

    this.requestService
      .createRequest(idForCall, payload)
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
