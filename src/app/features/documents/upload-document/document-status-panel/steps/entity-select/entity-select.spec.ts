import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntitySelect } from './entity-select';

describe('EntitySelect', () => {
  let component: EntitySelect;
  let fixture: ComponentFixture<EntitySelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntitySelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntitySelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
