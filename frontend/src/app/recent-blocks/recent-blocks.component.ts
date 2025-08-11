import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recent-blocks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-blocks.component.html',
  styleUrl: './recent-blocks.component.scss'
})
export class RecentBlocksComponent {
  @Input() dashboardData: any;
  
  // Input method that will be passed from parent
  @Input() getTimeAgo!: (timestamp: any) => string;
}