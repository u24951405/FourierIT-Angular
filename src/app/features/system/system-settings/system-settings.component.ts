import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { SystemSetting, SystemSettingsService } from '../../../core/services/system-settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { HelpContextService } from '../../../core/services/help-context.service';
import { DocumentTypeValidityComponent } from '../document-type-validity/document-type-validity.component';

type SettingsTab = 'security' | 'documents';

interface SettingGroup {
  category: string;
  description: string;
  settings: SystemSetting[];
}

const CATEGORY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'Verification codes': 'One-time codes emailed to confirm someone is who they say they are.',
  'Sessions': 'How long people stay signed in before they must sign in again.',
  'Links': 'Emailed links that open the institution portal, a document request or a password reset.',
  'Security limits': 'Protection against guessing codes and flooding inboxes with emails.',
  'Reminders': 'Follow-ups on institution requests: reminding owners, warning institutions before access ends, and how much extra time they can ask for.'
};

const TAB_URLS: Readonly<Record<SettingsTab, string>> = {
  security: '/system-settings',
  documents: '/system-settings/document-types'
};

const TAB_HELP: Readonly<Record<SettingsTab, string>> = {
  security: 'timer-settings',
  documents: 'document-validity'
};

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentTypeValidityComponent],
  templateUrl: './system-settings.component.html',
  styleUrl: './system-settings.component.css'
})
export class SystemSettingsComponent implements OnInit, OnDestroy {
  private readonly settingsService = inject(SystemSettingsService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly help = inject(HelpContextService);

  readonly activeTab = signal<SettingsTab>(
    inject(ActivatedRoute).snapshot.data['tab'] === 'documents' ? 'documents' : 'security'
  );
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly settings = signal<SystemSetting[]>([]);
  readonly savingKey = signal<string | null>(null);
  /** Unsaved values typed into the inputs, by setting key. */
  private readonly drafts = signal<Record<string, string>>({});

  /** Settings grouped by category, in the order the API lists them. */
  readonly groups = computed<SettingGroup[]>(() => {
    const groups: SettingGroup[] = [];
    for (const setting of this.settings()) {
      let group = groups.find(g => g.category === setting.category);
      if (!group) {
        group = { category: setting.category, description: CATEGORY_DESCRIPTIONS[setting.category] ?? '', settings: [] };
        groups.push(group);
      }
      group.settings.push(setting);
    }
    return groups;
  });

  ngOnInit(): void {
    this.help.set(TAB_HELP[this.activeTab()]);
    this.load();
  }

  ngOnDestroy(): void {
    this.help.set(null);
  }

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    // The tab changes only the address bar, not the route, so tell the Help button which topic is showing.
    this.help.set(TAB_HELP[tab]);
    // Keep the address in step with the tab so either section can be bookmarked or linked to.
    this.location.replaceState(TAB_URLS[tab]);
  }

  draft(setting: SystemSetting): string {
    return this.drafts()[setting.key] ?? setting.value;
  }

  setDraft(key: string, value: unknown): void {
    this.drafts.update(current => ({ ...current, [key]: value == null ? '' : String(value) }));
  }

  isDirty(setting: SystemSetting): boolean {
    return this.draft(setting) !== setting.value;
  }

  validationError(setting: SystemSetting): string | null {
    const raw = this.draft(setting).trim();
    const value = Number(raw);
    if (!raw || !Number.isInteger(value) || value < setting.min || value > setting.max) {
      return `Enter a whole number from ${setting.min} to ${setting.max}.`;
    }
    return null;
  }

  save(setting: SystemSetting, value = this.draft(setting)): void {
    if (this.savingKey() || this.validationErrorFor(setting, value)) return;

    this.savingKey.set(setting.key);
    this.settingsService.update(setting.key, value)
      .pipe(finalize(() => this.savingKey.set(null)))
      .subscribe({
        next: updated => {
          this.settings.update(list => list.map(item => item.key === updated.key ? updated : item));
          this.drafts.update(({ [setting.key]: _, ...rest }) => rest);
          this.toast.show(`${updated.title} set to ${this.formatValue(updated, Number(updated.value))}.`, 'success');
        },
        error: err => this.toast.show(err?.error?.error ?? `Could not update ${setting.title}.`, 'error')
      });
  }

  resetToDefault(setting: SystemSetting): void {
    this.save(setting, String(setting.default));
  }

  isDefault(setting: SystemSetting): boolean {
    return Number(setting.value) === setting.default;
  }

  /** "minutes", "hour", "attempts"... matched to the number shown. */
  unitLabel(setting: SystemSetting, amount: number): string {
    if (setting.unit === 'count') return amount === 1 ? 'attempt' : 'attempts';
    return amount === 1 ? setting.unit.replace(/s$/, '') : setting.unit;
  }

  formatValue(setting: SystemSetting, amount: number): string {
    return `${amount} ${this.unitLabel(setting, amount)}`;
  }

  /** A plainer reading of long values, e.g. 90 minutes → "1 hour 30 minutes". */
  plainDuration(setting: SystemSetting): string | null {
    const amount = Number(this.draft(setting));
    if (!Number.isInteger(amount)) return null;
    const perHigher = setting.unit === 'minutes' ? 60 : setting.unit === 'seconds' ? 60 : null;
    if (!perHigher || amount < perHigher) return null;

    const higher = Math.floor(amount / perHigher);
    const rest = amount % perHigher;
    const higherUnit = setting.unit === 'minutes' ? 'hour' : 'minute';
    const restUnit = setting.unit === 'minutes' ? 'minute' : 'second';
    const parts = [`${higher} ${higherUnit}${higher === 1 ? '' : 's'}`];
    if (rest) parts.push(`${rest} ${restUnit}${rest === 1 ? '' : 's'}`);
    return parts.join(' ');
  }

  private validationErrorFor(setting: SystemSetting, value: string): boolean {
    const n = Number(value);
    return !Number.isInteger(n) || n < setting.min || n > setting.max;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settingsService.getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: settings => this.settings.set(settings ?? []),
        error: () => this.error.set('Unable to load system settings.')
      });
  }
}
