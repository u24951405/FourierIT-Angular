import { Injectable, signal } from '@angular/core';

/**
 * The help topic for what is on screen right now, when it differs from the route's own `helpKey`
 * (for example a tab inside one page). The page sets it and clears it when it goes away.
 */
@Injectable({ providedIn: 'root' })
export class HelpContextService {
  readonly topic = signal<string | null>(null);

  set(topic: string | null): void {
    this.topic.set(topic);
  }
}
