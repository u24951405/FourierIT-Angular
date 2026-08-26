import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css'
})
export class HelpComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.fragment.subscribe((fragment) => {
      if (!fragment) return;

      setTimeout(() => {
        const target = document.getElementById(fragment);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    });
  }
}
