import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiDepartmentDto, DepartmentService, SaveDepartmentPayload } from '../../../core/services/department.service';

// ERD: Department(DepartmentID, BranchID, DepartmentName)
// Branch(BranchID, InstitutionID, BranchName, City)
export interface Department {
  id: number;
  name: string;
  branchId: number;
  registeredBy: string;
  branch: string;
  userCount: number;
  docCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

@Component({
  selector: 'app-departments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './departments.component.html',
  styleUrl: './departments.component.scss'
})
export class DepartmentsComponent {
  private fb    = inject(FormBuilder);
  private toast = inject(ToastService);
  private router = inject(Router);
  private departmentService = inject(DepartmentService);
  readonly auth = inject(AuthService);

  showModal    = signal(false);
  editId       = signal<number | null>(null);
  isSubmitting = signal(false);
  isLoading = signal(false);
  isLoadingBranches = signal(false);
  search       = signal('');

  // ERD: Department(DepartmentName) + Branch(BranchName, City) + Institution link
  form = this.fb.group({
    departmentName: ['', Validators.required],
    branchId:       ['', Validators.required],
  });

  /** Branch options from API (ids match database). */
  branchOptions = signal<Array<{ id: string; name: string }>>([]);

  departments = signal<Department[]>([]);

  constructor() {
    this.loadBranchesThenDepartments();
  }

  get filtered() {
    const q = this.search().toLowerCase();
    return this.departments().filter(d =>
      d.name.toLowerCase().includes(q)
    );
  }

  openCreate(): void {
    this.form.reset({ departmentName: '', branchId: '' });
    this.editId.set(null);
    this.showModal.set(true);
  }

  openEdit(dept: Department): void {
    this.editId.set(dept.id);
    this.form.patchValue({
      departmentName: dept.name,
      branchId: String(dept.branchId)
    });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const branchId = Number(value.branchId);
    if (!branchId || Number.isNaN(branchId)) {
      this.toast.show('Please select a valid branch.', 'error');
      return;
    }

    const payload: SaveDepartmentPayload = {
      departmentName: (value.departmentName ?? '').trim(),
      branchId
    };

    this.isSubmitting.set(true);
    const request$ = this.editId()
      ? this.departmentService.update(this.editId()!, payload)
      : this.departmentService.create(payload);

    request$
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toast.show(this.editId() ? 'Department updated.' : 'Department registered.', 'success');
          this.showModal.set(false);
          this.loadDepartments();
        },
        error: (error) => {
          const body = error?.error;
          const message =
            (typeof body === 'string' ? body : null)
            ?? body?.error
            ?? body?.title
            ?? body?.message
            ?? 'Failed to save department.';
          this.toast.show(typeof message === 'string' ? message : 'Failed to save department.', 'error');
        }
      });
  }

  onDelete(id: number): void {
    this.departmentService.delete(id).subscribe({
      next: () => {
        this.departments.update(list => list.filter(d => d.id !== id));
        this.toast.show('Department deleted.', 'success');
      },
      error: (error) => {
        const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to delete department.';
        this.toast.show(message, 'error');
      }
    });
  }

  assignAdminToDepartment(department: Department): void {
    this.router.navigate(['/departments/admins'], { queryParams: { departmentId: department.id } });
  }

  private loadBranchesThenDepartments(): void {
    this.isLoadingBranches.set(true);
    this.departmentService.getBranches()
      .pipe(finalize(() => this.isLoadingBranches.set(false)))
      .subscribe({
        next: (rows) => {
          const opts = (rows ?? []).map(b => ({
            id: String(b.branchId),
            name: b.city ? `${b.branchName} — ${b.city}` : b.branchName
          }));
          this.branchOptions.set(opts);
          if (!opts.length) {
            this.toast.show('No branches in the database. Restart the API to seed default branches, or add branches first.', 'error');
          }
          this.loadDepartments();
        },
        error: (error) => {
          this.branchOptions.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load branches.';
          this.toast.show(message, 'error');
          this.loadDepartments();
        }
      });
  }

  private loadDepartments(): void {
    this.isLoading.set(true);

    const filterAndSet = (items: ApiDepartmentDto[] | null, departmentId?: number | null) => {
      let departments = (items ?? []).map(d => this.mapDepartment(d));
      if (this.auth.hasRole('Department Admin') && !this.auth.isSuperAdmin()) {
        departments = departments.filter(d => d.id === departmentId);
      }
      this.departments.set(departments);
    };

    if (this.auth.hasRole('Department Admin') && !this.auth.isSuperAdmin()) {
      this.auth.getCurrentAccount().subscribe({
        next: (account) => {
          const departmentId = account.departmentId ?? null;
          this.departmentService.getAll()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
              next: (items) => filterAndSet(items, departmentId),
              error: (error) => {
                this.departments.set([]);
                const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load departments.';
                this.toast.show(message, 'error');
              }
            });
        },
        error: () => {
          this.departments.set([]);
          this.toast.show('Could not determine your assigned department.', 'error');
          this.isLoading.set(false);
        }
      });
      return;
    }

    this.departmentService.getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.departments.set((items ?? []).map(d => this.mapDepartment(d)));
        },
        error: (error) => {
          this.departments.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load departments.';
          this.toast.show(message, 'error');
        }
      });
  }

  private mapDepartment(dto: ApiDepartmentDto): Department {
    const user = this.auth.currentUser();
    const branchLabel = this.branchOptions().find(b => Number(b.id) === dto.branchId)?.name ?? `Branch ${dto.branchId}`;
    return {
      id: dto.departmentId,
      name: dto.departmentName ?? '',
      branchId: dto.branchId,
      registeredBy: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || (user?.email ?? 'Current User'),
      branch: branchLabel,
      userCount: 0,
      docCount: 0,
      status: 'active',
      createdAt: dto.createdAt ? String(dto.createdAt).slice(0, 10) : ''
    };
  }
}