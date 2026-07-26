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
  pageSize = 10;

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => {
        this.auditLogs = data.sort((a, b) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime());
        this.populateFilterDropdowns();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.errorMessage = 'Could not load audit logs at this time.';
        this.isLoading = false;
      }
    });
  }

  populateFilterDropdowns(): void {
    const users = new Set<string>();
    const actions = new Set<string>();

    this.auditLogs.forEach(log => {
      if (log.userId) users.add(log.userId);
      if (log.actionCode) actions.add(log.actionCode);
    });

    this.userOptions = Array.from(users);
    this.actionCodeOptions = Array.from(actions);
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page on filter change
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredLogs = this.auditLogs.filter(log => {
      const matchUser = this.selectedUserId === 'ALL' || log.userId === this.selectedUserId;
      const matchAction = this.selectedActionCode === 'ALL' || log.actionCode === this.selectedActionCode;
      const matchSearch = !query || [
        log.userId,
        log.actionCode,
        log.description,
        log.tableAffected,
        log.recordID?.toString() ?? ''
      ].some(value => value?.toString().toLowerCase().includes(query));
      return matchUser && matchAction && matchSearch;
    });
    this.sortLogs();
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
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize) || 1;
  }

  get totalRecords(): number {
    return this.filteredLogs.length;
  }

  get pageRangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
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