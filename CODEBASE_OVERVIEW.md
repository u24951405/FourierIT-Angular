# DocuVault Codebase Overview

This document describes the current contents and behavior of the DocuVault Angular application. It is based on the source files present in this repository and does not infer behavior that is not represented in those files.

## 1. Project Identity

- Application name in `package.json`: `docu-vault`.
- Angular project name in `angular.json`: `DocuVault`.
- Angular CLI version declared by the README: 21.1.4.
- Source root: `src`.
- Browser entry point: `src/main.ts`.
- Global stylesheet: `src/styles.css`.
- The application is bootstrapped as a standalone Angular application.

## 2. What the System Does

### 2.1 Application entry and shared behavior

`src/main.ts` bootstraps `AppComponent` with `appConfig`. `appConfig` provides:

- Angular router configuration from `src/app/app.routes.ts`.
- `HttpClient` with the `authInterceptor` HTTP interceptor.
- Browser global error listeners.

`AppComponent` renders the active route through `router-outlet` and renders the shared toast component.

### 2.2 Public user authentication

The public authentication routes provide components for:

- User login.
- User registration.
- Forgot-password requests.
- Password reset.

`AuthService` calls the user API using the base URL `${environment.apiUrl}/user`. Its source defines operations for login, registration, registration OTP verification, entity verification, entity-type lookup, forgot password, reset password, logout, current-user state, JWT role inspection, and profile-image URL selection.

On successful login, the service stores the returned token in `localStorage` under `docuvault_token` and derives the current user from the token. `auth.interceptor.ts` is registered globally to attach authentication information to HTTP requests.

### 2.3 Institution portal authentication

The institution portal is a separate access flow from the internal user JWT flow:

1. An institution enters an access token at `/institution/auth/access`.
2. The token is validated by `InstitutionAuthService`.
3. A six-digit OTP is verified at `/institution/auth/verify`.
4. Successful verification creates an institution session.
5. The institution can use the guarded portal routes.

The institution session uses `institution_session` storage and is checked by `institutionAuthGuard`. The OTP verification route uses `institutionOtpGuard`. The service tracks failed attempts, locks after three attempts, and defines a seven-day OTP-backed session validity period. The source also contains a demo access path with the token `demo-institution-token` and OTP `123456`.

Institution portal screens exposed by the route table include:

- Token entry.
- OTP verification.
- Expired-token and token-requested states.
- Institution dashboard.
- Document requests.
- The institution's requests.
- Approved documents.
- Thank-you confirmation.

### 2.4 Internal authenticated application

The main layout is guarded by `authGuard` and contains the internal application routes. The route table exposes:

- Role-sensitive dashboard redirects and dashboards for system, department, and document-owner scopes.
- A document-owner "My Documents" area.
- Institution administration.
- Role administration.
- Department administration and department-admin management.
- User management for department admins, document owners, stakeholders, and compliance officers.
- Registration pages for selected user roles.
- Stakeholder listing and stakeholder registration.
- Department listing.
- Document upload.
- Document access requests.
- Audit logs.
- Backup and restore.
- Lazy-loaded reports.

The route `/documents/all` currently loads `DocumentsPlaceholderComponent`; the route name alone does not establish that a complete all-documents library exists.

### 2.5 Documents

`DocumentsApiService` uses `${environment.apiUrl}/documents` and defines API operations for:

- Listing the current user's documents.
- Getting required-document status and document-type options.
- Uploading and updating documents with `FormData`.
- Downloading a document as a `Blob`.
- Deleting a document.
- Getting document details.
- Listing and revoking document access approvals.
- Listing documents for all users through an administrative endpoint.

The upload feature is divided into a main upload component, document-status panel, and steps for document checklist, entity selection, and POPIA consent. `DocumentUploadService` also exists separately and contains document-upload support used by the feature.

### 2.6 Compliance and reporting

`ComplianceService` uses `${environment.apiUrl}/compliance`. Its typed source models and methods cover:

- Per-user compliance details, issues, and missing documents.
- System and department compliance dashboards.
- Compliance rules.
- Compliance history.
- Alerts.

The report route group is lazy-loaded under `/reports` and is protected by `superAdminGuard`. It exposes:

- Super-admin reports.
- Ad-hoc reports.
- Monthly reports.
- Compliance reports.
- Compliance certificates.
- Activity reports.
- System-audit reports.
- Client-risk-rating reports.

