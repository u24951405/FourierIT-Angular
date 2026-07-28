import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '../../../core/services/audit-log';
import { AuditLog } from '../../../core/models/audit-log';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './audit-log.html',
  styleUrls: ['./audit-log.css']
})
export class AuditLogComponent implements OnInit {
  private auditLogService = inject(AuditLogService);

  auditLogs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  isLoading = false;
  errorMessage = '';

  // Filter States
  selectedUserId: string = 'ALL';
  selectedActionCode: string = 'ALL';
  searchQuery: string = '';
  sortField: 'timeStamp' | 'actionCode' | 'userId' = 'timeStamp';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Dropdown Option Lists
  userOptions: string[] = [];
  actionCodeOptions: string[] = [];

  // Pagination States
  currentPage = 1;
  pageSize = 25;
  private _totalRecords = 0;
  private nextPageCache: AuditLog[] | null = null;

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const filters: any = {
      userId: this.selectedUserId !== 'ALL' ? this.selectedUserId : undefined,
      actionCode: this.selectedActionCode !== 'ALL' ? this.selectedActionCode : undefined,
      page: this.currentPage,
      pageSize: this.pageSize,
      query: this.searchQuery?.trim() || undefined
    };

    this.auditLogService.getAuditLogs(filters).subscribe({
      next: (res) => {
        this.auditLogs = res.items.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
        this._totalRecords = res.totalCount;
        this.populateFilterDropdowns();
        this.filteredLogs = [...this.auditLogs];
        this.sortLogs();
        this.isLoading = false;
        // announce to screen readers (aria-live) implicitly via banner in template
        // Prefetch next page for smoother navigation
        this.prefetchNextPage();
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.errorMessage = 'Could not load audit logs at this time.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page on filter change
    this.loadAuditLogs();
  }

  // Debounced search
  private searchDebounceTimer: any;
  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadAuditLogs();
    }, 350);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  populateFilterDropdowns(): void {
    const users = new Set<string>();
    const actions = new Set<string>();

    this.auditLogs.forEach(log => {
      if (log.userId) users.add(log.userId);
      if (log.actionCode) actions.add(log.actionCode);
    });

    this.userOptions = Array.from(users).sort((a, b) => (a || '').localeCompare(b || ''));
    this.actionCodeOptions = Array.from(actions).sort((a, b) => (a || '').localeCompare(b || ''));
  }

  sortLogs(): void {
    this.filteredLogs = [...this.filteredLogs].sort((a, b) => {
      const aValue = (a[this.sortField] ?? '').toString().toLowerCase();
      const bValue = (b[this.sortField] ?? '').toString().toLowerCase();

      if (this.sortField === 'timeStamp') {
        const diff = new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime();
        return this.sortDirection === 'asc' ? diff : -diff;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  setSort(field: 'timeStamp' | 'actionCode' | 'userId'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  // --- Pagination Logic ---
  get paginatedLogs(): AuditLog[] {
    // Server provides paged results already
    return this.filteredLogs;
  }

  get totalPages(): number {
    return Math.ceil((this._totalRecords || 0) / this.pageSize) || 1;
  }

  get totalRecords(): number {
    return this._totalRecords;
  }

  get pageRangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      if (this.nextPageCache) {
        this.currentPage++;
        this.auditLogs = this.nextPageCache;
        this.filteredLogs = [...this.auditLogs];
        this.sortLogs();
        this.nextPageCache = null;
        this.prefetchNextPage();
      } else {
        this.currentPage++;
        this.loadAuditLogs();
      }
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadAuditLogs();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadAuditLogs();
  }

  private prefetchNextPage(): void {
    if (this.currentPage >= this.totalPages) return;
    const filters: any = {
      userId: this.selectedUserId !== 'ALL' ? this.selectedUserId : undefined,
      actionCode: this.selectedActionCode !== 'ALL' ? this.selectedActionCode : undefined,
      page: this.currentPage + 1,
      pageSize: this.pageSize,
      query: this.searchQuery?.trim() || undefined
    };

    this.auditLogService.getAuditLogs(filters).subscribe({
      next: (res) => {
        this.nextPageCache = res.items.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
      },
      error: () => {
        this.nextPageCache = null;
      }
    });
  }

  // --- CSV Export Logic ---
  exportToCsv(): void {
    if (!this.filteredLogs.length) return;

    const headers = ['TimeStamp', 'AuditID', 'UserID', 'ActionCode', 'Details', 'TableAffected', 'RecordID'];
    const rows = this.filteredLogs.map(log => [
      `"${log.timeStamp}"`,
      log.auditLogId,
      `"${log.userId || ''}"`,
      `"${log.actionCode || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      `"${log.tableAffected || ''}"`,
      log.recordID || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}