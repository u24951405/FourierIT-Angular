import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestDocuments } from './request-documents';

describe('RequestDocuments', () => {
  let component: RequestDocuments;
  let fixture: ComponentFixture<RequestDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestDocuments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestDocuments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format dates using the local calendar date', () => {
    const date = new Date(2024, 0, 15, 23, 30);

    expect(component.formatDateInputValue(date)).toBe('2024-01-15');
  });
});
