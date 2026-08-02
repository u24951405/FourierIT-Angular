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
    mockAuthService = jasmine.createSpyObj('AuthService', ['getUserRoles', 'isSuperAdmin', 'hasRole']);

    mockRequestService.getPendingRequests.and.returnValue(of([]));
    mockRequestService.getPendingDepartmentRequests.and.returnValue(of([]));
    mockAuthService.getUserRoles.and.returnValue(['Document Owner']);
    mockAuthService.isSuperAdmin.and.returnValue(false);
    mockAuthService.hasRole.and.returnValue(false);

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

  it('should allow super admin access even without explicit role claims', () => {
    mockAuthService.isSuperAdmin.and.returnValue(true);
    mockAuthService.hasRole.and.callFake((role: string) => role === 'Document Owner' || role === 'Department Admin');

    component.loadAllRequests();

    expect(mockRequestService.getPendingRequests).toHaveBeenCalled();
    expect(mockRequestService.getPendingDepartmentRequests).toHaveBeenCalled();
  });

  it('should format sender and recipient details for a request', () => {
    const request = {
      enquiryRequestId: 12,
      institutionName: 'Acme Holdings',
      senderName: 'Acme Holdings',
      recipientType: 'Department',
      recipientName: 'Finance',
      purposeNote: 'Access for audit review',
    } as any;

    expect(component.getSenderLabel(request)).toBe('Submitted by Acme Holdings');
    expect(component.getRecipientLabel(request)).toBe('Requested for Finance');
  });
});
