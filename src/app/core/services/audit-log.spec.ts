import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditLogService } from './audit-log';
import { environment } from '../../../environments/environment';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request audit logs from the correct endpoint', () => {
    service.getAuditLogs().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/AuditLog`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request a single audit log by id from the correct endpoint', () => {
    service.getAuditLogById(42).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/AuditLog/42`);
    expect(req.request.method).toBe('GET');
    req.flush({ auditLogId: 42 });
  });
});
