import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { InstitutionAuthService } from '../institution-auth';
import { OtpVerifyComponent } from './otp-verify';

describe('OtpVerifyComponent', () => {
  let component: OtpVerifyComponent;
  let fixture: ComponentFixture<OtpVerifyComponent>;
  let authService: jasmine.SpyObj<InstitutionAuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('InstitutionAuthService', [
      'verifyOtp',
      'resendOtp',
      'getPendingValidation',
      'isSessionLocked',
      'remainingAttempts',
      'requestNewAccessToken',
    ]);
    authService.verifyOtp.and.returnValue(of({ success: true, sessionToken: 'token', expiresAt: new Date().toISOString() }));
    authService.getPendingValidation.and.returnValue(null);
    authService.isSessionLocked.and.returnValue(false);
    authService.remainingAttempts.and.returnValue(3);
    authService.requestNewAccessToken.and.returnValue(of(void 0));
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [OtpVerifyComponent],
      providers: [
        { provide: InstitutionAuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OtpVerifyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call the auth service for the 6-digit OTP instead of using a demo bypass', () => {
    component.digits = ['1', '2', '3', '4', '5', '6'];

    component.verify();

    expect(authService.verifyOtp).toHaveBeenCalledWith('123456');
  });
});
