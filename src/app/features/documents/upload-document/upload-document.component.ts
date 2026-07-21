import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentUploadService } from '../../../core/services/document-upload.service';
import { EntityType } from '../../../core/models/document-upload.models';
import { DocumentChecklistComponent } from './steps/document-checklist/document-checklist';
import { PopiaConsentComponent } from './steps/popia-consent/popia-consent';
import { EntitySelectComponent } from './steps/entity-select/entity-select';
import { DocumentStatusPanelComponent } from './document-status-panel/document-status-panel';

@Component({
  selector: 'app-upload-document-page',
  standalone: true,
  imports: [CommonModule, PopiaConsentComponent, EntitySelectComponent, DocumentChecklistComponent, DocumentStatusPanelComponent],
  templateUrl: './upload-document.component.html',
  styleUrl: './upload-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadDocumentComponent implements OnInit {
  private auth = inject(AuthService);
  private uploadService = inject(DocumentUploadService);
  private router = inject(Router);

  EntityType = EntityType;

  step = signal(1);
  consentGiven = signal(false);
  selectedEntityType = signal<EntityType | null>(null);
  readonly documentOwner = this.getDocumentOwner();
  readonly currentUserId = this.getCurrentUserId();
  readonly subjectId = this.getSubjectId();
  readonly demoMode = !this.auth.isLoggedIn();

  ngOnInit(): void {
    this.uploadService.resetState();
    this.uploadService.getState().subscribe((state) => {
      this.consentGiven.set(state.consentGiven);
    });
  }

  onConsentConfirmed(): void {
    this.consentGiven.set(true);
    this.step.set(2);
  }

  onEntitySelected(type: EntityType): void {
    this.selectedEntityType.set(type);
    this.uploadService.setEntityType(type);
    this.step.set(3);
  }

  onProceedToReview(): void {
    this.step.set(4);
  }

  onSubmissionSuccess(): void {
    void this.router.navigate(['/my-documents']);
  }

  get selectedEntityLabel(): string {
    return this.selectedEntityType() === EntityType.COMPANY ? 'Department' : 'Document Owner';
  }

  get showChecklist(): boolean {
    return this.selectedEntityType() !== null && this.step() === 3;
  }

  get showStatusPanel(): boolean {
    return this.step() === 4;
  }

  private getCurrentUserId(): string {
    return this.auth.currentUser()?.id || 'unknown-subject';
  }

  private getSubjectId(): string {
    const user = this.auth.currentUser();
    return user?.id || user?.email || 'unknown-subject';
  }

  private getDocumentOwner(): string {
    const user = this.auth.currentUser();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.email || 'Unknown';
  }
}
