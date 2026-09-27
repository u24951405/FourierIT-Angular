import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { ManagedUserDto, UserManagementService } from '../../../core/services/user-management.service';

export interface UserProfile {
  id: number;
  userId: string;
  profileId: number | null;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  jobTitle: string;
  entityTypeName: string;
  entityIdentificationNumber: string;
  departmentName: string;
  roleId: string;
  roleName: string;
  roles: string[];
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
  readonly verifyNowAmlPepUrl = 'https://www.verifynow.co.za/verifynow?reportType=check-aml-pep';
  readonly auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private roleService = inject(RoleService);
  private userManagementService = inject(UserManagementService);

  pageTitle = signal('User Management');
  managedRoleName = signal<string | null>(null);
  managedRoleNames = signal<string[] | null>(null);

  showModal = signal(false);
  /** The user whose role is being changed. */
  readonly roleUser = signal<UserProfile | null>(null);
  isLoadingUsers = signal(false);
  isLoadingRoles = signal(false);
  isSubmitting = signal(false);
  search = signal('');
  /** Role chosen in the filter chips; empty means every role. */
  readonly roleFilter = signal('');

  /** Roles present in the list, with how many users hold each (someone with two roles counts under both). */
  readonly roleOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const user of this.users()) {
      for (const role of this.rolesOf(user)) counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  });

  roles: Array<{ id: string; name: string }> = [];

  users = signal<UserProfile[]>([]);

  // Only the role can be changed here; people edit their own personal details from their profile.
  form = this.fb.group({
    role: ['', Validators.required],
  });

  constructor() {
    const data = this.route.snapshot.data as { managedRole?: string; managedRoles?: string[]; pageTitle?: string } | undefined;
    if (data?.pageTitle) {
      this.pageTitle.set(data.pageTitle);
    }
    if (data?.managedRole) {
      this.managedRoleName.set(data.managedRole);
    }
    if (Array.isArray(data?.managedRoles) && data?.managedRoles.length > 0) {
      this.managedRoleNames.set(data.managedRoles);
    }
    this.loadRoles();
  }

  get filtered() {
    const q = this.search().toLowerCase();
    const role = this.roleFilter().toLowerCase();
    return this.users().filter(user => {
      const roles = this.rolesOf(user);
      const matchesRole = !role || roles.some(r => r.toLowerCase() === role);
      const matchesSearch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(q)
        || user.email.toLowerCase().includes(q)
        || roles.some(r => r.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }

  /** Clicking the active chip again clears the filter. */
  toggleRoleFilter(role: string): void {
    this.roleFilter.set(this.roleFilter() === role ? '' : role);
  }

  rolesOf(user: UserProfile): string[] {
    const roles = user.roles?.length ? user.roles : [user.roleName];
    return roles.filter(role => !!role && role.trim().length > 0);
  }

  openPepScan(): void {
    window.open(this.verifyNowAmlPepUrl, '_blank', 'noopener,noreferrer');
  }

  openRoleChange(user: UserProfile): void {
    if (this.isSuperAdmin(user) || !user.userId) return;

    this.roleUser.set(user);
    this.form.reset({ role: this.rolesOf(user).length === 1 ? this.rolesOf(user)[0] : '' });
    this.showModal.set(true);
  }

  closeModal(): void {
    if (this.isSubmitting()) return;
    this.showModal.set(false);
    this.roleUser.set(null);
  }

  /** True when the chosen role is exactly what the user already has, so there is nothing to save. */
  roleUnchanged(): boolean {
    const user = this.roleUser();
    const chosen = this.form.value.role ?? '';
    const current = user ? this.rolesOf(user) : [];
    return current.length === 1 && current[0].toLowerCase() === chosen.toLowerCase();
  }

  onSubmit(): void {
    const user = this.roleUser();
    const role = this.form.value.role ?? '';
    if (!user || !role) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    if (this.roleUnchanged()) return;

    this.isSubmitting.set(true);
    this.userManagementService.changeRole(user.userId, role)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (result) => {
          this.toast.show(result?.message || `Role changed to ${role}.`, 'success');
          this.showModal.set(false);
          this.roleUser.set(null);
          this.loadUsers();
        },
        error: (error) => {
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Could not change the role.';
          this.toast.show(message, 'error');
        }
      });
  }

  onDelete(user: UserProfile): void {
    if (this.isSuperAdmin(user)) {
      return;
    }

    if (!user.userId) {
      this.toast.show('Unable to delete this user because the user identifier is missing.', 'error');
      return;
    }

    if (!confirm(`Delete user ${user.firstName} ${user.lastName}? This will remove the user and related records permanently.`)) {
      return;
    }

    this.userManagementService.deleteUser(user.profileId, user.userId).subscribe({
      next: () => {
        this.users.update(list => list.filter(item => item.userId !== user.userId));
        this.toast.show('User deleted.', 'success');
      },
      error: (error) => {
        const message = error?.error?.message || error?.error?.error || error?.error?.title || 'Failed to delete user.';
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
          this.cdr.markForCheck();
          this.loadUsers();
        },
        error: () => {
          this.roles = [];
          this.cdr.markForCheck();
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
          const allUsers = (users ?? []).map(user => this.mapUserToProfile(user));
          const managedRole = this.managedRoleName();
          const managedRoles = this.managedRoleNames();
          const filteredUsers = managedRoles?.length
            ? allUsers.filter(user => user.roles.some(role => managedRoles.some(m => role.toLowerCase() === m.toLowerCase())))
            : managedRole
              ? allUsers.filter(user => user.roleName.toLowerCase() === managedRole.toLowerCase())
              : allUsers;

          this.users.set(filteredUsers.filter(user => !this.isSuperAdmin(user)));
        },
        error: (error) => {
          this.users.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load users.';
          this.toast.show(message, 'error');
        }
      });
  }

  private mapUserToProfile(user: ManagedUserDto): UserProfile {
    const roles = (user.roles ?? (user as any).Roles ?? []) as string[];
    const roleName = roles.join(', ');
    const roleId = this.roles.find(r => r.name.toLowerCase() === roles[0]?.toLowerCase())?.id ?? '';
    const profileId = user.profileId ?? (user as any).ProfileId ?? null;
    const userId = user.id ?? (user as any).Id ?? '';
    const profile = user.profile ?? (user as any).Profile ?? null;
    return {
      id: profileId ?? 0,
      userId,
      profileId,
      userName: user.userName ?? (user as any).UserName ?? '',
      firstName: profile?.firstName ?? profile?.FirstName ?? '',
      lastName: profile?.lastName ?? profile?.LastName ?? '',
      email: user.email ?? (user as any).Email ?? '',
      phone: user.phoneNumber ?? (user as any).PhoneNumber ?? '',
      dateOfBirth: profile?.dateOfBirth ?? profile?.DateOfBirth ?? '',
      jobTitle: profile?.jobTitle ?? profile?.JobTitle ?? '',
      entityTypeName: user.entityTypeName ?? (user as any).EntityTypeName ?? 'Not specified',
      entityIdentificationNumber: user.entityIdentificationNumber ?? (user as any).EntityIdentificationNumber ?? '',
      departmentName: user.departmentName ?? (user as any).DepartmentName ?? 'Not assigned',
      roleId,
      roleName,
      roles,
      status: user.accountStatus ?? (user as any).AccountStatus ?? 'Active',
      createdAt: ''
    };
  }

  /**
   * Only the Super Admin (or an Admin) may change roles, matching the API. Checked positively:
   * hasRole() is true for every role when signed in as the Super Admin, so "not a Department Admin" would hide it from them.
   */
  get canChangeRoles(): boolean {
    return this.auth.isSuperAdmin() || this.auth.hasRole('Admin');
  }

  isSuperAdmin(user: UserProfile): boolean {
    return user.userName.trim().toLowerCase() === 'superadmin';
  }
}
