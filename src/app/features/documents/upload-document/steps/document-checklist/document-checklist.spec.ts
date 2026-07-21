import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentChecklist } from './document-checklist';

describe('DocumentChecklist', () => {
  let component: DocumentChecklist;
  let fixture: ComponentFixture<DocumentChecklist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentChecklist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentChecklist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
