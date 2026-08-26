import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-compliance-certificate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-certificate.html',
  styleUrls: ['./compliance-certificate.scss'],
})
export class ComplianceCertificateComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  certificateId = 'DV-CERT-4164163896';
  dateGenerated = '16 July 2026 at 03:09:23';
  createdBy = this.generatedBy();
  validationScore = 100;
  complianceStatus = 'COMPLIANT';
  entityName = 'Fourier IT (PTY) LTD';
  validUntil = '16 July 2027 at 03:09:23';
  verificationHash = '#BD2CC459156CBB850CB6E34DFB6A3A5D72D591A25';

  private generatedBy(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Unknown User';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email || 'Unknown User';
  }

  goBack(): void {
    this.router.navigate(['/reports/compliance']);
  }

  print(): void {
    window.print();
  }

  async downloadPdf(): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setTextColor(15, 118, 110);
    pdf.setFontSize(20);
    pdf.text('DocuVault Compliance Certificate', 20, 30);
    pdf.setTextColor(23, 33, 43);
    pdf.setFontSize(11);
    const rows = [
      ['Certificate ID', this.certificateId],
      ['Date generated', this.dateGenerated],
      ['Created by', this.createdBy],
      ['Entity', this.entityName],
      ['Compliance status', this.complianceStatus],
      ['Validation score', `${this.validationScore}%`],
      ['Valid until', this.validUntil],
      ['Verification hash', this.verificationHash],
    ];
    rows.forEach(([label, value], index) => {
      const y = 50 + index * 14;
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 20, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 75, y);
    });
    pdf.save(`${this.certificateId}.pdf`);
  }
}
