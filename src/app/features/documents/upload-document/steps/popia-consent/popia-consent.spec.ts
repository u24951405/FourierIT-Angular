import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopiaConsent } from './popia-consent';

describe('PopiaConsent', () => {
  let component: PopiaConsent;
  let fixture: ComponentFixture<PopiaConsent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopiaConsent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopiaConsent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
