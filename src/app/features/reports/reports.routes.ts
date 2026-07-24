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
    redirectTo: 'ad-hoc',
    pathMatch: 'full',
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
    path: 'compliance',
    loadComponent: () =>
      import('./compliance/compliance-report/compliance-report').then((m: any) => m.ComplianceReportComponent),
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