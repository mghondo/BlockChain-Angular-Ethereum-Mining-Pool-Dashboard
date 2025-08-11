import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-stats.component.html',
  styleUrl: './dashboard-stats.component.scss'
})
export class DashboardStatsComponent {
  @Input() dashboardData: any;
  @Input() isLoading: boolean = false;
  
  // Input methods that will be passed from parent
  @Input() formatHashrate!: (value: number) => string;
  @Input() formatNumber!: (value: number) => string;
  @Input() formatDifficulty!: (value: number) => string;
}