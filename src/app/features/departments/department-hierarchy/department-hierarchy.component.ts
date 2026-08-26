import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DepartmentHierarchyNode, DepartmentService } from '../../../core/services/department.service';

@Component({
  selector: 'app-department-hierarchy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './department-hierarchy.component.html',
  styleUrl: './department-hierarchy.component.css'
})
export class DepartmentHierarchyComponent {
  private readonly departmentService = inject(DepartmentService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly hierarchy = signal<DepartmentHierarchyNode[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly branchOptions = signal<Array<{ id: number; name: string }>>([]);

  readonly flatOptions = computed(() => this.flattenTree(this.hierarchy()));

  readonly form = this.fb.group({
    departmentName: ['', Validators.required],
    branchId: [null as number | null, Validators.required],
    parentId: [null as number | null],
  });

  constructor() {
    this.loadBranches();
    this.loadHierarchy();
  }

  trackByNode = (_: number, node: DepartmentHierarchyNode): number => node.departmentId;

  addRootNode(): void {
    this.editingId.set(null);
    this.form.reset({ departmentName: '', branchId: null, parentId: null });
    this.success.set(null);
    this.error.set(null);
  }

  beginEdit(node: DepartmentHierarchyNode): void {
    this.editingId.set(node.departmentId);
    this.form.patchValue({
      departmentName: node.departmentName,
      branchId: node.branchId,
      parentId: node.parentId ?? null,
    });
    this.success.set(null);
    this.error.set(null);
  }

  beginAddChild(node: DepartmentHierarchyNode): void {
    this.editingId.set(null);
    this.form.reset({
      departmentName: '',
      branchId: node.branchId,
      parentId: node.departmentId,
    });
    this.success.set(null);
    this.error.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { departmentName, branchId, parentId } = this.form.getRawValue();
    const payload = {
      departmentName: (departmentName ?? '').trim(),
      branchId: Number(branchId),
      parentId: parentId == null || parentId === 0 ? null : Number(parentId),
    };

    if (!payload.departmentName) {
      this.error.set('Department name is required.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const request$ = this.editingId() !== null
      ? this.departmentService.updateHierarchyNode(this.editingId()!, payload)
      : this.departmentService.createHierarchyNode(payload);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.success.set(this.editingId() !== null ? 'Department updated.' : 'Department added.');
          this.form.reset({ departmentName: '', branchId: null, parentId: null });
          this.editingId.set(null);
          this.loadHierarchy();
        },
        error: (response) => {
          const message = response?.error?.error || response?.error?.message || 'Unable to save department.';
          this.error.set(message);
        }
      });
  }

  deleteNode(node: DepartmentHierarchyNode): void {
    if (node.children.length > 0) {
      this.error.set('This node still has child departments and cannot be deleted.');
      return;
    }

    this.error.set(null);
    this.success.set(null);

    this.departmentService.deleteHierarchyNode(node.departmentId).subscribe({
      next: () => {
        this.success.set(`Deleted "${node.departmentName}".`);
        this.loadHierarchy();
      },
      error: (response) => {
        const message = response?.error?.error || response?.error?.message || 'Unable to delete department.';
        this.error.set(message);
      }
    });
  }

  private loadBranches(): void {
    this.departmentService.getBranches().subscribe({
      next: (branches) => {
        this.branchOptions.set(branches.map((branch) => ({
          id: branch.branchId,
          name: branch.city ? `${branch.branchName} — ${branch.city}` : branch.branchName,
        })));
      },
      error: () => this.branchOptions.set([]),
    });
  }

  private loadHierarchy(): void {
    this.loading.set(true);
    this.departmentService.getHierarchy().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (nodes) => this.hierarchy.set(nodes ?? []),
      error: () => this.error.set('Unable to load department hierarchy.'),
    });
  }

  private flattenTree(nodes: DepartmentHierarchyNode[], prefix: string[] = []): Array<{ id: number; label: string }> {
    const items: Array<{ id: number; label: string }> = [];

    nodes.forEach((node) => {
      const path = [...prefix, node.departmentName];
      items.push({
        id: node.departmentId,
        label: path.join(' / '),
      });
      if (node.children?.length) {
        items.push(...this.flattenTree(node.children, path));
      }
    });

    return items;
  }
}
