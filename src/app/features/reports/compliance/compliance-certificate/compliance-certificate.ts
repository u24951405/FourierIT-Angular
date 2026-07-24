import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  selector: 'app-compliance-certificate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-certificate.html',
  styleUrls: ['./compliance-certificate.scss'],
})
export class ComplianceCertificateComponent {
  private router = inject(Router);

  certificateId = 'DV-CERT-4164163896';
  dateGenerated = '16 July 2026 at 03:09:23';
  createdBy = 'Admin User';
  validationScore = 100;
  complianceStatus = 'COMPLIANT';
  entityName = 'Fourier IT (PTY) LTD';
  validUntil = '16 July 2027 at 03:09:23';
  verificationHash = '#BD2CC459156CBB850CB6E34DFB6A3A5D72D591A25';

  goBack(): void {
    this.router.navigate(['/reports/compliance']);
  }

  print(): void {
    window.print();
  }

  async downloadPdf(): Promise<void> {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const element = document.getElementById('certificate-printable');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${this.certificateId}.pdf`);
  }
}
