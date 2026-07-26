import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentRequestsComponent } from './document-requests.component';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { of } from 'rxjs';

describe('DocumentRequestsComponent', () => {
  let component: DocumentRequestsComponent;
  let fixture: ComponentFixture<DocumentRequestsComponent>;
  let mockRequestService: jasmine.SpyObj<DocumentAccessRequestService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockRequestService = jasmine.createSpyObj('DocumentAccessRequestService', [
      'getPendingRequests',
      'getPendingDepartmentRequests',
      'approveRequest',
      'denyRequest',
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['show']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getUserRoles']);

    mockRequestService.getPendingRequests.and.returnValue(of([]));
    mockRequestService.getPendingDepartmentRequests.and.returnValue(of([]));
    mockAuthService.getUserRoles.and.returnValue(['Document Owner']);

    await TestBed.configureTestingModule({
      imports: [DocumentRequestsComponent],
      providers: [
        { provide: DocumentAccessRequestService, useValue: mockRequestService },
        { provide: ToastService, useValue: mockToastService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentRequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load pending requests on init', () => {
    fixture.detectChanges();
    expect(mockRequestService.getPendingRequests).toHaveBeenCalled();
  });

  it('should display empty state when no requests', () => {
    fixture.detectChanges();
    expect(component.requests().length).toBe(0);
  });
});
