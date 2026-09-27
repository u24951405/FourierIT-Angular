import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { HelpComponent } from './help.component';

describe('HelpComponent', () => {
  let fixture: ComponentFixture<HelpComponent>;
  let component: HelpComponent;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            fragment: of(null)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
  });

  it('shows only the topics available to a document owner', () => {
    vi.spyOn(authService, 'isSuperAdmin').mockReturnValue(false);
    vi.spyOn(authService, 'getUserRoles').mockReturnValue(['Document Owner']);
    vi.spyOn(authService, 'hasRole').mockImplementation((role: string) => role === 'Document Owner');

    const visibleTopics = component.getVisibleTopicIds();

    expect(visibleTopics).toContain('document-upload');
    expect(visibleTopics).toContain('dashboard');
    expect(visibleTopics).not.toContain('institution-requests');
    expect(visibleTopics).not.toContain('reports');
    expect(visibleTopics).not.toContain('audit-log');
  });

  it('hides the institution portal help from department admins', () => {
    vi.spyOn(authService, 'isSuperAdmin').mockReturnValue(false);
    vi.spyOn(authService, 'getUserRoles').mockReturnValue(['Department Admin']);
    vi.spyOn(authService, 'hasRole').mockImplementation((role: string) => role === 'Department Admin');

    const visibleTopics = component.getVisibleTopicIds();

    expect(visibleTopics).not.toContain('institution-requests');
    expect(visibleTopics).toContain('dashboard');
  });

  it('shows the full set for a super admin', () => {
    vi.spyOn(authService, 'isSuperAdmin').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRoles').mockReturnValue(['Super Admin']);
    vi.spyOn(authService, 'hasRole').mockReturnValue(true);

    const visibleTopics = component.getVisibleTopicIds();

    expect(visibleTopics).toContain('reports');
    expect(visibleTopics).toContain('audit-log');
    expect(visibleTopics).toContain('timer-settings');
    expect(visibleTopics).toContain('backup-restore');
  });
});
