import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstitutionAuthService } from '../auth/institution-auth';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let institutionAuthService: jasmine.SpyObj<InstitutionAuthService>;

  beforeEach(async () => {
    institutionAuthService = jasmine.createSpyObj('InstitutionAuthService', ['signOut']);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: InstitutionAuthService, useValue: institutionAuthService }]
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
