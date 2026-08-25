import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ComplianceDashboardSnapshot } from '../../../core/services/compliance.service';

@Component({
  selector: 'app-compliance-snapshot-widgets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-snapshot-widgets.component.html',
  styleUrl: './compliance-snapshot-widgets.component.scss'
})
export class ComplianceSnapshotWidgetsComponent {
  readonly snapshot = input<ComplianceDashboardSnapshot | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  riskClass(): string {
    const risk = this.snapshot()?.risk.riskCategory?.trim().toLowerCase();
    return ['critical', 'high', 'medium', 'low'].includes(risk ?? '') ? `risk--${risk}` : 'risk--unknown';
  }

  riskLabel(): string {
    const value = this.snapshot()?.risk.riskCategory?.trim();
    return value && ['Critical', 'High', 'Medium', 'Low'].includes(value) ? value : 'Unknown';
  }

  formatDays(daysRemaining: number): string {
    if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
    if (daysRemaining === 0) return 'Due today';
    return `${daysRemaining} days remaining`;
  }
}
