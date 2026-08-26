import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentStatusPanelComponent } from './document-status-panel';

describe('DocumentStatusPanelComponent', () => {
  let component: DocumentStatusPanelComponent;
  let fixture: ComponentFixture<DocumentStatusPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentStatusPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentStatusPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
