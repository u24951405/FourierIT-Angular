import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { InstitutionAuthService } from '../auth/institution-auth';
import { DocumentAccessRequestService } from '../../../core/services/document-access-request.service';

import { RequestDocuments } from './request-documents';

describe('RequestDocuments', () => {
  let component: RequestDocuments;
  let fixture: ComponentFixture<RequestDocuments>;
  let requestService: jasmine.SpyObj<DocumentAccessRequestService>;
  let routeMock: { snapshot: { queryParamMap: { get: ReturnType<typeof vi.fn> } } };

  const createComponent = async (queryParamValue: string | null = '42') => {
    const localRouteMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(queryParamValue),
        },
      },
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RequestDocuments],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ActivatedRoute, useValue: localRouteMock },
        { provide: DocumentAccessRequestService, useValue: requestService },
        { provide: InstitutionAuthService, useValue: {
          institutionName: () => 'Test Institution',
          getSessionToken: () => 'session-token',
          getInstitutionId: () => '7',
        } },
      ],
    }).compileComponents();

    const localFixture = TestBed.createComponent(RequestDocuments);
    await localFixture.whenStable();
    return { fixture: localFixture, component: localFixture.componentInstance };
  };

  beforeEach(async () => {
    requestService = jasmine.createSpyObj('DocumentAccessRequestService', [
      'getInstitutionRequest', 'getInstitutionRecipientDocumentTypes', 'createRequest', 'updateInstitutionRequest'
    ]);
    requestService.getInstitutionRequest.and.returnValue(of({
      enquiryRequestId: 42,
      institutionId: 7,
      requestType: 'Individual',
      targetUserId: 'user-7',
      recipientName: 'Existing Owner',
      status: 'Pending',
      purposeNote: 'Existing purpose',
      submissionDeadline: '2026-09-01T00:00:00Z',
      referenceNumber: 'REQ-42',
      documents: [{ documentTypeId: 1, documentTypeName: 'Identity Document', isMandatory: true }],
    }));
    requestService.getInstitutionRecipientDocumentTypes.and.returnValue(of([
      { documentTypeId: 1, typeName: 'Identity Document', description: null, isMandatory: true, requirementNote: null },
      { documentTypeId: 2, typeName: 'Proof of Address', description: null, isMandatory: false, requirementNote: null },
    ]));
    requestService.createRequest.and.returnValue(of({ enquiryRequestId: 99 } as any));
    requestService.updateInstitutionRequest.and.returnValue(of({ enquiryRequestId: 42, status: 'Pending', requestedDocumentTypeIds: [1] }));
    routeMock = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('42'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [RequestDocuments],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: DocumentAccessRequestService, useValue: requestService },
        { provide: InstitutionAuthService, useValue: {
          institutionName: () => 'Test Institution',
          getSessionToken: () => 'session-token',
          getInstitutionId: () => '7',
        } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestDocuments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format dates using the local calendar date', () => {
    const date = new Date(2024, 0, 15, 23, 30);

    expect(component.formatDateInputValue(date)).toBe('2024-01-15');
  });

  it('should render only the request-type selector on step 1 and not the master-detail editor', async () => {
    const { fixture: freshFixture, component: freshComponent } = await createComponent(null);
    freshComponent.currentStep = 1;
    freshFixture.detectChanges();

    const text = freshFixture.nativeElement.textContent as string;
    expect(text).toContain('Company / Department');
    expect(text).toContain('Individual');
    expect(text).not.toContain('MASTER REQUEST');
    expect(text).not.toContain('Requested document line items');
    expect(text).not.toContain('Add document');
  });

  it('should hydrate ?edit=requestId into the same master-detail editor', () => {
    expect(requestService.getInstitutionRequest).toHaveBeenCalledWith('session-token', 42);
    expect(component.editingRequestId).toBe(42);
    expect(component.currentStep).toBe(4);
    expect(component.wizard.recipientName).toBe('Existing Owner');
    expect(component.wizard.selectedDocumentTypeIds).toEqual([1]);
    expect(component.isDocumentMandatory(1)).toBe(true);
    expect(component.wizard.referenceNumber).toBe('REQ-42');
  });

  it('should use update for an existing request and create for a new request', () => {
    component.wizard.justification = 'Updated purpose';
    component.wizard.submissionDeadline = '2026-09-02';
    component.wizard.referenceNumber = 'REQ-42B';
    component.submitRequest();

    expect(requestService.updateInstitutionRequest).toHaveBeenCalledWith('session-token', 42, jasmine.any(Object));
    expect(requestService.createRequest).not.toHaveBeenCalled();

    component.editingRequestId = null;
    component.currentStep = 4;
    component.wizard.requestType = 'Individual';
    component.wizard.selectedRecipientId = 'user-7';
    component.wizard.selectedDocumentTypeIds = [1];
    component.submitRequest();

    expect(requestService.createRequest).toHaveBeenCalled();
  });

});
