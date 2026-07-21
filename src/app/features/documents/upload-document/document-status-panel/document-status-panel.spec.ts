import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentStatusPanel } from './document-status-panel';

describe('DocumentStatusPanel', () => {
  let component: DocumentStatusPanel;
  let fixture: ComponentFixture<DocumentStatusPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentStatusPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentStatusPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
