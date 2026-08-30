import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-box"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="borderRadius"
    ></div>
  `,
  styles: [`
    .skeleton-box {
      display: block;
      background: linear-gradient(
        90deg,
        var(--bg-surface-subtle) 25%,
        var(--border-subtle) 50%,
        var(--bg-surface-subtle) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() borderRadius = 'var(--radius-md)';
}
