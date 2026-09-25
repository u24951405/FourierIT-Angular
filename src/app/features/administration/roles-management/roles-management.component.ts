import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiRoleDto, RolesManagementService, RolePermissionDto } from '../../../core/services/roles-management.service';

export interface Role { id: string; name: string; permissions: string[]; }

const PERMISSION_DISPLAY_NAMES: { [key: string]: string } = {
  'Documents.View': 'View Documents',
  'Documents.Upload': 'Upload Documents',
  'Documents.Manage': 'Manage Documents',
  'Compliance.View': 'View Compliance',
  'Compliance.Manage': 'Manage Compliance',
  'Users.Manage': 'Manage Users',
  'Roles.Manage': 'Manage Roles',
  'Reports.View': 'View Reports',
  'Audit.View': 'View Audit Log',
  'Backup.Manage': 'Manage Backups'
};

@Component({
  selector: 'app-roles-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.scss'
})
export class RolesManagementComponent {
  readonly auth = inject(AuthService);
  private fb    = inject(FormBuilder);
  private toast = inject(ToastService);
  private rolesService = inject(RolesManagementService);

  showModal    = signal(false);
  editId       = signal<string | null>(null);
  isSubmitting = signal(false);
  isLoading = signal(false);
  permissions = signal<string[]>([]);
  selectedPermissions = signal<string[]>([]);
  allPermissions = signal<RolePermissionDto[]>([]);
  isLoadingPermissions = signal(false);
  permissionsBeingToggled = signal<Set<number>>(new Set());

  form = this.fb.group({
    roleId:      ['', [Validators.required, Validators.maxLength(450)]],
    roleName:    ['', [Validators.required, Validators.maxLength(50)]],
  });

  roles = signal<Role[]>([]);

  constructor() {
    this.loadRoles();
  }

  openCreate(): void {
    this.form.reset({ roleId: '', roleName: '' });
    this.editId.set(null);
    this.selectedPermissions.set([]);
    this.allPermissions.set([]);
    this.showModal.set(true);
  }

  openEdit(role: Role): void {
    this.editId.set(role.id);
    this.form.patchValue({ roleId: role.id, roleName: role.name });
    this.form.controls.roleId.disable();
    this.isLoadingPermissions.set(true);
    this.showModal.set(true);

    // Try to load detailed permissions, but use basic list as fallback
    this.rolesService.getRoleWithPermissions(role.id).subscribe({
      next: (roleDetail) => {
        this.allPermissions.set(roleDetail.permissions);
        this.selectedPermissions.set(roleDetail.permissions.filter(p => p.isAssigned).map(p => p.permissionKey));
        this.isLoadingPermissions.set(false);
      },
      error: () => {
        // Fall back to basic permission list if detailed load fails
        this.selectedPermissions.set([...role.permissions]);
        this.isLoadingPermissions.set(false);
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.controls.roleId.enable();
    this.allPermissions.set([]);
    this.permissionsBeingToggled.set(new Set());
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const raw = this.form.getRawValue();
    const roleId = (raw.roleId ?? '').trim();
    const roleName = (raw.roleName ?? '').trim();
    const permissions = this.selectedPermissions();

    this.isSubmitting.set(true);
    const request$ = this.editId()
      ? this.rolesService.update(this.editId()!, { roleName, newRoleId: this.editId()!, permissions })
      : this.rolesService.create({ roleId, roleName, permissions });

    request$
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.show(this.editId() ? 'Role updated.' : 'Role created.', 'success');
          this.closeModal();
          this.loadRoles();
        },
        error: (error) => {
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to save role.';
          this.toast.show(message, 'error');
        }
      });
  }

  onDelete(id: string): void {
    this.rolesService.delete(id).subscribe({
      next: () => {
        this.roles.update(list => list.filter(r => r.id !== id));
        this.toast.show('Role deleted.', 'success');
      },
      error: (error) => {
        const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to delete role.';
        this.toast.show(message, 'error');
      }
    });
  }

  private loadRoles(): void {
    this.isLoading.set(true);
    const defaultPermissions = [
      'Documents.View', 'Documents.Upload', 'Documents.Manage',
      'Compliance.View', 'Compliance.Manage',
      'Users.Manage', 'Roles.Manage',
      'Reports.View', 'Audit.View', 'Backup.Manage'
    ];
    this.rolesService.getPermissions().subscribe({
      next: permissions => this.permissions.set(permissions ?? defaultPermissions),
      error: () => this.permissions.set(defaultPermissions)
    });
    this.rolesService.getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (roles) => {
          this.roles.set((roles ?? []).map((r: ApiRoleDto) => ({ id: r.roleId, name: r.roleName, permissions: r.permissions ?? [] })));
        },
        error: (error) => {
          this.roles.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load roles.';
          this.toast.show(message, 'error');
        }
      });
  }

  togglePermission(permissionId: number, permissionKey: string, isCurrentlyAssigned: boolean): void {
    // For create mode (no roleId), just toggle locally
    if (!this.editId()) {
      this.selectedPermissions.update(perms =>
        perms.includes(permissionKey)
          ? perms.filter(p => p !== permissionKey)
          : [...perms, permissionKey]
      );
      return;
    }

    // For edit mode, use API calls
    if (isCurrentlyAssigned) {
      this.removePermission(permissionId, permissionKey);
    } else {
      this.addPermission(permissionId, permissionKey);
    }
  }

  private addPermission(permissionId: number, permissionKey: string): void {
    const toggled = new Set(this.permissionsBeingToggled());
    toggled.add(permissionId);
    this.permissionsBeingToggled.set(toggled);

    const roleId = this.editId();
    if (!roleId) return;

    this.rolesService.addPermissionToRole(roleId, permissionId).subscribe({
      next: () => {
        this.selectedPermissions.update(perms => [...new Set([...perms, permissionKey])]);
        toggled.delete(permissionId);
        this.permissionsBeingToggled.set(new Set(toggled));
        this.toast.show(`Permission added`, 'success');
      },
      error: (error) => {
        toggled.delete(permissionId);
        this.permissionsBeingToggled.set(new Set(toggled));
        const message = error?.error?.error || error?.error?.message || 'Failed to add permission';
        this.toast.show(message, 'error');
      }
    });
  }

  private removePermission(permissionId: number, permissionKey: string): void {
    const toggled = new Set(this.permissionsBeingToggled());
    toggled.add(permissionId);
    this.permissionsBeingToggled.set(toggled);

    const roleId = this.editId();
    if (!roleId) return;

    this.rolesService.removePermissionFromRole(roleId, permissionId).subscribe({
      next: () => {
        this.selectedPermissions.update(perms => perms.filter(p => p !== permissionKey));
        toggled.delete(permissionId);
        this.permissionsBeingToggled.set(new Set(toggled));
        this.toast.show(`Permission removed`, 'success');
      },
      error: (error) => {
        toggled.delete(permissionId);
        this.permissionsBeingToggled.set(new Set(toggled));
        const message = error?.error?.error || error?.error?.message || 'Failed to remove permission';
        this.toast.show(message, 'error');
      }
    });
  }

  isPermissionBeingToggled(permissionId: number): boolean {
    return this.permissionsBeingToggled().has(permissionId);
  }

  hasPermission(permission: string): boolean {
    return this.selectedPermissions().includes(permission);
  }

  getPermissionDisplayName(permissionKey: string): string {
    return PERMISSION_DISPLAY_NAMES[permissionKey] || permissionKey;
  }
}
