import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type HelpTopic = {
  id: string;
  title: string;
  keywords: string;
};

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css'
})
export class HelpComponent implements OnInit, AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly searchText = signal('');
  readonly searchQuery = signal('');
  private pendingFragment: string | null = null;

  private readonly topics: HelpTopic[] = [
    { id: 'login-otp', title: 'Login and OTP verification', keywords: 'login password register institution access token verification' },
    { id: 'dashboard', title: 'Dashboard', keywords: 'overview roles permissions compliance' },
    { id: 'institution-requests', title: 'Institution Portal and Request Documents', keywords: 'institution request documents approved my requests portal' },
    { id: 'document-upload', title: 'Documents and Upload Document', keywords: 'documents upload files metadata registry manage' },
    { id: 'compliance-status', title: 'Compliance status', keywords: 'compliance FICA KYC required missing evidence' },
    { id: 'reports', title: 'Reports', keywords: 'reports activity monthly ad hoc summaries' },
    { id: 'audit-log', title: 'Audit Log', keywords: 'audit security operations changes OTP activity' },
    { id: 'user-role-management', title: 'User Management and Roles Management', keywords: 'users roles permissions institutions departments administration' },
    { id: 'timer-settings', title: 'System Settings', keywords: 'system settings timer expiry session OTP code link validity limits' },
    { id: 'institutions', title: 'Institutions', keywords: 'institutions records types add edit access links invite portal' },
    { id: 'department-requests', title: 'Department Requests', keywords: 'department requests route approve deny review owner' },
    { id: 'backup-restore', title: 'Backup and Restore', keywords: 'backup restore database snapshot system file history' },
    { id: 'document-validity', title: 'Document Type Validity', keywords: 'document type validity expiry warning months basis certification upload re-evaluate' }
  ];

  currentRoleLabel(): string {
    const roles = this.auth.getUserRoles();
    if (roles.length > 0) {
      return roles.join(', ');
    }

    return 'Guest';
  }

  getVisibleTopicIds(): string[] {
    return this.getVisibleTopics().map(topic => topic.id);
  }

  getVisibleTopics(): HelpTopic[] {
    return this.topics.filter(topic => this.isTopicVisible(topic.id));
  }

  private isTopicVisible(topicId: string): boolean {
    if (this.auth.isSuperAdmin()) {
      return true;
    }

    const isStakeholderViewer = this.auth.isStakeholderViewer();
    const canUploadDocuments = this.auth.hasRole('Document Owner') || this.auth.hasRole('Department Admin');
    const isDepartmentAdmin = this.auth.hasRole('Department Admin');
    const isDocumentOwner = this.auth.hasRole('Document Owner');
    const isComplianceOfficer = this.auth.hasRole('Compliance Officer');

    switch (topicId) {
      case 'login-otp':
      case 'dashboard':
        return true;
      case 'institution-requests':
        return !isDepartmentAdmin && !isDocumentOwner;
      case 'document-upload':
        return canUploadDocuments;
      case 'compliance-status':
        return !isStakeholderViewer;
      case 'reports':
      case 'audit-log':
      case 'timer-settings':
      case 'backup-restore':
      case 'document-validity':
        return false;
      case 'user-role-management':
        return isDepartmentAdmin || isComplianceOfficer;
      case 'institutions':
      case 'department-requests':
        return isDepartmentAdmin;
      default:
        return isDocumentOwner || isDepartmentAdmin || isComplianceOfficer || !isStakeholderViewer;
    }
  }

  ngOnInit(): void {
    this.route.fragment.subscribe((fragment) => {
      this.pendingFragment = fragment ?? null;
      this.scrollToPendingFragment();
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToPendingFragment();
  }

  private scrollToPendingFragment(): void {
    if (!this.pendingFragment) {
      return;
    }

    const target = document.getElementById(this.pendingFragment);
    if (!target) {
      return;
    }

    target.classList.add('help-section--highlighted');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.setTimeout(() => {
      target.classList.remove('help-section--highlighted');
    }, 3000);

    this.pendingFragment = null;
  }

  matchesTopic(topicId: string): boolean {
    if (!this.isTopicVisible(topicId)) {
      return false;
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return true;

    const topic = this.topics.find(item => item.id === topicId);
    return !!topic && `${topic.title} ${topic.keywords}`.toLowerCase().includes(query);
  }

  searchHelp(): void {
    const query = this.searchText().trim();
    this.searchQuery.set(query);

    if (!query) return;

    const firstMatch = this.getVisibleTopics().find(topic => this.matchesTopic(topic.id));
    if (firstMatch) {
      this.pendingFragment = firstMatch.id;
      this.scrollToPendingFragment();
    }
  }

  clearSearch(): void {
    this.searchText.set('');
    this.searchQuery.set('');
  }
}
