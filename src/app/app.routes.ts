import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { documentOwnerGuard } from './core/guards/document-owner.guard';
import { restrictDocumentOwnerOnlyGuard } from './core/guards/restrict-document-owner-only.guard';
import { stakeholderMutationGuard } from './core/guards/stakeholder-mutation.guard';
import { documentUploadGuard } from './core/guards/document-upload.guard';
import { adminGuard } from './core/guards/admin.guard';
import { departmentAdminGuard, departmentScopedGuard } from './core/guards/department-admin.guard';
import { documentManagementGuard } from './core/guards/document-management.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { institutionAuthGuard, institutionOtpGuard } from './features/institution-portal/auth/institution-auth-guard';

export const routes: Routes = [
  
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component')
      .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/users/register-user/register-user.component')
      .then(m => m.RegisterUserComponent)
  },
  {
    path: 'institution/auth/access',
    loadComponent: () => import('./features/institution-portal/auth/token-entry/token-entry').then(m => m.TokenEntryComponent)
  },
  {
    path: 'institution/auth/verify',
    canActivate: [institutionOtpGuard],
    loadComponent: () => import('./features/institution-portal/auth/otp-verify/otp-verify').then(m => m.OtpVerifyComponent)
  },
  {
    path: 'institution/auth/expired',
    loadComponent: () => import('./features/institution-portal/auth/token-expired/token-expired').then(m => m.TokenExpiredComponent)
  },
  {
    path: 'institution/auth/token-requested',
    loadComponent: () => import('./features/institution-portal/auth/token-expired/token-expired').then(m => m.TokenExpiredComponent)
  },
  {
    path: 'institution/thank-you',
    loadComponent: () => import('./features/institution-portal/auth/thank-you/thank-you.component').then(m => m.ThankYouComponent)
  },
  {
    path: 'institution/dashboard',
    canActivate: [institutionAuthGuard],
    loadComponent: () => import('./features/institution-portal/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'institution/request-documents',
    canActivate: [institutionAuthGuard],
    loadComponent: () => import('./features/institution-portal/request-documents/request-documents').then(m => m.RequestDocuments)
  },
  {
    path: 'institution/my-requests',
    canActivate: [institutionAuthGuard],
    loadComponent: () => import('./features/institution-portal/my-requests/my-requests').then(m => m.MyRequests)
  },
  {
    path: 'institution/approved-documents',
    canActivate: [institutionAuthGuard],
    loadComponent: () => import('./features/institution-portal/approved-documents/approved-documents').then(m => m.ApprovedDocuments)
  },
  {
    path: 'institution',
    redirectTo: 'institution/auth/access',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard',
        pathMatch: 'full',
        canActivate: [authGuard],
        loadComponent: () => import('./features/dashboard/dashboard-redirect/dashboard-redirect.component')
          .then(m => m.DashboardRedirectComponent) },
      { path: 'dashboard/system',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        data: { dashboardScope: 'system' },
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component')
          .then(m => m.DashboardComponent) },
      { path: 'dashboard/department',
        canActivate: [restrictDocumentOwnerOnlyGuard, departmentScopedGuard],
        data: { dashboardScope: 'department' },
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component')
          .then(m => m.DashboardComponent) },
      { path: 'dashboard/owner',
        canActivate: [documentOwnerGuard],
        loadComponent: () => import('./features/documents/my-documents/my-documents-dashboard.component')
          .then(m => m.MyDocumentsDashboardComponent) },
      { path: 'my-documents',
        canActivate: [documentOwnerGuard],
        loadComponent: () => import('./features/documents/my-documents/my-documents.component')
          .then(m => m.MyDocumentsComponent) },
      { path: 'administration/institutions',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/administration/institutions/institutions.component')
          .then(m => m.InstitutionsComponent) },
      { path: 'departments/admins',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        loadComponent: () => import('./features/departments/department-admin-management/department-admin-management.component')
          .then(m => m.DepartmentAdminManagementComponent) },
      { path: 'users/department-admins',
        canActivate: [restrictDocumentOwnerOnlyGuard, departmentAdminGuard],
        data: { managedRole: 'Department Admin', pageTitle: 'Department Admin Management' },
        loadComponent: () => import('./features/users/user-management/user-management.component')
          .then(m => m.UserManagementComponent) },
      { path: 'users/document-owners',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        data: { managedRole: 'Document Owner', pageTitle: 'Document Owner Management' },
        loadComponent: () => import('./features/users/user-management/user-management.component')
          .then(m => m.UserManagementComponent) },
      { path: 'users/stakeholders-compliance',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        data: { managedRoles: ['Stakeholder', 'Compliance Officer'], pageTitle: 'Stakeholders & Compliance Officers' },
        loadComponent: () => import('./features/users/user-management/user-management.component')
          .then(m => m.UserManagementComponent) },
      { path: 'users/register-department-admin',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        data: { defaultRole: 'Department Admin', pageTitle: 'Register Department Admin' },
        loadComponent: () => import('./features/users/register-user/register-user.component')
          .then(m => m.RegisterUserComponent) },
      { path: 'users/register-role-user',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        data: { allowedRoles: ['Stakeholder', 'Compliance Officer'], pageTitle: 'Register Stakeholder or Compliance Officer' },
        loadComponent: () => import('./features/users/register-user/register-user.component')
          .then(m => m.RegisterUserComponent) },
      { path: 'administration/roles',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/administration/roles-management/roles-management.component')
          .then(m => m.RolesManagementComponent) },
      { path: 'administration/department-requests',
        canActivate: [restrictDocumentOwnerOnlyGuard, departmentAdminGuard],
        loadComponent: () => import('./features/institution-portal/department-requests/department-requests')
          .then(m => m.DepartmentRequests) },
      { path: 'stakeholders/all',
        canActivate: [restrictDocumentOwnerOnlyGuard],
        loadComponent: () => import('./features/stakeholders/all-stakeholders/all-stakeholders.component')
          .then(m => m.AllStakeholdersComponent) },
      { path: 'stakeholders/add',
        canActivate: [restrictDocumentOwnerOnlyGuard, stakeholderMutationGuard],
        loadComponent: () => import('./features/stakeholders/register-stakeholder/register-stakeholder.component')
          .then(m => m.RegisterStakeholderComponent) },
      { path: 'departments/all',
        canActivate: [restrictDocumentOwnerOnlyGuard],
        loadComponent: () => import('./features/departments/departments/departments.component')
          .then(m => m.DepartmentsComponent) },
      { path: 'departments/hierarchy',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/departments/department-hierarchy/department-hierarchy.component')
          .then(m => m.DepartmentHierarchyComponent) },
      { path: 'documents/all',
        canActivate: [restrictDocumentOwnerOnlyGuard],
        data: { documentPageTitle: 'All Documents' },
        loadComponent: () => import('./features/documents/documents-placeholder/documents-placeholder.component')
          .then(m => m.DocumentsPlaceholderComponent) },
      { path: 'documents/upload',
        canActivate: [restrictDocumentOwnerOnlyGuard, documentUploadGuard],
        data: { documentPageTitle: 'Upload Document' },
        loadComponent: () => import('./features/documents/upload-document/upload-document.component')
          .then(m => m.UploadDocumentComponent) },
      { path: 'documents/requests',
        canActivate: [restrictDocumentOwnerOnlyGuard],
        data: { documentPageTitle: 'Document Access Requests' },
        loadComponent: () => import('./features/documents/document-requests/document-requests.component')
          .then(m => m.DocumentRequestsComponent) },
      { path: 'audit-logs',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        loadComponent: () => import('./features/audit-log/audit-log/audit-log')
          .then(m => m.AuditLogComponent) },
      { path: 'backup-restore',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        loadComponent: () => import('./features/backup-restore/backup-restore')
          .then(m => m.BackupRestoreComponent) },
      { path: 'system-settings',
        canActivate: [restrictDocumentOwnerOnlyGuard, superAdminGuard],
        loadComponent: () => import('./features/system/system-settings/system-settings.component')
          .then(m => m.SystemSettingsComponent) },
      { path: 'help',
        canActivate: [authGuard],
        loadComponent: () => import('./features/help/help.component')
          .then(m => m.HelpComponent) },
      {
        path: 'reports',
        canActivate: [superAdminGuard],
        loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES)
      },
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];
