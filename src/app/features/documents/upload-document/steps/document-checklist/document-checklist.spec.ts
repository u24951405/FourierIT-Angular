import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentChecklistComponent } from './document-checklist';

describe('DocumentChecklistComponent', () => {
  let component: DocumentChecklistComponent;
  let fixture: ComponentFixture<DocumentChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentChecklistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentChecklistComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
