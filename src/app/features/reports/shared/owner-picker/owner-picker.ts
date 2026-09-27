import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportOwnerOption, ReportsService } from '../../../../core/services/reports.service';

/**
 * Chooses which document owner a per-owner report (compliance history, activity, certificate) is about.
 * The choice lives in the address (?owner=...), so moving between these reports keeps the same person.
 */
@Component({
  selector: 'app-owner-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="op">
      <label class="op__label" for="report-owner">Document owner</label>
      @if (loading()) {
        <span class="op__note">Loading owners…</span>
      } @else if (error()) {
        <span class="op__note op__note--error">{{ error() }}</span>
      } @else if (!owners().length) {
        <span class="op__note">There are no document owners yet.</span>
      } @else {
        <select id="report-owner" class="op__select" [ngModel]="selected()" (ngModelChange)="choose($event)">
          @for (owner of owners(); track owner.userId) {
            <option [value]="owner.userId">{{ owner.name }} · {{ owner.overallStatus }}</option>
          }
        </select>
      }
    </div>
  `,
  styles: [`
    .op {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      margin: 0 0 1.25rem;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
    }
    .op__label { font-size: 0.8rem; font-weight: 600; color: #334155; }
    .op__select {
      min-width: 260px;
      padding: 0.45rem 0.7rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.85rem;
    }
    .op__note { font-size: 0.82rem; color: #64748b; }
    .op__note--error { color: #b91c1c; }
    @media print { .op { display: none; } }
  `]
})
export class OwnerPickerComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Fires with the chosen owner once the list loads, and on every change. */
  @Output() readonly ownerChange = new EventEmitter<ReportOwnerOption>();

  readonly owners = signal<ReportOwnerOption[]>([]);
  readonly selected = signal<string>('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reports.getDocumentOwners().subscribe({
      next: owners => {
        this.owners.set(owners ?? []);
        this.loading.set(false);
        const requested = this.route.snapshot.queryParamMap.get('owner');
        const initial = this.owners().find(o => o.userId === requested) ?? this.owners()[0];
        if (initial) this.choose(initial.userId);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load the list of document owners.');
      },
    });
  }

  choose(userId: string): void {
    const owner = this.owners().find(o => o.userId === userId);
    if (!owner) return;
    this.selected.set(userId);
    this.router.navigate([], { queryParams: { owner: userId }, queryParamsHandling: 'merge', replaceUrl: true });
    this.ownerChange.emit(owner);
  }
}
