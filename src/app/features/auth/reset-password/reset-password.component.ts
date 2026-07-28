import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    emailAddress: ['', [Validators.required, Validators.email]],
    token: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator.bind(this)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordsMatchValidator.bind(this) });

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form.patchValue({ emailAddress: email, token });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      emailAddress: this.form.get('emailAddress')?.value ?? '',
      token: this.form.get('token')?.value ?? '',
      newPassword: this.form.get('newPassword')?.value ?? ''
    };

    this.auth.resetPassword(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.successMessage.set(message);
          setTimeout(() => this.router.navigate(['/auth/login'], { replaceUrl: true }), 2000);
        },
        error: (err) => this.errorMessage.set(err?.error?.error ?? 'Password reset failed.')
      });
  }

  private passwordsMatchValidator(form: any) {
    const password = form.get('newPassword')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  passwordsMatch(): boolean {
    const password = this.form.get('newPassword')?.value;
    const confirm = this.form.get('confirmPassword')?.value;
    return typeof password === 'string' && typeof confirm === 'string' && password === confirm;
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '');
    const validLength = value.length >= 8;
    const hasDigit = /\d/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasUppercase = /[A-Z]/.test(value);
    const hasNonAlphanumeric = /[^A-Za-z0-9]/.test(value);

    return validLength && hasDigit && hasLowercase && hasUppercase && hasNonAlphanumeric
      ? null
      : { passwordStrength: true };
  }

  private getPassword(): string {
    return String(this.form.get('newPassword')?.value ?? '');
  }

  passwordHasMinLength(): boolean {
    return this.getPassword().length >= 8;
  }

  passwordHasDigit(): boolean {
    return /\d/.test(this.getPassword());
  }

  passwordHasLowercase(): boolean {
    return /[a-z]/.test(this.getPassword());
  }

  passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.getPassword());
  }

  passwordHasNonAlphanumeric(): boolean {
    return /[^A-Za-z0-9]/.test(this.getPassword());
  }

  allPasswordRulesSatisfied(): boolean {
    return (
      this.passwordHasMinLength() &&
      this.passwordHasDigit() &&
      this.passwordHasLowercase() &&
      this.passwordHasUppercase() &&
      this.passwordHasNonAlphanumeric()
    );
  }
}
