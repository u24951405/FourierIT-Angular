import {Component,Input,OnInit,inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export interface ReportFrameConfig {
  reportId: string;
  dateGenerated: string;
  period?: string;
  createdBy: string;
  reportType: string;
  framework?: string;
  badgeLabel?: string;        // e.g. 'MONTHLY', 'AUDIT TRAIL', 'RISK MATRIX'
  badgeIcon?: 'bar' | 'lock' | 'trend' | 'check';
  accentColors?: string[];    // bottom accent bar colors (e.g. ['#10b981','#f59e0b','#ef4444'])
}

@Component({
  selector: 'app-report-frame',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-frame.html',
  styleUrls: ['./report-frame.scss'],
})
export class ReportFrameComponent implements OnInit {
  @Input() config!: ReportFrameConfig;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() backPath = '/reports';
  @Input() pdfUrl?: string;

  private router = inject(Router);
  private http = inject(HttpClient);

  formattedDate = '';

  get accentGradientStyle(): string {
    const accentColors = this.config?.accentColors ?? [];
    return accentColors.length > 0
      ? `linear-gradient(to right, ${accentColors.join(', ')})`
      : '#10b981';
  }

  ngOnInit(): void {
    this.formattedDate = this.config?.dateGenerated
      ? new Date(this.config.dateGenerated).toLocaleString('en-ZA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';
  }

  goBack(): void {
    this.router.navigate([this.backPath]);
  }

  get accentBackground(): string {
    const colors = this.config?.accentColors;
    return colors?.length ? `linear-gradient(to right, ${colors.join(', ')})` : '#10b981';
  }

  print(): void {
    window.print();
  }

  downloadPdf(): void {
    if (!this.pdfUrl) return;

    this.http.get(this.pdfUrl, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${this.config.reportId}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}