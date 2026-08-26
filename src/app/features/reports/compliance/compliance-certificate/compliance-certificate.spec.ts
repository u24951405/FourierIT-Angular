import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplianceCertificateComponent } from './compliance-certificate';

describe('ComplianceCertificateComponent', () => {
  let component: ComplianceCertificateComponent;
  let fixture: ComponentFixture<ComplianceCertificateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceCertificateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComplianceCertificateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
