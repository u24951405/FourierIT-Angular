import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntitySelectComponent } from './entity-select';

describe('EntitySelectComponent', () => {
  let component: EntitySelectComponent;
  let fixture: ComponentFixture<EntitySelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntitySelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntitySelectComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
