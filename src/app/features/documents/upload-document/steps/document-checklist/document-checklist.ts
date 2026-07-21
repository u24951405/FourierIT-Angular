import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DocumentUploadService } from '../../../../../core/services/document-upload.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  DocumentItem,
  DocumentCategory,
  EntityType,
  UploadPageState,
  Director,
  BeneficialOwner,
  UploadedDocument,
} from '../../../../../core/models/document-upload.models';

@Component({
  selector: 'app-document-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-checklist.html',
  styleUrls: ['./document-checklist.scss'],
})
export class DocumentChecklistComponent implements OnInit, OnDestroy {
  @Input() entityType!: EntityType;
  @Input() documentOwner!: string;
  @Output() changeEntityType = new EventEmitter<void>();

  private uploadService = inject(DocumentUploadService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  EntityType = EntityType;
  DocumentCategory = DocumentCategory;

  state!: UploadPageState;
  hoveredItemId: string | null = null;
  uploadingItemId: string | null = null;
  uploadError: { [itemId: string]: string } = {};

  // Date modal state
  showDateModal = false;
  pendingFile: File | null = null;
  pendingItem: DocumentItem | null = null;
  documentDateInput = '';
  documentDateError = '';

  // Director / UBO input state
  newDirectorName = '';
  newOwnerName = '';
  newOwnerPercentage: number | null = null;
  directorInputOpen = false;
  ownerInputOpen = false;

  get todayString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get kycItems(): DocumentItem[] {
    return this.uploadService.getTodoByCategory(DocumentCategory.KYC);
  }

  get ficaItems(): DocumentItem[] {
    return this.uploadService.getTodoByCategory(DocumentCategory.FICA);
  }

  get remainingCount(): number {
    return this.uploadService.getRemainingCount();
  }

  get isCompany(): boolean {
    return this.entityType === EntityType.COMPANY;
  }

  ngOnInit(): void {
    this.uploadService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => (this.state = s));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Declarations ───────────────────────────────────────────────────────────

  onForeignNationalChange(checked: boolean): void {
    this.uploadService.updateDeclaration({ isForeignNational: checked });
  }

  onNoAddressChange(checked: boolean): void {
    this.uploadService.updateDeclaration({ hasNoPersonalProofOfAddress: checked });
  }

  // Directors
  openDirectorInput(): void {
    this.directorInputOpen = true;
    this.newDirectorName = '';
  }

  addDirector(): void {
    if (!this.newDirectorName.trim()) return;
    const director: Director = {
      id: `dir_${Date.now()}`,
      name: this.newDirectorName.trim(),
    };
    this.uploadService.addDirector(director);
    this.newDirectorName = '';
    this.directorInputOpen = false;
  }

  removeDirector(id: string): void {
    this.uploadService.removeDirector(id);
  }

  // Beneficial Owners
  openOwnerInput(): void {
    this.ownerInputOpen = true;
    this.newOwnerName = '';
    this.newOwnerPercentage = null;
  }

  addOwner(): void {
    if (!this.newOwnerName.trim() || !this.newOwnerPercentage) return;
    const owner: BeneficialOwner = {
      id: `ubo_${Date.now()}`,
      name: this.newOwnerName.trim(),
      shareholdingPercentage: this.newOwnerPercentage,
    };
    this.uploadService.addBeneficialOwner(owner);
    this.newOwnerName = '';
    this.newOwnerPercentage = null;
    this.ownerInputOpen = false;
  }

  removeOwner(id: string): void {
    this.uploadService.removeBeneficialOwner(id);
  }

  // ─── Upload ─────────────────────────────────────────────────────────────────

  onUploadClick(item: DocumentItem, fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  onFileSelected(event: Event, item: DocumentItem): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = this.uploadService.validateFile(file);
    if (!validation.valid) {
      this.uploadError[item.id] = validation.error!;
      return;
    }

    if (item.dateSensitive) {
      // Show date confirmation modal before uploading
      this.pendingFile = file;
      this.pendingItem = item;
      this.documentDateInput = '';
      this.documentDateError = '';
      this.showDateModal = true;
    } else {
      this.performUpload(file, item);
    }
  }

  confirmDateAndUpload(): void {
    if (!this.pendingFile || !this.pendingItem) return;

    const date = new Date(this.documentDateInput);
    if (isNaN(date.getTime())) {
      this.documentDateError = 'Please enter a valid date.';
      return;
    }

    const validation = this.uploadService.validateDocumentDate(date);
    if (!validation.valid) {
      this.documentDateError = validation.error!;
      return;
    }

    this.showDateModal = false;
    this.performUpload(this.pendingFile, this.pendingItem, date);
    this.pendingFile = null;
    this.pendingItem = null;
  }

  cancelDateModal(): void {
    this.showDateModal = false;
    this.pendingFile = null;
    this.pendingItem = null;
  }

  private performUpload(file: File, item: DocumentItem, documentDate?: Date): void {
    if (!this.currentUser) return;
    this.uploadingItemId = item.id;
    delete this.uploadError[item.id];

    this.uploadService
      .uploadDocument(file, item, this.currentUser.id, this.documentOwner, documentDate)
      .subscribe({
        next: () => {
          this.uploadingItemId = null;
        },
        error: (err: Error) => {
          this.uploadingItemId = null;
          this.uploadError[item.id] = err.message || 'Upload failed. Please try again.';
        },
      });
  }

  onReUpload(uploaded: UploadedDocument, fileInput: HTMLInputElement): void {
    fileInput.value = '';
    fileInput.click();
  }

  onReUploadFileSelected(event: Event, uploaded: UploadedDocument): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.currentUser) return;

    this.uploadService.reUploadDocument(file, uploaded, this.currentUser.id).subscribe({
      error: (err: Error) => {
        console.error('Re-upload failed', err);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
