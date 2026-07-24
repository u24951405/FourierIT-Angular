import {Component,Input,OnInit,inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface ReportFrameConfig {
  reportId: string;
  dateGenerated: string;
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

  private router = inject(Router);

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

  async downloadPdf(): Promise<void> {
    // Uses jsPDF + html2canvas
    // Dynamically imported to avoid affecting initial bundle
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const element = document.getElementById('report-printable-area');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${this.config.reportId}.pdf`);
  }
}