import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityType } from '../../../../../core/models/document-upload.models';

@Component({
  selector: 'app-entity-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-select.html',
  styleUrls: ['./entity-select.scss'],
})
export class EntitySelectComponent {
  @Output() entitySelected = new EventEmitter<EntityType>();

  EntityType = EntityType;

  select(type: EntityType): void {
    this.entitySelected.emit(type);
  }
}
