import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MyRequests } from './my-requests';

describe('MyRequests', () => {
  let component: MyRequests;
  let fixture: ComponentFixture<MyRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRequests],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
