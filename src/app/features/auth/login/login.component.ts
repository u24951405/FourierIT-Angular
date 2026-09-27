import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
export class LoginComponent implements AfterViewInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  @ViewChild('backgroundVideo') backgroundVideo?: ElementRef<HTMLVideoElement>;

  isLoading  = signal(false);
  errorMsg   = signal<string | null>(null);
  /** Set when the user was signed out because their session timer ran out. */
  readonly sessionExpired = inject(ActivatedRoute).snapshot.queryParamMap.get('expired') === '1';
  showPass   = signal(false);

  ngAfterViewInit(): void {
    const video = this.backgroundVideo?.nativeElement;
    if (!video) {
      return;
    }

    video.muted = true;
    video.volume = 0;
    video.setAttribute('muted', 'true');
    video.setAttribute('playsinline', 'true');

    video.play()?.catch(() => {
      // Browsers may block autoplay until the user interacts; the video remains muted
      // and can still be started later without sound if the user chooses to play it.
    });
  }

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
}
