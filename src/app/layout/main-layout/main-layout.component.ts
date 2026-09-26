import { Component, HostListener, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  private readonly router = inject(Router);

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'F1') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.openHelp();
  }

  openHelp(): void {
    const helpKey = this.findHelpKey(this.router.routerState.snapshot.root);
    if (helpKey) {
      void this.router.navigate(['/help'], { fragment: helpKey });
      return;
    }

    void this.router.navigate(['/help']);
  }

  private findHelpKey(route: ActivatedRouteSnapshot | null): string | undefined {
    let current = route;
    let deepest: ActivatedRouteSnapshot | null = route;

    while (current) {
      if (current.firstChild) {
        deepest = current.firstChild;
      }
      current = current.firstChild;
    }

    let node: ActivatedRouteSnapshot | null = deepest;
    while (node) {
      const helpKey = node.data['helpKey'];
      if (helpKey) {
        return String(helpKey);
      }
      node = node.parent ?? null;
    }

    return undefined;
  }
}