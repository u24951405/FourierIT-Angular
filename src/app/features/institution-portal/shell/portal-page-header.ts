import { Component, Input } from '@angular/core';

/** The heading every institution portal page starts with: a title, a short explanation and optional actions. */
@Component({
  selector: 'app-portal-page-header',
  standalone: true,
  template: `
    <header class="pph">
      <div class="pph__text">
        <h1 class="pph__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="pph__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="pph__actions"><ng-content /></div>
    </header>
  `,
  styles: [`
    .pph {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }
    .pph__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0f172a;
    }
    .pph__subtitle {
      margin: 0.3rem 0 0;
      max-width: 62ch;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #64748b;
    }
    .pph__actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .pph__actions:empty { display: none; }
  `]
})
export class PortalPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}
