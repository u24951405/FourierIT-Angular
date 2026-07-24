import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService, EntityTypeOption, RegisterPayload } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import {
  birthDateReasonable,
  formatIsoDateLocal,
  saMobilePhoneOptional
} from '../../../core/validators/profile.validators';

@Component({
  selector: 'app-register-user',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-user.component.html',
  styleUrl: './register-user.component.scss'
})
export class RegisterUserComponent implements OnInit {
  private readonly maxRoles = 2;
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  

  isSubmitting = signal(false);
  isLoadingRoles = signal(false);
  isVerifyingEntity = signal(false);
  entityVerificationStatus = signal<'idle'|'verifying'|'valid'|'invalid'>('idle');
  entityVerificationMessage = signal('');
  passwordPolicy = signal<import('../../../core/services/auth.service').PasswordPolicy | null>(null);
  // Local view helpers for live password feedback
  passwordValue = signal('');

  readonly maxBirthDate = formatIsoDateLocal(new Date());
  readonly minBirthDate = formatIsoDateLocal((() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  })());

  // From ERD: User(Email, Password_hash, mfa_enabled, IsPEPstatus, AccountStatus)
  // Profile(Address), SecurityQuestion
  form = this.fb.group({
    // User fields
    email: ['', [Validators.required, Validators.email]],
    username: ['', Validators.required],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    entityTypeId: [null as number | null, Validators.required],
    entityIdentificationNumber: ['', Validators.required],
    // Profile fields
    firstName:       ['', Validators.required],
    lastName:        ['', Validators.required],
    dateOfBirth: ['', [Validators.required, birthDateReasonable(), this.minAgeValidator(18)]],
    phone: ['', saMobilePhoneOptional()],
    jobTitle: ['', Validators.required],
    // Role assignment (UserRole table)
    roleIds: this.fb.nonNullable.control<string[]>([], [this.minSelectedRolesValidator(1), this.maxSelectedRolesValidator(this.maxRoles)]),
  });

  roles: Array<{ id: string; name: string }> = [];
  entityTypes: EntityTypeOption[] = [];
  private readonly defaultRoles: Array<{ id: string; name: string }> = [
    { id: 'DA', name: 'Department Admin' },
    { id: 'DO', name: 'Document Owner' },
    { id: 'SH', name: 'Stakeholder' }
  ];

  private readonly defaultEntityTypes: EntityTypeOption[] = [
    { entityTypeId: 1, name: 'South African Individual' },
    { entityTypeId: 2, name: 'Foreign National Individual' },
    { entityTypeId: 3, name: 'Company (Pty) Ltd' },
    { entityTypeId: 4, name: 'Trust' },
    { entityTypeId: 5, name: 'Partnership' },
    { entityTypeId: 6, name: 'Legal Entity - Other' }
  ];

  private isSelfSignupFlow(): boolean {
    return this.router.url.startsWith('/auth/register');
  }

  private navigateAfterRegisterOrCancel(): void {
    const target = this.isSelfSignupFlow() ? '/auth/login' : '/users/management';
    this.router.navigate([target]);
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadEntityTypes();

    // Default to Document Owner role for normal user registration
    this.form.patchValue({
      roleIds: ['DO']
    });

    // Load password policy from API
    this.auth.getPasswordPolicy().subscribe({
      next: (policy) => {
        this.passwordPolicy.set(policy as any);
        this.cdr.markForCheck();
      },
      error: () => {
        // If policy cannot be fetched, leave null so UI can fall back to server errors on submit
        this.passwordPolicy.set(null as any);
        this.cdr.markForCheck();
      }
    });

    this.form.controls.entityTypeId.valueChanges.subscribe(() => {
      this.resetEntityVerificationState();
    });

    this.form.controls.entityIdentificationNumber.valueChanges.subscribe(() => {
      this.resetEntityVerificationState();
    });

    // Track password changes for live rule evaluation
    this.form.controls.password.valueChanges.subscribe((v) => {
      this.passwordValue.set(v ?? '');
      this.cdr.markForCheck();
    });
    this.form.controls.confirmPassword.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  private resetEntityVerificationState(): void {
    this.entityVerificationStatus.set('idle');
    this.entityVerificationMessage.set('');
    this.cdr.markForCheck();
  }

  private loadRoles(): void {
    this.isLoadingRoles.set(true);
    this.roleService.getRoles()
      .pipe(finalize(() => this.isLoadingRoles.set(false)))
      .subscribe({
        next: (roles) => {
          const mappedRoles = (roles ?? []).map(role => ({
            id: role.roleId,
            name: role.roleName
          }));

          this.roles = mappedRoles.length > 0 ? mappedRoles : this.defaultRoles;
        },
        error: () => {
          this.roles = this.defaultRoles;
          this.toast.show('Could not load roles from API. Showing default roles.', 'error');
        }
      });
  }

  private loadEntityTypes(): void {
    this.auth.getEntityTypes().subscribe({
      next: (entityTypes) => {
        this.entityTypes = entityTypes?.length ? entityTypes : this.defaultEntityTypes;
      },
      error: () => {
        this.entityTypes = this.defaultEntityTypes;
      }
    });
  }

  verifyEntity(): void {
    if (this.form.controls.entityTypeId.invalid || this.form.controls.entityIdentificationNumber.invalid) {
      this.form.controls.entityTypeId.markAsTouched();
      this.form.controls.entityIdentificationNumber.markAsTouched();
      this.entityVerificationStatus.set('invalid');
      this.entityVerificationMessage.set('Please select an entity type and enter a valid identification number first.');
      this.cdr.markForCheck();
      return;
    }

    this.isVerifyingEntity.set(true);
    this.entityVerificationStatus.set('verifying');
    this.entityVerificationMessage.set('Verifying identification number...');

    const entityTypeId = this.form.controls.entityTypeId.value ?? 0;
    const verificationNumber = String(this.form.controls.entityIdentificationNumber.value ?? '').trim();

    this.form.controls.entityIdentificationNumber.setValue(verificationNumber, { emitEvent: false });

    this.auth.verifyEntity(entityTypeId, verificationNumber)
      .pipe(finalize(() => this.isVerifyingEntity.set(false)))
      .subscribe({
        next: (result) => {
          if (result.isValid) {
            this.entityVerificationStatus.set('valid');
            const fallbackNote = result.providerUnavailable
              ? ' Verified locally after the external provider became unavailable.'
              : '';
            this.entityVerificationMessage.set((result.message || 'Identification number verified successfully.') + fallbackNote);
          } else {
            this.entityVerificationStatus.set('invalid');
            this.entityVerificationMessage.set(result.message || 'Identification number could not be verified.');
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.entityVerificationStatus.set('invalid');
          this.entityVerificationMessage.set('Verification service is unavailable. Please try again later.');
          this.cdr.markForCheck();
        }
      });
  }

  get selectedEntityType(): EntityTypeOption | null {
    const entityTypeId = this.form.controls.entityTypeId.value;
    if (entityTypeId == null) return null;
    return this.entityTypes.find(type => type.entityTypeId === entityTypeId) ?? null;
  }

  get entityIdentificationLabel(): string {
    switch (this.selectedEntityType?.entityTypeId) {
      case 1: return 'South African ID Number';
      case 2: return 'Passport Number';
      case 3: return 'Company Registration Number';
      case 4: return 'Trust Registration Number';
      case 5: return 'Partnership Registration Number';
      case 6: return 'Entity Reference Number';
      default: return 'Identification Number';
    }
  }

  get entityIdentificationHint(): string {
    switch (this.selectedEntityType?.entityTypeId) {
      case 1: return 'Enter the 13-digit South African ID number.';
      case 2: return 'Enter the passport number used to verify the person.';
      case 3: return 'Enter the company registration number.';
      case 4: return 'Enter the trust registration number.';
      case 5: return 'Enter the partnership registration number.';
      case 6: return 'Enter the entity reference or registration number.';
      default: return 'Select an entity type first.';
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    if (this.entityVerificationStatus() !== 'valid') {
      this.entityVerificationStatus.set('invalid');
      this.entityVerificationMessage.set('Please verify the selected identification number before registering this user.');
      this.cdr.markForCheck();
      this.toast.show('Please verify the entity identification number before registering.', 'error');
      return;
    }
    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.toast.show('Passwords do not match.', 'error'); return;
    }

    const raw = this.form.getRawValue();
    const selectedRoleIds = (raw.roleIds ?? []) as string[];
    const selectedRoleNames = this.roles
      .filter(r => selectedRoleIds.includes(r.id))
      .map(r => r.name);

    if (selectedRoleNames.length === 0 || selectedRoleNames.length > this.maxRoles) {
      this.toast.show('Please select one or two valid roles.', 'error');
      return;
    }

    const hasStakeholder = selectedRoleNames.some(
      n => n.trim().toLowerCase() === this.stakeholderRoleName.toLowerCase()
    );
    if (hasStakeholder && selectedRoleNames.length > 1) {
      this.toast.show('Stakeholder cannot be combined with other roles.', 'error');
      return;
    }

    const payload: RegisterPayload = {
      firstName: (raw.firstName ?? '').trim(),
      lastName: (raw.lastName ?? '').trim(),
      dateOfBirth: raw.dateOfBirth ?? '',
      phoneNumber: (raw.phone ?? '').trim(),
      jobTitle: (raw.jobTitle ?? '').trim(),
      username: (raw.username ?? '').trim().toLowerCase(),
      emailAddress: (raw.email ?? '').trim(),
      password: raw.password ?? '',
      entityTypeId: raw.entityTypeId ?? 0,
      entityIdentificationNumber: (raw.entityIdentificationNumber ?? '').trim(),
      roles: selectedRoleNames
    };

    this.isSubmitting.set(true);
    this.auth.register(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('User registered successfully.', 'success');
          this.navigateAfterRegisterOrCancel();
        },
        error: (error) => {
          const body = error?.error;
          let message =
            (typeof body === 'string' ? body : null)
            ?? body?.error
            ?? body?.title
            ?? body?.detail
            ?? body?.message;
          // ASP.NET ModelState dictionary
          if (!message && body?.errors && typeof body.errors === 'object') {
            const firstKey = Object.keys(body.errors)[0];
            const arr = firstKey ? body.errors[firstKey] : null;
            if (Array.isArray(arr) && arr[0]) message = String(arr[0]);
          }
          // IdentityResult errors: [{ code, description }] or OData-style
          if (!message && Array.isArray(body)) {
            const first = body[0] as { description?: string; Description?: string } | undefined;
            const d = first?.description ?? first?.Description;
            if (d) message = String(d);
          }
          this.toast.show(message || 'Registration failed. Please try again.', 'error');
        }
      });
  }

  /** Stakeholder cannot be combined with other roles; enforced here and on the API. */
  private readonly stakeholderRoleName = 'Stakeholder';

  private findStakeholderRoleId(): string | undefined {
    return this.roles.find(
      r => r.name.trim().toLowerCase() === this.stakeholderRoleName.toLowerCase()
    )?.id;
  }

  toggleRoleSelection(roleId: string, checked: boolean): void {
    const current = [ ...((this.form.controls.roleIds.value ?? []) as string[]) ];
    const alreadySelected = current.includes(roleId);
    const roleMeta = this.roles.find(r => r.id === roleId);
    const isStakeholder =
      (roleMeta?.name ?? '').trim().toLowerCase() === this.stakeholderRoleName.toLowerCase();
    const stakeholderId = this.findStakeholderRoleId();

    if (checked && !alreadySelected) {
      if (isStakeholder) {
        const hadOthers = stakeholderId
          ? current.some(id => id !== stakeholderId)
          : current.length > 0;
        this.form.controls.roleIds.setValue([roleId]);
        this.form.controls.roleIds.markAsTouched();
        this.cdr.markForCheck();
        if (hadOthers) {
          this.toast.show('Stakeholder is exclusive; other roles were cleared.', 'success');
        }
        return;
      }

      let next = stakeholderId ? current.filter(id => id !== stakeholderId) : [ ...current ];
      if (next.length >= this.maxRoles) {
        this.toast.show('You can select a maximum of two roles.', 'error');
        return;
      }
      next.push(roleId);
      this.form.controls.roleIds.setValue(next);
      this.form.controls.roleIds.markAsTouched();
      this.cdr.markForCheck();
      return;
    }

    if (!checked && alreadySelected) {
      const idx = current.indexOf(roleId);
      current.splice(idx, 1);
      this.form.controls.roleIds.setValue(current);
      this.form.controls.roleIds.markAsTouched();
      this.cdr.markForCheck();
    }
  }

  selectedRoleCount(): number {
    return ((this.form.controls.roleIds.value ?? []) as string[]).length;
  }

  isRoleSelected(roleId: string): boolean {
    const selected = (this.form.controls.roleIds.value ?? []) as string[];
    return selected.includes(roleId);
  }

  private minSelectedRolesValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? []) as string[];
      return value.length >= min ? null : { minSelectedRoles: true };
    };
  }

  private maxSelectedRolesValidator(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? []) as string[];
      return value.length <= max ? null : { maxSelectedRoles: true };
    };
  }

  private minAgeValidator(minAgeYears: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (!v) return null; // required validator handles empties

      const dob = new Date(v);
      if (isNaN(dob.getTime())) return { birthDateInvalid: true };

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      return age >= minAgeYears ? null : { birthDateTooYoung: { requiredAge: minAgeYears, actualAge: age } };
    };
  }

  // Password rule helpers
  private getPassword(): string { return String(this.passwordValue() ?? ''); }

  passwordRequiresLength(): number {
    const p = this.passwordPolicy();
    return p?.requiredLength ?? 0;
  }

  passwordHasMinLength(): boolean {
    const policy = this.passwordPolicy();
    if (!policy) return this.getPassword().length >= 8; // sensible fallback
    return this.getPassword().length >= (policy.requiredLength ?? 8);
  }

  passwordHasDigit(): boolean {
    const policy = this.passwordPolicy();
    if (!policy) return /\d/.test(this.getPassword());
    return policy.requireDigit ? /\d/.test(this.getPassword()) : true;
  }

  passwordHasLowercase(): boolean {
    const policy = this.passwordPolicy();
    if (!policy) return /[a-z]/.test(this.getPassword());
    return policy.requireLowercase ? /[a-z]/.test(this.getPassword()) : true;
  }

  passwordHasUppercase(): boolean {
    const policy = this.passwordPolicy();
    if (!policy) return /[A-Z]/.test(this.getPassword());
    return policy.requireUppercase ? /[A-Z]/.test(this.getPassword()) : true;
  }

  passwordHasNonAlphanumeric(): boolean {
    const policy = this.passwordPolicy();
    if (!policy) return /[^A-Za-z0-9]/.test(this.getPassword());
    return policy.requireNonAlphanumeric ? /[^A-Za-z0-9]/.test(this.getPassword()) : true;
  }

  allPasswordRulesSatisfied(): boolean {
    const policy = this.passwordPolicy();
    // If no policy fetched, use conservative checks
    return this.passwordHasMinLength() && this.passwordHasDigit() && this.passwordHasLowercase() && this.passwordHasUppercase() && this.passwordHasNonAlphanumeric();
  }

  passwordsMatch(): boolean {
    return String(this.form.controls.password.value ?? '') === String(this.form.controls.confirmPassword.value ?? '');
  }

  cancel(): void { this.navigateAfterRegisterOrCancel(); }
}