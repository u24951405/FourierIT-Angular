import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { documentOwnerGuard } from './core/guards/document-owner.guard';
import { restrictDocumentOwnerOnlyGuard } from './core/guards/restrict-document-owner-only.guard';
import { stakeholderMutationGuard } from './core/guards/stakeholder-mutation.guard';
import { documentUploadGuard } from './core/guards/document-upload.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'temp/documents/upload',
    loadComponent: () => import('./features/documents/upload-document/upload-document.component')
      .then(m => m.UploadDocumentComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
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
    loadComponent: () => import('./features/institution-portal/auth/otp-verify/otp-verify').then(m => m.OtpVerifyComponent)
  },
  {
    path: 'institution/auth/expired',
    loadComponent: () => import('./features/institution-portal/auth/token-expired/token-expired').then(m => m.TokenExpiredComponent)
  },
  {
    path: 'institution/dashboard',
    loadComponent: () => import('./features/institution-portal/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'institution/request-documents',
    loadComponent: () => import('./features/institution-portal/request-documents/request-documents').then(m => m.RequestDocuments)
  },
  {
    path: 'institution/my-requests',
    loadComponent: () => import('./features/institution-portal/my-requests/my-requests').then(m => m.MyRequests)
  },
  {
    path: 'institution/approved-documents',
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
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component')
          .then(m => m.DashboardComponent) },
      { path: 'my-documents',
        canActivate: [documentOwnerGuard],
        loadComponent: () => import('./features/documents/my-documents/my-documents.component')
          .then(m => m.MyDocumentsComponent) },
      { path: 'users/management',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/users/user-management/user-management.component')
          .then(m => m.UserManagementComponent) },
      { path: 'administration/institutions',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/administration/institutions/institutions.component')
          .then(m => m.InstitutionsComponent) },
      { path: 'administration/roles',
        canActivate: [restrictDocumentOwnerOnlyGuard, adminGuard],
        loadComponent: () => import('./features/administration/roles-management/roles-management.component')
          .then(m => m.RolesManagementComponent) },
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
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];
