import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopiaConsentComponent } from './popia-consent';

describe('PopiaConsentComponent', () => {
  let component: PopiaConsentComponent;
  let fixture: ComponentFixture<PopiaConsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopiaConsentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopiaConsentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
