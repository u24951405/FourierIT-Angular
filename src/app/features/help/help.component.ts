import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css'
})
export class HelpComponent implements OnInit, AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
  readonly searchText = signal('');
  readonly searchQuery = signal('');
  private pendingFragment: string | null = null;

  private readonly topics = [
    { id: 'login-otp', title: 'Login and OTP verification', keywords: 'login password register institution access token verification' },
    { id: 'dashboard', title: 'Dashboard', keywords: 'overview roles permissions compliance' },
    { id: 'institution-requests', title: 'Institution Portal and Request Documents', keywords: 'institution request documents approved my requests portal' },
    { id: 'document-upload', title: 'Documents and Upload Document', keywords: 'documents upload files metadata registry manage' },
    { id: 'compliance-status', title: 'Compliance status', keywords: 'compliance FICA KYC required missing evidence' },
    { id: 'reports', title: 'Reports', keywords: 'reports activity monthly ad hoc summaries' },
    { id: 'audit-log', title: 'Audit Log', keywords: 'audit security operations changes OTP activity' },
    { id: 'user-role-management', title: 'User Management and Roles Management', keywords: 'users roles permissions institutions departments administration' },
    { id: 'timer-settings', title: 'System Settings', keywords: 'system settings timer expiry session OTP code link validity limits' }
  ];

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

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.pendingFragment = null;
  }

  matchesTopic(topicId: string): boolean {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return true;

    const topic = this.topics.find(item => item.id === topicId);
    return !!topic && `${topic.title} ${topic.keywords}`.toLowerCase().includes(query);
  }

  searchHelp(): void {
    const query = this.searchText().trim();
    this.searchQuery.set(query);

    if (!query) return;

    const firstMatch = this.topics.find(topic => this.matchesTopic(topic.id));
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
