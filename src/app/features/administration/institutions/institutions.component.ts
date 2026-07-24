import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  InstitutionDto,
  InstitutionService,
  InstitutionTypeOption
} from '../../../core/services/institution.service';

@Component({
  selector: 'app-institutions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './institutions.component.html',
  styleUrl: './institutions.component.scss'
})
export class InstitutionsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private institutionService = inject(InstitutionService);

  showModal = signal(false);
  editId = signal<number | null>(null);
  showInviteModal = signal(false);
  inviteInstitutionId = signal<number | null>(null);
  inviteInstitutionName = signal('');
  inviteLink = signal<string | null>(null);
  inviteExpiration = signal<string | null>(null);
  inviteSubmitting = signal(false);
  inviteError = signal('');
  inviteSuccess = signal('');
  isSubmitting = signal(false);
  isLoadingList = signal(false);
  isLoadingTypes = signal(false);
  search = signal('');

  institutionTypes = signal<InstitutionTypeOption[]>([]);
  institutions = signal<InstitutionDto[]>([]);

  form = this.fb.group({
    institutionName: ['', [Validators.required, Validators.maxLength(150)]],
    verifiedDomain: ['', [Validators.required, Validators.maxLength(255)]],
    regNumber: [null as number | null, [Validators.required, Validators.min(1)]],
    typeId: [null as number | null, Validators.required]
  });

  inviteForm = this.fb.group({
    institutionId: [null as number | null, Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.loadTypes();
    this.loadInstitutions();
  }

  get filtered(): InstitutionDto[] {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.institutions();
    return this.institutions().filter(
      i =>
        i.institutionName.toLowerCase().includes(q) ||
        i.verifiedDomain.toLowerCase().includes(q) ||
        String(i.regNumber).includes(q) ||
        (i.institutionTypeName ?? '').toLowerCase().includes(q)
    );
  }

  openCreate(): void {
    this.loadTypes();
    this.editId.set(null);
    this.form.reset({
      institutionName: '',
      verifiedDomain: '',
      regNumber: null,
      typeId: null
    });
    this.showModal.set(true);
  }

  openEdit(inst: InstitutionDto): void {
    this.loadTypes();
    this.editId.set(inst.institutionId);
    this.form.patchValue({
      institutionName: inst.institutionName,
      verifiedDomain: inst.verifiedDomain,
      regNumber: inst.regNumber,
      typeId: inst.typeId
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const v = this.form.getRawValue();
    const typeId = v.typeId;
    const regNumber = v.regNumber;
    if (typeId == null || regNumber == null) return;

    const payload = {
      institutionName: (v.institutionName ?? '').trim(),
      verifiedDomain: (v.verifiedDomain ?? '').trim(),
      regNumber,
      typeId
    };

    const id = this.editId();
    this.isSubmitting.set(true);

    const req$ =
      id != null
        ? this.institutionService.update(id, payload)
        : this.institutionService.create(payload);

    req$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: () => {
        this.toast.show(id != null ? 'Institution updated.' : 'Institution registered.', 'success');
        this.showModal.set(false);
        this.loadInstitutions();
      },
      error: err => {
        const body = err?.error;
        const message =
          body?.error ??
          body?.title ??
          body?.detail ??
          (typeof body === 'string' ? body : null) ??
          'Request failed.';
        this.toast.show(message, 'error');
      }
    });
  }

  onDelete(inst: InstitutionDto): void {
    if (!confirm(`Delete institution "${inst.institutionName}"? This cannot be undone.`)) return;

    this.institutionService.delete(inst.institutionId).subscribe({
      next: () => {
        this.institutions.update(list => list.filter(i => i.institutionId !== inst.institutionId));
        this.toast.show('Institution deleted.', 'success');
      },
      error: err => {
        const message =
          err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Failed to delete institution.';
        this.toast.show(message, 'error');
      }
    });
  }

  openInvite(inst?: InstitutionDto): void {
    this.inviteInstitutionId.set(inst?.institutionId ?? null);
    this.inviteInstitutionName.set(inst?.institutionName ?? '');
    this.inviteLink.set(null);
    this.inviteExpiration.set(null);
    this.inviteError.set('');
    this.inviteSuccess.set('');
    this.inviteForm.reset({
      institutionId: inst?.institutionId ?? null,
      email: ''
    });
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
    this.inviteSubmitting.set(false);
    this.inviteError.set('');
    this.inviteSuccess.set('');
  }

  openInviteLink(): void {
    const link = this.inviteLink();
    if (!link) return;
    window.open(link, '_blank', 'noopener');
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const institutionId = this.inviteForm.get('institutionId')?.value as number | null;
    const email = this.inviteForm.get('email')?.value?.trim();
    if (institutionId == null || !email) return;

    this.inviteSubmitting.set(true);

    this.institutionService.invite(institutionId, email).pipe(
      finalize(() => this.inviteSubmitting.set(false))
    ).subscribe({
      next: response => {
        const url = `${window.location.origin}/institution/auth/access?token=${response.accessToken}`;
        this.inviteLink.set(url);
        this.inviteExpiration.set(new Date(response.expiresAt).toLocaleString());
        this.inviteError.set('');
        this.inviteSuccess.set(`Invitation sent to ${response.maskedEmail}.`);
        this.toast.show(`Institution invite sent to ${response.maskedEmail}.`, 'success');
      },
      error: err => {
        const message =
          err?.error?.error ?? err?.error?.title ?? err?.error?.message ?? 'Failed to send invitation.';
        this.inviteError.set(message);
        this.inviteSuccess.set('');
        this.toast.show(message, 'error');
      }
    });
  }

  private loadInstitutions(): void {
    this.isLoadingList.set(true);
    this.institutionService
      .getAll()
      .pipe(finalize(() => this.isLoadingList.set(false)))
      .subscribe({
        next: rows => {
          this.institutions.set(rows ?? []);
          this.cdr.markForCheck();
        },
        error: err => {
          this.institutions.set([]);
          const message =
            err?.error?.title ?? err?.error?.message ?? 'Could not load institutions.';
          this.toast.show(message, 'error');
        }
      });
  }

  private loadTypes(): void {
    this.isLoadingTypes.set(true);
    this.institutionService
      .getTypes()
      .pipe(finalize(() => this.isLoadingTypes.set(false)))
      .subscribe({
        next: types => {
          this.institutionTypes.set(types ?? []);
          this.cdr.markForCheck();
        },
        error: () => {
          this.institutionTypes.set([]);
          this.toast.show('Could not load institution types.', 'error');
        }
      });
  }
}