`Chart.js`, `html2canvas`, and `jspdf` are declared dependencies. Their presence confirms library support in the project; the dependency list alone does not prove that every report uses every library.

### 2.7 Administration and supporting services

The core services directory contains services for:

- Audit logs.
- Authentication and user authentication support.
- Backups.
- Compliance.
- Departments.
- Document access requests.
- Document uploads and documents API access.
- Institutions.
- Reports.
- Roles and role management.
- Toast notifications.
- User data and user management.

The core models directory contains TypeScript models for audit logs, backups, document uploads, institutions, and users. Profile validators are stored under `core/validators`.

### 2.8 Authorization surfaces

The route configuration references guards for authentication, administrators, department administrators, department-scoped access, document owners, document uploads, stakeholder mutations, super administrators, and document-owner-only restrictions. The institution portal has separate institution-authentication and institution-OTP guards.

The exact permission decision is implemented by the guard and authentication source files. Route protection should therefore be read from the guard assignments in `src/app/app.routes.ts`, not from route names alone.

## 3. Configuration and Commands

### 3.1 NPM scripts

| Command | Defined operation |
|---|---|
| `npm run ng` | Runs `ng`. |
| `npm start` | Runs `ng serve`. |
| `npm run build` | Runs `ng build`. |
| `npm run watch` | Runs `ng build --watch --configuration development`. |
| `npm test` | Runs `ng test`. |

### 3.2 Angular build configuration

`angular.json` defines:

- Project `DocuVault` as an application.
- `src/main.ts` as the browser entry point.
- `public/**` and `src/assets` as assets.
- `src/styles.css` as the global stylesheet.
- Production bundle budgets of 500 kB for warnings and 1 MB for errors on the initial bundle.
- Development builds with optimization disabled, license extraction disabled, and source maps enabled.
- Angular's unit-test builder for tests.
- Angular CLI analytics disabled.

### 3.3 Environment values

`src/environments/environment.ts` contains:

```ts
production: false
apiUrl: 'http://localhost:5101/api'
```

`src/environments/environment.prod.ts` exists but is empty in the current workspace. The current `angular.json` does not show an environment-file replacement configuration.

### 3.4 Dependencies

Runtime dependencies include Angular common/compiler/core/forms/platform-browser/router packages, RxJS, `chart.js`, `html2canvas`, `jspdf`, and `tslib`.

Development dependencies include Angular build/CLI/compiler tooling, TypeScript, Vitest, JSDOM, and `@types/jspdf`.

## 4. Codebase Structure

The following outline lists the application structure currently present. A suffix describes the common file purpose: `.ts` is TypeScript, `.html` is a template, `.css`/`.scss` is component styling, and `.spec.*` is a test.

