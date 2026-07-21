import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

enum RequestPurpose {
  KYC = 'KYC',
  FICA = 'FICA',
}

enum DocumentCategory {
  KYC = 'KYC',
  FICA = 'FICA',
}

@Component({
  selector: 'app-request-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './request-documents.html',
  styleUrl: './request-documents.css',
})
export class RequestDocuments {
  private router = inject(Router);

  institutionName = 'Demo Institution';
  currentStep = 1;
  purposes = Object.values(RequestPurpose);
  categories = Object.values(DocumentCategory);
  PURPOSE_LABELS: Record<RequestPurpose, string> = {
    [RequestPurpose.KYC]: 'KYC Purpose',
    [RequestPurpose.FICA]: 'FICA Purpose',
  };
  CATEGORY_LABELS: Record<DocumentCategory, string> = {
    [DocumentCategory.KYC]: 'KYC Documents',
    [DocumentCategory.FICA]: 'FICA Documents',
  };
  wizard = {
    purpose: null as RequestPurpose | null,
    category: null as DocumentCategory | null,
    selectedDocumentIds: [] as string[],
    submissionDeadline: '',
    referenceNumber: '',
    justification: '',
    submittedRequestId: null as string | null,
  };
  availableDocuments = [
    { documentId: 'doc-1', documentName: 'Identity Document' },
    { documentId: 'doc-2', documentName: 'Proof of Address' },
    { documentId: 'doc-3', documentName: 'Corporate Registration' },
  ];
  submitting = false;
  submitError: string | null = null;

  get selectedCount(): number {
    return this.wizard.selectedDocumentIds.length;
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
    return !!this.wizard.submissionDeadline && !!this.wizard.referenceNumber && !!this.wizard.justification;
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
    this.wizard.selectedDocumentIds = [];
  }

  getCategoryPreview(category: DocumentCategory): string[] {
    return this.availableDocuments.slice(0, 3).map((doc) => doc.documentName);
  }

  getCategoryMoreCount(category: DocumentCategory): number {
    return Math.max(0, this.availableDocuments.length - 3);
  }

  toggleDocument(docId: string): void {
    const ids = this.wizard.selectedDocumentIds;
    this.wizard.selectedDocumentIds = ids.includes(docId)
      ? ids.filter((id) => id !== docId)
      : [...ids, docId];
  }

  isDocSelected(docId: string): boolean {
    return this.wizard.selectedDocumentIds.includes(docId);
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

  submitRequest(): void {
    if (!this.canSubmit || this.submitting) return;
    this.submitting = true;
    this.submitError = null;

    setTimeout(() => {
      this.submitting = false;
      this.currentStep = 5;
      this.wizard.submittedRequestId = 'REQ-1001';
      this.wizard.submissionDeadline = this.wizard.submissionDeadline || this.todayString;
      this.wizard.referenceNumber = this.wizard.referenceNumber || 'DEMO-001';
      this.wizard.justification = this.wizard.justification || 'Demo request submitted.';
    }, 600);
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
