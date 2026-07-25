import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackupRestore } from './backup-restore';

describe('BackupRestore', () => {
  let component: BackupRestore;
  let fixture: ComponentFixture<BackupRestore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackupRestore]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackupRestore);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