```text
.
|-- .editorconfig
|-- .gitignore
|-- angular.json
|-- build-proof-angular.txt
|-- build.log
|-- package.json
|-- package-lock.json
|-- README.md
|-- public/
|   |-- favicon.ico
|   |-- favicon.svg
|   `-- Logo.png
|-- src/
|   |-- index.html
|   |-- main.ts
|   |-- styles.css
|   |-- assets/
|   |   `-- videos/docuvault-login-bg.mp4
|   |-- environments/
|   |   |-- environment.ts
|   |   `-- environment.prod.ts
|   `-- app/
|       |-- app.component.ts
|       |-- app.component.html
|       |-- app.component.css
|       |-- app.config.component.ts
|       |-- app.routes.ts
|       |-- app.routes.spec.ts
|       |-- app.spec.ts
|       |-- core/
|       |   |-- Interceptors/auth.interceptor.ts
|       |   |-- guards/
|       |   |   |-- admin.guard.ts / admin.guard.spec.ts
|       |   |   |-- auth.guard.ts
|       |   |   |-- department-admin.guard.ts
|       |   |   |-- document-management.guard.ts
|       |   |   |-- document-owner.guard.ts
|       |   |   |-- document-upload.guard.ts
|       |   |   |-- my-documents.guard.ts
|       |   |   |-- restrict-document-owner-only.guard.ts
|       |   |   |-- stakeholder-mutation.guard.ts
|       |   |   `-- super-admin.guard.ts
|       |   |-- models/
|       |   |   |-- audit-log.ts
|       |   |   |-- backup.ts
|       |   |   |-- document-upload.models.ts
|       |   |   |-- institution.models.ts
|       |   |   `-- user.model.ts
|       |   |-- services/
|       |   |   |-- audit-log.ts / audit-log.spec.ts
|       |   |   |-- auth.service.ts / auth.service.spec.ts
|       |   |   |-- authentication.service.ts
|       |   |   |-- backup.ts / backup.spec.ts
|       |   |   |-- compliance.service.ts
|       |   |   |-- department.service.ts
|       |   |   |-- document-access-request.service.ts
|       |   |   |-- document-upload.service.ts
|       |   |   |-- documents-api.service.ts
|       |   |   |-- institution.service.ts
|       |   |   |-- reports.service.ts
|       |   |   |-- role.service.ts
|       |   |   |-- roles-management.service.ts
|       |   |   |-- toast.service.ts / toast.spec.ts
|       |   |   |-- user-management.service.ts
|       |   |   `-- user.service.ts
|       |   `-- validators/profile.validators.ts
|       |-- layout/main-layout/
|       |   |-- main-layout.component.ts / .html / .css / .spec.ts
|       |-- shared/
|       |   |-- sidebar/sidebar.component.ts / .html / .scss
|       |   `-- components/toast/toast.component.ts / .html / .css / .spec.component.ts
|       `-- features/
|           |-- administration/
|           |   |-- institutions/institutions.component.ts / .html / .scss / .spec.ts
|           |   `-- roles-management/roles-management.component.ts / .html / .scss / .spec.ts
|           |-- audit-log/audit-log/audit-log.ts / .html / .css / .spec.ts
|           |-- auth/
|           |   |-- login/login.component.ts / .html / .scss / .css / .spec.ts / login.spec.ts
|           |   |-- forgot-password/forgot-password.component.ts / .html / .scss
|           |   `-- reset-password/reset-password.component.ts / .html / .scss
|           |-- backup-restore/backup-restore.ts / .html / .css / .spec.ts
|           |-- dashboard/
|           |   |-- dashboard/dashboard.component.ts / .html / .scss / .spec.ts
|           |   `-- dashboard-redirect/dashboard-redirect.component.ts
|           |-- departments/
|           |   |-- departments/departments.component.ts / .html / .scss / .spec.ts
|           |   `-- department-admin-management/department-admin-management.component.ts / .html / .scss
|           |-- documents/
|           |   |-- document-requests/document-requests.component.ts / .html / .scss / .spec.ts
|           |   |-- documents-placeholder/documents-placeholder.component.ts / .html / .scss
|           |   |-- my-documents/ (components, dashboard, owner dashboard, category-counts, and related test/template files)
|           |   `-- upload-document/ (main upload component, status panel, and checklist/entity/POPIA steps)
|           |-- institution-portal/
|           |   |-- auth/ (institution auth service/guards, token, OTP, expired, thank-you screens)
|           |   |-- dashboard/
|           |   |-- department-requests/
|           |   |-- my-requests/
|           |   |-- request-documents/
|           |   `-- approved-documents/
|           |-- reports/
|           |   |-- reports.routes.ts
|           |   |-- reports.models.ts
|           |   |-- reports-module.ts
|           |   |-- super-admin-reports/
|           |   |-- ad-hoc/ad-hoc-report/
|           |   |-- monthly/monthly-report/
|           |   |-- compliance/compliance-report/
|           |   |-- compliance/compliance-certificate/
|           |   |-- activity/activity-report/
|           |   |-- system-audit/system-audit-report/
|           |   |-- client-risk-rating/client-risk-rating/
|           |   `-- shared/report-frame/
|           |-- stakeholders/
|           |   |-- all-stakeholders/
|           |   `-- register-stakeholder/
|           |-- system/system-tools/
|           `-- users/
|               |-- register-user/ (active component directory and legacy sibling files)
|               `-- user-management/
```

The abbreviated feature entries above contain the TypeScript, template, style, and test files shown by the repository inventory. The route table is the authoritative list of currently wired application screens; existing files that are not referenced by routes may be legacy, supporting, or unused code.

## 5. Explicit Current-State Notes

These notes are direct observations from the current files:

- The README is still mostly Angular CLI-generated setup text.
- `/documents/all` renders `DocumentsPlaceholderComponent`.
- `environment.prod.ts` is empty.
- The source contains both active component-directory user-registration files and older sibling `register-user.ts`, `.html`, `.css`, and spec files.
- The source contains additional document-owner and system-tools files whose use must be determined from their imports and routes, not their names alone.
- This document records the current frontend repository only. No backend repository or backend implementation was inspected here.