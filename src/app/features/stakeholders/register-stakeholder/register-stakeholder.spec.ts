import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterStakeholderComponent } from './register-stakeholder.component';

describe('RegisterStakeholderComponent', () => {
  let component: RegisterStakeholderComponent;
  let fixture: ComponentFixture<RegisterStakeholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterStakeholderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterStakeholderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
