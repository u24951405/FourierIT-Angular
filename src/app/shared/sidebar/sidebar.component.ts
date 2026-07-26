import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AuthService,
  CurrentAccount,
  UpdateCurrentAccountPayload
} from '../../core/services/auth.service';
import { birthDateReasonable, formatIsoDateLocal, saMobilePhoneOptional } from '../../core/validators/profile.validators';

export interface NavItem {
  label: string;
  icon:  string;
  route?: string;
  children?: { label: string; route: string }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);
  private fb = inject(FormBuilder);
  openGroup = signal<string | null>(null);
  profileOpen = signal(false);
  accountDetails = signal<CurrentAccount | null>(null);
  loadingAccount = signal(false);
  accountError = signal<string | null>(null);
  editingProfile = signal(false);
  savingProfile = signal(false);
  profileSaveError = signal<string | null>(null);
  readonly maxBirthDate = formatIsoDateLocal(new Date());
  readonly minBirthDate = formatIsoDateLocal((() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  })());

  editForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    emailAddress: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', saMobilePhoneOptional()],
    jobTitle: [''],
    dateOfBirth: ['', birthDateReasonable()]
  });

  //these are the icons used in the sidebar, they are stored as svg strings and rendered using innerHTML in the template
  getIcon(name: string): string {
  const icons: Record<string, string> = {
    grid:     `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    file:     `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`,
    users:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>`,
    building: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    folder:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"/></svg>`,
  };
  return icons[name] ?? icons['file'];
}

  //side navigation bar items with icons and routes
  navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'grid',    route: '/dashboard' },
    { label: 'My Documents', icon: 'file',    route: '/my-documents' },
    { label: 'Departments', icon: 'building', children: [
        { label: 'All Departments', route: '/departments/all' },
        { label: 'Assign Department Admin', route: '/departments/admins' }
    ]},
    { label: 'User Management', icon: 'users', children: [
        { label: 'Department Admins', route: '/users/department-admins' },
        { label: 'Document Owners', route: '/users/document-owners' },
        { label: 'Stakeholders & Compliance', route: '/users/stakeholders-compliance' },
        { label: 'Register Department Admin', route: '/users/register-department-admin' },
        { label: 'Register Stakeholder or Compliance Officer', route: '/users/register-role-user' }
    ]},
    { label: 'Administration', icon: 'settings', children: [
        { label: 'Roles Management', route: '/administration/roles' },
        { label: 'Institutions',     route: '/administration/institutions' }
    ]},
    { label: 'Documents', icon: 'folder', children: [
        { label: 'All Documents',   route: '/documents/all' },
        { label: 'Upload Document', route: '/documents/upload' }
    ]},
  ];

  get visibleNavItems(): NavItem[] {
    if (this.auth.isDocumentOwnerOnly()) {
      return [
        { label: 'Dashboard', icon: 'file', route: '/dashboard/owner' },
        { label: 'Documents', icon: 'folder', children: [
          { label: 'Upload Document', route: '/documents/upload' }
        ]}
      ];
    }
    let items = this.navItems.filter(item =>
      item.label !== 'My Documents' || this.auth.canUploadDocuments()
    );

    if (!this.auth.isSuperAdmin()) {
      items = items.map(item => {
        if (item.label === 'Departments' && item.children) {
          return {
            ...item,
            children: item.children.filter(c => c.route !== '/departments/admins')
          };
        }

        if (item.label === 'User Management' && item.children) {
          return {
            ...item,
            children: item.children.filter(c => {
              if (c.route === '/users/department-admins') {
                return this.auth.hasRole('Department Admin') || this.auth.isSuperAdmin();
              }
              if (c.route === '/users/document-owners') {
                return this.auth.isSuperAdmin();
              }
              if (c.route === '/users/register-department-admin' || c.route === '/users/register-role-user') {
                return this.auth.isSuperAdmin();
              }
              return true;
            })
          };
        }

        return item;
      });
    }

    if (this.auth.hasRole('Department Admin') && !this.auth.isSuperAdmin()) {
      items = items.map(item => {
        if (item.label === 'Documents' && item.children) {
          return {
            ...item,
            children: item.children.filter(c => c.route !== '/documents/all')
          };
        }
        return item;
      });
    }

    if (this.auth.isStakeholderViewer() || !this.auth.canUploadDocuments()) {
      items = items.map(item => {
        if (item.label === 'Documents' && item.children) {
          return {
            ...item,
            children: item.children.filter(c => c.route !== '/documents/upload')
          };
        }
        return item;
      });
    }

    return items;
  }

  toggle(label: string): void {
    this.openGroup.update(v => v === label ? null : label);
  }

  logout(): void {
    this.profileOpen.set(false);
    this.editingProfile.set(false);
    this.accountDetails.set(null);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.profileOpen()) return;
    const t = event.target;
    if (t instanceof Node && !this.host.nativeElement.contains(t)) {
      this.profileOpen.set(false);
    }
  }

  toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    if (this.profileOpen()) {
      this.profileOpen.set(false);
      this.editingProfile.set(false);
      return;
    }
    this.profileOpen.set(true);
    this.loadAccount();
  }

  private loadAccount(): void {
    this.loadingAccount.set(true);
    this.accountError.set(null);
    this.auth.getCurrentAccount()
      .pipe(finalize(() => this.loadingAccount.set(false)))
      .subscribe({
        next: (data) => this.accountDetails.set(data),
        error: (err) => {
          this.accountDetails.set(null);
          const body = err?.error;
          const msg =
            (typeof body === 'string' ? body : null)
            ?? body?.error
            ?? body?.title
            ?? body?.message
            ?? (err?.message as string | undefined)
            ?? 'Could not load your profile.';
          this.accountError.set(typeof msg === 'string' ? msg : 'Could not load your profile.');
        }
      });
  }

  startEditProfile(): void {
    const account = this.accountDetails();
    if (!account) return;
    this.profileSaveError.set(null);
    this.editForm.reset({
      firstName: account.firstName ?? '',
      lastName: account.lastName ?? '',
      emailAddress: account.email ?? '',
      phoneNumber: this.displayPhone(account),
      jobTitle: account.jobTitle ?? '',
      dateOfBirth: this.toDateInputValue(account.dateOfBirth)
    });
    this.editingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.editingProfile.set(false);
    this.profileSaveError.set(null);
  }

  saveProfile(): void {
    const account = this.accountDetails();
    if (!account?.profileId) {
      this.profileSaveError.set('Could not update profile right now.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formValue = this.editForm.getRawValue();
    const payload: UpdateCurrentAccountPayload = {
      firstName: (formValue.firstName ?? '').trim(),
      lastName: (formValue.lastName ?? '').trim(),
      dateOfBirth: formValue.dateOfBirth || '',
      phoneNumber: (formValue.phoneNumber ?? '').trim(),
      jobTitle: (formValue.jobTitle ?? '').trim(),
      emailAddress: (formValue.emailAddress ?? '').trim(),
      role: account.roles[0] ?? '',
      accountStatus: account.accountStatus ?? 'Active'
    };

    this.savingProfile.set(true);
    this.profileSaveError.set(null);
    this.auth.updateCurrentAccount(account.profileId, payload)
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: () => {
          this.editingProfile.set(false);
          this.loadAccount();
        },
        error: (err) => {
          const body = err?.error;
          const msg =
            (typeof body === 'string' ? body : null)
            ?? body?.error
            ?? body?.title
            ?? body?.message
            ?? (err?.message as string | undefined)
            ?? 'Could not update your profile.';
          this.profileSaveError.set(typeof msg === 'string' ? msg : 'Could not update your profile.');
        }
      });
  }

  get userInitials(): string {
    const u = this.auth.currentUser();
    if (!u) return '—';
    const f = u.firstName?.trim()?.[0] ?? '';
    const l = u.lastName?.trim()?.[0] ?? '';
    if (f || l) return `${f}${l}`.toUpperCase();
    const e = u.email?.trim()?.[0];
    return e ? e.toUpperCase() : 'U';
  }

  get userName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}`.trim() || u.email || 'Signed in' : 'Signed in';
  }

  get userEmail(): string {
    return this.auth.currentUser()?.email?.trim() ?? '';
  }

  displayPhone(a: CurrentAccount): string {
    return (a.profilePhoneNumber || a.phoneNumber || '').trim();
  }

  profileFullName(a: CurrentAccount): string {
    return `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim();
  }

  private toDateInputValue(value: string | null): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}
