import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type HelpTopic = {
  id: string;
  title: string;
  keywords: string;
  roles: string[];
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
    { id: 'login-otp', title: 'Login and OTP verification', keywords: 'login password register institution access token verification', roles: ['Admin', 'Department Admin', 'Document Owner', 'Compliance Officer', 'Stakeholder', 'Super Admin'] },
    { id: 'dashboard', title: 'Dashboard', keywords: 'overview roles permissions compliance', roles: ['Admin', 'Department Admin', 'Document Owner', 'Compliance Officer', 'Stakeholder', 'Super Admin'] },
    { id: 'document-upload', title: 'Documents and Upload Document', keywords: 'documents upload files metadata registry manage', roles: ['Document Owner', 'Department Admin'] },
    { id: 'compliance-status', title: 'Compliance status', keywords: 'compliance FICA KYC required missing evidence', roles: ['Compliance Officer', 'Admin', 'Stakeholder', 'Super Admin'] },
    { id: 'reports', title: 'Reports', keywords: 'reports activity monthly ad hoc summaries', roles: ['Super Admin'] },
    { id: 'audit-log', title: 'Audit Log', keywords: 'audit security operations changes OTP activity', roles: ['Super Admin'] },
    { id: 'user-role-management', title: 'User Management and Roles Management', keywords: 'users roles permissions institutions departments administration', roles: ['Admin', 'Department Admin', 'Super Admin'] },
    { id: 'timer-settings', title: 'Timer Settings', keywords: 'timer expiry session OTP settings', roles: ['Super Admin'] },
    { id: 'institutions', title: 'Institutions', keywords: 'institutions records types add edit access links invite portal', roles: ['Admin', 'Department Admin', 'Super Admin'] },
    { id: 'department-requests', title: 'Department Requests', keywords: 'department requests route approve deny review owner', roles: ['Department Admin', 'Super Admin'] },
    { id: 'backup-restore', title: 'Backup and Restore', keywords: 'backup restore database snapshot system file history', roles: ['Super Admin'] },
    { id: 'document-validity', title: 'Document Type Validity', keywords: 'document type validity expiry warning months basis never expires re-evaluate', roles: ['Super Admin'] }
  ];

  readonly visibleTopics = computed(() => this.topics.filter(topic => this.canAccessTopic(topic)));

  ngOnInit(): void {
    this.route.fragment.subscribe((fragment) => {
      this.pendingFragment = fragment ?? null;
      if (this.pendingFragment && !this.isTopicAccessible(this.pendingFragment)) {
        this.pendingFragment = null;
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }
      this.scrollToPendingFragment();
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToPendingFragment();
  }

  private normalizeRole(role: string): string {
    return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private canAccessTopic(topic: HelpTopic): boolean {
    const allowedRoles = topic.roles.map(role => this.normalizeRole(role));
    const userRoles = this.auth.getUserRoles().map(role => this.normalizeRole(role));

    if (allowedRoles.some(role => userRoles.includes(role))) {
      return true;
    }

    return this.auth.isSuperAdmin() && allowedRoles.includes(this.normalizeRole('Super Admin'));
  }

  private isTopicAccessible(topicId: string): boolean {
    const topic = this.topics.find(item => item.id === topicId);
    return !!topic && this.canAccessTopic(topic);
  }

  private scrollToPendingFragment(): void {
    if (!this.pendingFragment) {
      return;
    }

    if (!this.isTopicAccessible(this.pendingFragment)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.pendingFragment = null;
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
    const topic = this.topics.find(item => item.id === topicId);
    if (!topic || !this.canAccessTopic(topic)) {
      return false;
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return true;

    return `${topic.title} ${topic.keywords}`.toLowerCase().includes(query);
  }

  searchHelp(): void {
    const query = this.searchText().trim();
    this.searchQuery.set(query);

    if (!query) return;

    const firstMatch = this.visibleTopics().find(topic => this.matchesTopic(topic.id));
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
