import { Component, OnInit, Input, Output, EventEmitter, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  DocumentHierarchyService,
  EntityTypeHierarchyDto,
  DocumentTypeHierarchyDto,
  DocumentItemDto,
  SearchResultDto
} from '../../../core/services/document-hierarchy.service';

@Component({
  selector: 'app-document-hierarchy-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-hierarchy-tree.component.html',
  styleUrls: ['./document-hierarchy-tree.component.css']
})
export class DocumentHierarchyTreeComponent implements OnInit {
  @Input() showDocuments = true;
  @Input() mode: 'browse' | 'search' | 'select' = 'browse';
  @Input() allowMultiSelect = false;

  @Output() documentSelected = new EventEmitter<DocumentItemDto>();
  @Output() entityTypeSelected = new EventEmitter<EntityTypeHierarchyDto>();
  @Output() documentTypeSelected = new EventEmitter<DocumentTypeHierarchyDto>();
  @Output() documentDetailsRequested = new EventEmitter<number>();

  hierarchy: EntityTypeHierarchyDto[] = [];
  searchResults: SearchResultDto[] = [];
  searchQuery = '';
  isLoading = false;
  isSearching = false;
  expandedEntityTypes = new Set<number>();
  expandedDocumentTypes = new Set<number>();
  selectedDocuments = new Set<number>();

  constructor(
    private hierarchyService: DocumentHierarchyService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHierarchy();
  }

  loadHierarchy(): void {
    console.log('[loadHierarchy] Starting...');
    this.isLoading = true;
    this.searchResults = [];
    this.searchQuery = '';

    this.hierarchyService.getDocumentHierarchy()
      .pipe(finalize(() => {
        console.log('[loadHierarchy] Finalize - setting isLoading to false');
        this.isLoading = false;
      }))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            console.log('[loadHierarchy] Got data:', data);
            console.log('[loadHierarchy] data is Array:', Array.isArray(data));
            console.log('[loadHierarchy] data.length:', data?.length);
            this.hierarchy = data;
            this.cdr.markForCheck();
            console.log('[loadHierarchy] this.hierarchy.length:', this.hierarchy.length);
            console.log('[loadHierarchy] getEntityCount():', this.getEntityCount());
          });
        },
        error: (error) => {
          console.error('[loadHierarchy] Error:', error);
        }
      });
  }

  searchDocuments(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.loadHierarchy();
      return;
    }

    this.isSearching = true;
    this.hierarchyService.searchDocuments(this.searchQuery)
      .pipe(finalize(() => { this.isSearching = false; }))
      .subscribe({
        next: (results) => {
          this.searchResults = results;
        },
        error: (error) => {
          console.error('Error searching documents:', error);
        }
      });
  }

  toggleEntityType(entityTypeId: number): void {
    if (this.expandedEntityTypes.has(entityTypeId)) {
      this.expandedEntityTypes.delete(entityTypeId);
    } else {
      this.expandedEntityTypes.add(entityTypeId);
    }
  }

  toggleDocumentType(documentTypeId: number): void {
    if (this.expandedDocumentTypes.has(documentTypeId)) {
      this.expandedDocumentTypes.delete(documentTypeId);
    } else {
      this.expandedDocumentTypes.add(documentTypeId);
    }
  }

  isEntityTypeExpanded(entityTypeId: number): boolean {
    return this.expandedEntityTypes.has(entityTypeId);
  }

  isDocumentTypeExpanded(documentTypeId: number): boolean {
    return this.expandedDocumentTypes.has(documentTypeId);
  }

  selectDocument(doc: DocumentItemDto): void {
    if (!doc.userCanView) return;

    if (this.mode === 'select') {
      if (this.allowMultiSelect) {
        if (this.selectedDocuments.has(doc.documentId)) {
          this.selectedDocuments.delete(doc.documentId);
        } else {
          this.selectedDocuments.add(doc.documentId);
        }
      } else {
        this.selectedDocuments.clear();
        this.selectedDocuments.add(doc.documentId);
      }
    }

    this.documentSelected.emit(doc);
  }

  viewDocument(doc: DocumentItemDto): void {
    if (!doc.userCanView) return;
    this.documentSelected.emit(doc);
  }

  selectEntityType(entityType: EntityTypeHierarchyDto): void {
    this.entityTypeSelected.emit(entityType);
  }

  selectDocumentType(docType: DocumentTypeHierarchyDto): void {
    this.documentTypeSelected.emit(docType);
  }

  getEntityCount(): number {
    return this.hierarchy.length;
  }

  getDocumentTypeCount(): number {
    return this.hierarchy.reduce((sum, et) => sum + et.documentTypes.length, 0);
  }

  getDocumentCount(): number {
    return this.hierarchy.reduce(
      (sum, et) =>
        sum +
        et.documentTypes.reduce((dtSum, dt) => dtSum + dt.documents.length, 0),
      0
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.loadHierarchy();
  }

  getFormattedFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusClass(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('approved') || lowerStatus.includes('active')) return 'approved';
    if (lowerStatus.includes('pending')) return 'pending';
    if (lowerStatus.includes('rejected') || lowerStatus.includes('expired')) return 'rejected';
    return 'default';
  }

  openDocumentDetails(doc: DocumentItemDto): void {
    this.documentDetailsRequested.emit(doc.documentId);
  }
}
