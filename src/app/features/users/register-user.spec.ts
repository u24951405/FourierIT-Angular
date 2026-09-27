import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { saIdNumber } from '../../core/validators/sa-id';
import { RegisterUser } from './register-user';

describe('RegisterUser', () => {
  let component: RegisterUser;
  let fixture: ComponentFixture<RegisterUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('accepts a valid South African ID matching the backend checksum', () => {
    const control = new FormControl('9001015009061', saIdNumber());

    expect(control.valid).toBe(true);
    expect(control.errors).toBeNull();
  });
});
