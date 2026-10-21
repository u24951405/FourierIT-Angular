import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ComplianceCertificateComponent } from './compliance-certificate';

describe('ComplianceCertificateComponent', () => {
  let component: ComplianceCertificateComponent;
  let fixture: ComponentFixture<ComplianceCertificateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceCertificateComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
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
