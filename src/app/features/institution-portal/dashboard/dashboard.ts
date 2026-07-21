import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InstitutionAuthService } from '../auth/institution-auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private institutionAuthService = inject(InstitutionAuthService);

  institutionName = 'Demo Institution';
  institutionCode = 'INST-001';
  authenticatedTime = '09:30';
  sessionExpiryLabel = '24 Jun 2026';
  loading = false;
  stats = {
    activeRequests: 2,
    approvedRequests: 5,
    expiredAccess: 1,
  };
  expiryNoticeCount = 1;
  showExpiryNotice = true;

  goToRequestDocuments(): void {}
  goToMyRequests(): void {}
  goToApprovedDocuments(): void {}
  goToRenew(): void {}

  signOut(): void {
    this.institutionAuthService.signOut();
  }
}
