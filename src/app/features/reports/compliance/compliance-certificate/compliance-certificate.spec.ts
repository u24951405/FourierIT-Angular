import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplianceCertificate } from './compliance-certificate';

describe('ComplianceCertificate', () => {
  let component: ComplianceCertificate;
  let fixture: ComponentFixture<ComplianceCertificate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceCertificate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComplianceCertificate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
