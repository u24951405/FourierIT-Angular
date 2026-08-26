import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { InstitutionAuthService } from '../auth/institution-auth';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let institutionAuthService: jasmine.SpyObj<InstitutionAuthService>;

  beforeEach(async () => {
    institutionAuthService = jasmine.createSpyObj('InstitutionAuthService', ['signOut', 'institutionName', 'institutionCode', 'session', 'getSessionExpiryLabel', 'getSessionToken', 'getInstitutionId']);
    institutionAuthService.institutionName.and.returnValue('Test Institution');
    institutionAuthService.institutionCode.and.returnValue('TEST');
    institutionAuthService.session.and.returnValue({
      institutionId: '7',
      institutionName: 'Test Institution',
      institutionCode: 'TEST',
      sessionToken: 'session-token',
      accessToken: 'access-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      authMethod: 'OTP_VERIFIED',
      authenticatedAt: new Date().toISOString(),
    });
    institutionAuthService.getSessionExpiryLabel.and.returnValue('Active');
    institutionAuthService.getSessionToken.and.returnValue(null);
    institutionAuthService.getInstitutionId.and.returnValue('7');

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: InstitutionAuthService, useValue: institutionAuthService },
        { provide: ActivatedRoute, useValue: {} },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sign out through the institution auth service', () => {
    component.signOut();

    expect(institutionAuthService.signOut).toHaveBeenCalled();
  });
});
