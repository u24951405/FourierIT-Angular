import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { InstitutionAuthService } from '../institution-auth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 55;

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-verify.html',
  styleUrls: ['./otp-verify.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  readonly authService = inject(InstitutionAuthService);

  digits: string[] = Array(OTP_LENGTH).fill('');

  verifying = false;
  error: string | null = null;

  resendCountdown = RESEND_COOLDOWN_SECONDS;
  canResend = false;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  get maskedEmail(): string {
    return this.authService.getPendingValidation()?.maskedEmail ?? 'your registered email';
  }

  get isLocked(): boolean {
    return this.authService.isSessionLocked();
  }

  get remainingAttempts(): number {
    return this.authService.remainingAttempts();
  }

  get otpValue(): string {
    return this.digits.join('');
  }

  get isOtpComplete(): boolean {
    return this.digits.every((d) => d !== '');
  }

  get canVerify(): boolean {
    return this.isOtpComplete && !this.verifying && !this.isLocked;
  }

  ngOnInit(): void {
    this.startResendCountdown();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  // ─── OTP Input Handling ─────────────────────────────────────────────────────

  /**
   * FIX: Use ONLY (keydown) for all input handling.
   * Remove (input) and (keyup) bindings entirely.
   * This prevents double-firing which caused digit 1 to propagate across all boxes.
   */
  onKeydown(event: KeyboardEvent, index: number): void {
    const key = event.key;

    // Allow: tab, arrows, backspace, delete
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
      if (key === 'ArrowLeft' && index > 0) this.focusBox(index - 1);
      if (key === 'ArrowRight' && index < OTP_LENGTH - 1) this.focusBox(index + 1);
      return;
    }

    // Backspace: clear current box or move back
    if (key === 'Backspace') {
      event.preventDefault();
      const next = [...this.digits];
      if (next[index]) {
        next[index] = '';
        this.digits = next;
        this.cdr.markForCheck();
        // Sync input element value
        this.setBoxValue(index, '');
      } else if (index > 0) {
        next[index - 1] = '';
        this.digits = next;
        this.cdr.markForCheck();
        this.setBoxValue(index - 1, '');
        this.focusBox(index - 1);
      }
      this.error = null;
      return;
    }

    // Block anything that is not a digit (0-9)
    if (!/^\d$/.test(key)) {
      event.preventDefault();
      return;
    }

    // It is a digit — prevent default to take full control of the value
    event.preventDefault();

    const next = [...this.digits];
    next[index] = key;
    this.digits = next;
    this.cdr.markForCheck();

    // Sync the DOM input value directly
    this.setBoxValue(index, key);

    this.error = null;

    // Advance to next box
    if (index < OTP_LENGTH - 1) {
      this.focusBox(index + 1);
    }

    // Auto-submit when complete
    if (next.every((d) => d !== '')) {
      setTimeout(() => this.verify(), 50);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits = pasted.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const next = Array(OTP_LENGTH).fill('');

    digits.forEach((d, i) => {
      if (i < OTP_LENGTH) next[i] = d;
    });

    this.digits = next;
    this.cdr.markForCheck();

    // Sync all box values to DOM
    setTimeout(() => {
      next.forEach((d, i) => this.setBoxValue(i, d));
      const lastIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      this.focusBox(lastIndex);
      if (next.every((d) => d !== '')) this.verify();
    });
  }

  private focusBox(index: number): void {
    setTimeout(() => {
      this.otpBoxes.toArray()[index]?.nativeElement.focus();
    });
  }

  /**
   * Directly sets the DOM input value.
   * Needed because we call preventDefault() on keydown,
   * which means Angular's value binding does not update the DOM automatically.
   */
  private setBoxValue(index: number, value: string): void {
    setTimeout(() => {
      const el = this.otpBoxes.toArray()[index]?.nativeElement;
      if (el) el.value = value;
    });
  }

  // ─── Verify ─────────────────────────────────────────────────────────────────

  verify(): void {
    if (!this.canVerify) return;

    this.verifying = true;
    this.error = null;

    this.authService.verifyOtp(this.otpValue).subscribe({
      next: () => {
        this.verifying = false;
        this.toast.show('OTP verified successfully.', 'success');
        this.router.navigate(['/institution/dashboard']);
      },
      error: (err) => {
        this.verifying = false;
        const serverMessage: string | undefined = err?.error?.error;
        this.digits = Array(OTP_LENGTH).fill('');
        this.cdr.markForCheck();
        setTimeout(() => {
          this.otpBoxes.toArray().forEach((box) => (box.nativeElement.value = ''));
        });

        if (this.isLocked) {
          this.error = serverMessage ?? 'Too many incorrect codes. Request a new code to try again.';
          this.toast.show('Too many incorrect codes. Request a new code.', 'error');
          // A new code can be requested straight away once the old one is cancelled.
          this.canResend = true;
          this.clearCountdown();
        } else {
          // The server explains what went wrong (incorrect code with attempts left, expired code or link).
          this.error = serverMessage ?? `Invalid or expired code. ${this.remainingAttempts} attempt${this.remainingAttempts !== 1 ? 's' : ''} remaining.`;
          this.toast.show(serverMessage ?? 'Invalid or expired OTP. Please try again.', 'error');
          this.focusBox(0);
        }
      },
    });
  }

  // ─── Resend ─────────────────────────────────────────────────────────────────

  resendOtp(): void {
    if (!this.canResend) return;

    this.authService.resendOtp().subscribe({
      next: () => {
        this.canResend = false;
        this.resendCountdown = RESEND_COOLDOWN_SECONDS;
        this.startResendCountdown();
        this.error = null;
        this.digits = Array(OTP_LENGTH).fill('');
        this.cdr.markForCheck();
        setTimeout(() => {
          this.otpBoxes.toArray().forEach((box) => (box.nativeElement.value = ''));
        });
        this.focusBox(0);
        this.toast.show('A new OTP has been sent to your email.', 'success');
      },
      error: (err) => {
        // The server may ask us to wait before another code can be sent.
        const retryAfter = Number(err?.error?.retryAfterSeconds);
        if (err?.status === 429 && Number.isFinite(retryAfter)) {
          this.canResend = false;
          this.resendCountdown = retryAfter;
          this.startResendCountdown();
        }
        this.error = err?.error?.error ?? 'Failed to resend code. Please try again.';
        this.toast.show(this.error ?? 'Failed to resend OTP. Please try again.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private startResendCountdown(): void {
    this.clearCountdown();
    this.countdownInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResend = true;
        this.clearCountdown();
      }
      // Timers don't trigger a redraw on their own in this zoneless app.
      this.cdr.markForCheck();
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ─── Request New Token ───────────────────────────────────────────────────────

  requestNewToken(): void {
    const pending = this.authService.getPendingValidation();
    if (!pending) return;

    this.authService.requestNewAccessToken(pending.institutionId).subscribe({
      next: () => {
        this.toast.show('A new access link has been sent to your email.', 'success');
        this.router.navigate(['/institution/auth/token-requested']);
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to request a new access link. Please contact support.';
        this.toast.show(this.error ?? 'Failed to send a new access link. Please contact support.', 'error');
        this.cdr.markForCheck();
      },
    });
  }
}
