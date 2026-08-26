import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupRestoreComponent } from './backup-restore';

describe('BackupRestoreComponent', () => {
  let component: BackupRestoreComponent;
  let fixture: ComponentFixture<BackupRestoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackupRestoreComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackupRestoreComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
