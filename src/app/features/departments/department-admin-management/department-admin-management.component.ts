import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ApiDepartmentDto,
  DepartmentAdminDto,
  DepartmentService,
  DepartmentRequiredDocumentDto,
  UnassignedDepartmentAdminDto
} from '../../../core/services/department.service';

interface Department {
  id: number;
  name: string;
  branch: string;
  createdAt: string;
}

@Component({
  selector: 'app-department-admin-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './department-admin-management.component.html',
  styleUrl: './department-admin-management.component.scss'
})
export class DepartmentAdminManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly departmentService = inject(DepartmentService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  isLoading = signal(false);
  isSubmitting = signal(false);
  departments = signal<Department[]>([]);
  selectedDepartmentId = signal<number | null>(null);
  selectedDepartmentAdmin = signal<DepartmentAdminDto | null>(null);
  selectedDepartmentDocs = signal<DepartmentRequiredDocumentDto[]>([]);
  unassignedAdmins = signal<UnassignedDepartmentAdminDto[]>([]);
  unassignedAdminsError = signal<string | null>(null);
  assignmentForm = this.fb.group({
    userId: ['', Validators.required]
  });
  search = signal('');

  ngOnInit(): void {
    const rawDepartmentId = this.route.snapshot.queryParamMap.get('departmentId');
    const departmentId = rawDepartmentId ? Number(rawDepartmentId) : null;
    this.loadDepartments(departmentId);
    this.loadUnassignedAdmins();
  }

  get filteredDepartments(): Department[] {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.departments();
    return this.departments().filter(d => d.name.toLowerCase().includes(q) || d.branch.toLowerCase().includes(q));
  }

  selectDepartment(departmentId: number): void {
    if (this.selectedDepartmentId() === departmentId) return;
    this.selectedDepartmentId.set(departmentId);
    this.selectedDepartmentAdmin.set(null);
    this.selectedDepartmentDocs.set([]);
    this.assignmentForm.reset({ userId: '' });
    this.loadDepartmentAdminDetails(departmentId);
    this.loadUnassignedAdmins();
  }

  assignAdmin(): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) {
      this.toast.show('Select a department first.', 'error');
      return;
    }

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const userId = String(this.assignmentForm.controls.userId.value ?? '').trim();
    if (!userId) {
      this.toast.show('Please select an unassigned Department Admin.', 'error');
      return;
    }

    if (!this.isUnassignedAdmin(userId)) {
      this.toast.show('The selected Department Admin is not available.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.departmentService.assignDepartmentAdmin(departmentId, { userId })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.selectedDepartmentAdmin.set(response.admin);
          this.toast.show('Department admin assigned.', 'success');
          this.loadDepartmentAdminDetails(departmentId);
          this.loadUnassignedAdmins();
          this.assignmentForm.reset({ userId: '' });
        },
        error: (error) => {
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to assign department admin.';
          this.toast.show(message, 'error');
        }
      });
  }

  removeAdmin(): void {
    const departmentId = this.selectedDepartmentId();
    if (!departmentId) return;

    this.isSubmitting.set(true);
    this.departmentService.removeDepartmentAdmin(departmentId)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.selectedDepartmentAdmin.set(null);
          this.selectedDepartmentDocs.set([]);
          this.toast.show('Department admin removed.', 'success');
        },
        error: (error) => {
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to remove department admin.';
          this.toast.show(message, 'error');
        }
      });
  }

  private loadDepartments(defaultDepartmentId?: number | null): void {
    this.isLoading.set(true);
    this.departmentService.getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (items) => {
          const mapped = (items ?? []).map(d => this.mapDepartment(d));
          this.departments.set(mapped);
          if (defaultDepartmentId && mapped.some(d => d.id === defaultDepartmentId)) {
            this.selectDepartment(defaultDepartmentId);
          }
        },
        error: (error) => {
          this.departments.set([]);
          const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load departments.';
          this.toast.show(message, 'error');
        }
      });
  }

  private loadDepartmentAdminDetails(departmentId: number): void {
    this.departmentService.getDepartmentAdmin(departmentId).subscribe({
      next: (response) => {
        this.selectedDepartmentAdmin.set(response.admin ?? null);
        this.selectedDepartmentDocs.set([]);
        if (response.admin) {
          this.loadRequiredDocuments(departmentId);
        }
      },
      error: () => {
        this.selectedDepartmentAdmin.set(null);
        this.selectedDepartmentDocs.set([]);
      }
    });
  }

  private loadUnassignedAdmins(): void {
    this.unassignedAdminsError.set(null);
    this.departmentService.getUnassignedDepartmentAdmins().subscribe({
      next: (admins) => {
        this.unassignedAdmins.set(admins ?? []);
      },
      error: (error) => {
        this.unassignedAdmins.set([]);
        const message = error?.error?.error || error?.error?.title || error?.error?.message || 'Failed to load unassigned Department Admins.';
        this.unassignedAdminsError.set(message);
      }
    });
  }

  private loadRequiredDocuments(departmentId: number): void {
    this.departmentService.getRequiredDocuments(departmentId).subscribe({
      next: (docs) => this.selectedDepartmentDocs.set(docs ?? []),
      error: () => this.selectedDepartmentDocs.set([])
    });
  }

  private isUnassignedAdmin(userId: string): boolean {
    return this.unassignedAdmins().some(admin => admin.userId === userId && !admin.departmentId);
  }

  private mapDepartment(dto: ApiDepartmentDto): Department {
    return {
      id: dto.departmentId,
      name: dto.departmentName ?? '',
      branch: String(dto.branchId),
      createdAt: dto.createdAt ? String(dto.createdAt).slice(0, 10) : ''
    };
  }
}
