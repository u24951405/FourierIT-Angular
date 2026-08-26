import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogComponent } from './audit-log';

describe('AuditLogComponent', () => {
  let component: AuditLogComponent;
  let fixture: ComponentFixture<AuditLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
