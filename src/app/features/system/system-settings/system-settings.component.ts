import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemSetting, SystemSettingsService } from '../../../core/services/system-settings.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.css'
})
export class SystemSettingsComponent {
  private readonly settingsService = inject(SystemSettingsService);
  settings: SystemSetting[] = [];
  loading = false;
  savingKey: string | null = null;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settingsService.getAll().subscribe({
      next: settings => { this.settings = settings; this.loading = false; },
      error: () => { this.error = 'Unable to load system settings.'; this.loading = false; }
    });
  }

  save(setting: SystemSetting): void {
    this.savingKey = setting.key;
    this.message = '';
    this.error = '';
    this.settingsService.update(setting.key, setting.value).subscribe({
      next: updated => {
        setting.value = updated.value;
        this.message = `${setting.key} updated.`;
        this.savingKey = null;
      },
      error: error => {
        this.error = error?.error?.error || 'Unable to update system setting.';
        this.savingKey = null;
      }
    });
  }
}
