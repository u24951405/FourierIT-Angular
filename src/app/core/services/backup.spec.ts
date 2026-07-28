import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BackupService } from './backup';
import { environment } from '../../../environments/environment';

describe('BackupService', () => {
  let service: BackupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(BackupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request backup history from the correct endpoint', () => {
    service.getBackupHistory().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Backup/history`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create a backup through the correct endpoint', () => {
    service.createBackup({ userId: 'user-1', isManualBackup: true }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Backup/create`);
    expect(req.request.method).toBe('POST');
    req.flush({ backupId: 1, statusMessage: 'ok' });
  });

  it('should restore a backup through the correct endpoint', () => {
    service.restoreBackup(7).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Backup/restore/7`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'ok' });
  });
});
