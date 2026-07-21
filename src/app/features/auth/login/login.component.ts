import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuditEventType } from '../../../core/models/institution.models';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  isLoading  = signal(false);
  errorMsg   = signal<string | null>(null);
  showPass   = signal(false);

  //create the login form  builder
  //uses the email and password
  form = this.fb.group({
    username:    ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.errorMsg.set(null);
    this.isLoading.set(true);

    //authorises the user using the auth service, if successful navigates to the dashboard, otherwise shows an error message
    this.auth.login(this.form.value as any)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.router.navigate([this.auth.getDefaultAppPath()]),
        error: (e) => {
          this.auth.logActivity(AuditEventType.LOGIN_FAILURE, 'Failed login attempt');
          this.errorMsg.set(e?.error?.message ?? 'Invalid credentials. Please try again.');
        }
      });
  }

  openInstitutionPortal(): void {
    this.router.navigate(['/institution/auth/access'], {
      queryParams: { token: 'demo-institution-token' }
    });
  }

  openTemporaryUploadPage(): void {
    this.router.navigate(['/temp/documents/upload']);
  }
}
