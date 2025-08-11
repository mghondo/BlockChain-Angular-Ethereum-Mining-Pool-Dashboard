import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pools-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pools-grid.component.html',
  styleUrl: './pools-grid.component.scss'
})
export class PoolsGridComponent {
  @Input() pools: any[] = [];
  @Input() isLoading: boolean = false;
  
  // Input methods that will be passed from parent
  @Input() formatHashrate!: (value: number) => string;
  @Input() formatNumber!: (value: number) => string;
  @Input() getLuckClass!: (luck: number) => string;
}