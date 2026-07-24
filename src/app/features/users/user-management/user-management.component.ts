import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { ManagedUserDto, UpdateManagedUserPayload, UserManagementService } from '../../../core/services/user-management.service';
import {
  birthDateReasonable,
  formatIsoDateLocal,
  saMobilePhoneRequired
} from '../../../core/validators/profile.validators';

export interface UserProfile {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  jobTitle: string;
  roleId: string;
  roleName: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent {
  readonly auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private roleService = inject(RoleService);
  private userManagementService = inject(UserManagementService);

  showModal = signal(false);
  editId = signal<number | null>(null);
  isLoadingUsers = signal(false);
  isLoadingRoles = signal(false);
  isSubmitting = signal(false);
  search = signal('');

  roles: Array<{ id: string; name: string }> = [];

  users = signal<UserProfile[]>([]);

  readonly maxBirthDate = formatIsoDateLocal(new Date());
  readonly minBirthDate = formatIsoDateLocal((() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  })());

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', saMobilePhoneRequired()],
    dateOfBirth: ['', [Validators.required, birthDateReasonable()]],
    jobTitle: ['', Validators.required],
    roleId: ['', Validators.required],
    status: ['Active'],
  });

  constructor() {
    this.loadRoles();
  }

  get filtered() {
    const q = this.search().toLowerCase();
    return this.users().filter(user =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.roleName.toLowerCase().includes(q)
    );
  }

  openEdit(user: UserProfile): void {
    if (this.isSuperAdmin(user)) {
      return;
    }

    this.editId.set(user.id);
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      jobTitle: user.jobTitle,
      roleId: user.roleId,
      status: user.status,
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

    const value = this.form.value as {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      dateOfBirth: string | null;
      jobTitle: string | null;
      roleId: string | null;
      status: string | null;
    };

    if (!this.editId()) {
      this.toast.show('User creation is only available via registration.', 'error');
      return;
    }

    const selectedRoleName = this.roles.find(r => r.id === value.roleId)?.name;
    if (!selectedRoleName) {
      this.toast.show('Please select a valid role.', 'error');
      return;
    }

    const payload: UpdateManagedUserPayload = {
      firstName: (value.firstName ?? '').trim(),
      lastName: (value.lastName ?? '').trim(),
      dateOfBirth: value.dateOfBirth ?? '',
      phoneNumber: (value.phone ?? '').trim(),
      jobTitle: (value.jobTitle ?? '').trim(),
      emailAddress: (value.email ?? '').trim(),
      role: selectedRoleName,
      accountStatus: (value.status ?? 'Active').trim()
    };

    this.isSubmitting.set(true);
    this.userManagementService.updateUser(this.editId()!, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.show('User updated.', 'success');
          this.showModal.set(false);
          this.loadUsers();
        },
        error: (error) => {
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to update user.';
          this.toast.show(message, 'error');
        }
      });
  }

  onDelete(user: UserProfile): void {
    if (this.isSuperAdmin(user)) {
      return;
    }

    this.userManagementService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(item => item.id !== user.id));
        this.toast.show('User deleted.', 'success');
      },
      error: (error) => {
        const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to delete user.';
        this.toast.show(message, 'error');
      }
    });
  }

  private loadRoles(): void {
    this.isLoadingRoles.set(true);
    this.roleService.getRoles()
      .pipe(finalize(() => this.isLoadingRoles.set(false)))
      .subscribe({
        next: (roles) => {
          this.roles = (roles ?? []).map(role => ({ id: role.roleId, name: role.roleName }));
          this.loadUsers();
        },
        error: () => {
          this.roles = [];
          this.toast.show('Failed to load roles.', 'error');
        }
      });
  }

  private loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.userManagementService.getAllUsers()
      .pipe(finalize(() => this.isLoadingUsers.set(false)))
      .subscribe({
        next: (users) => {
          this.users.set(
            (users ?? [])
              .map(user => this.mapUserToProfile(user))
              .filter(user => !this.isSuperAdmin(user))
          );
        },
        error: (error) => {
          this.users.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load users.';
          this.toast.show(message, 'error');
        }
      });
  }

  private mapUserToProfile(user: ManagedUserDto): UserProfile {
    const roleName = user.roles?.[0] ?? '';
    const roleId = this.roles.find(r => r.name.toLowerCase() === roleName.toLowerCase())?.id ?? '';
    return {
      id: user.profileId ?? 0,
      userName: user.userName ?? '',
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      email: user.email ?? '',
      phone: user.phoneNumber ?? '',
      dateOfBirth: user.profile?.dateOfBirth ?? '',
      jobTitle: user.profile?.jobTitle ?? '',
      roleId,
      roleName,
      status: user.accountStatus ?? 'Active',
      createdAt: ''
    };
  }

  isSuperAdmin(user: UserProfile): boolean {
    return user.userName.trim().toLowerCase() === 'superadmin';
  }
}
