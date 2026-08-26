import { Routes } from '@angular/router';

/**
 * Reports Routes
 * Base path: /reports
 *
 * Register in app.routes.ts:
 * {
 *   path: 'reports',
 *   loadChildren: () =>
 *     import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES),
 * }
 */
export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'super-admin',
    pathMatch: 'full',
  },
  {
    path: 'super-admin',
    loadComponent: () =>
      import('./super-admin-reports/super-admin-reports.component').then(m => m.SuperAdminReportsComponent),
  },
  {
    path: 'ad-hoc',
    loadComponent: () =>
      import('./ad-hoc/ad-hoc-report/ad-hoc-report').then(m => m.AdHocReportComponent),
  },
  {
    path: 'monthly',
    loadComponent: () =>
      import('./monthly/monthly-report/monthly-report').then(m => m.MonthlyReportComponent),
  },
  {
    path: 'ad-hoc-results/:id',
    loadComponent: () =>
      import('./ad-hoc/ad-hoc-results/ad-hoc-results').then(m => m.AdHocResultsComponent),
  },
  {
    path: 'compliance',
    loadComponent: () =>
      import('./compliance/compliance-report/compliance-report').then((m: any) => m.ComplianceReportComponent),
  },
  {
    path: 'compliance-certificate',
    loadComponent: () =>
      import('./compliance/compliance-certificate/compliance-certificate').then((m: any) => m.ComplianceCertificateComponent),
  },
  {
    path: 'activity',
    loadComponent: () =>
      import('./activity/activity-report/activity-report').then((m: any) => m.ActivityReportComponent),
  },
  {
    path: 'system-audit',
    loadComponent: () =>
      import('./system-audit/system-audit-report/system-audit-report').then((m: any) => m.SystemAuditReportComponent),
  },
  {
    path: 'client-risk-rating',
    loadComponent: () =>
      import('./client-risk-rating/client-risk-rating/client-risk-rating').then((m: any) => m.ClientRiskRatingComponent),
  },
];