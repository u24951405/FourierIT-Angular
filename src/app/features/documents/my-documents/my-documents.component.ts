import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-documents.component.html',
  styleUrl: './my-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MyDocumentsComponent {
  private router = inject(Router);

  openTemporaryUploadPage(): void {
    this.router.navigate(['/documents/upload']);
  }
}

