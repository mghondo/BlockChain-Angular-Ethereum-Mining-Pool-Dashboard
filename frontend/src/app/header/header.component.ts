import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiHealthService, ApiHealthStatus } from '../services/api-health.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  apiStatus: ApiHealthStatus = { isOnline: true, lastChecked: new Date() };
  private healthSubscription?: Subscription;

  constructor(private apiHealthService: ApiHealthService) {}

  ngOnInit(): void {
    // Subscribe to API health status changes
    this.healthSubscription = this.apiHealthService.healthStatus$.subscribe(
      status => {
        this.apiStatus = status;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
    }
  }

  get statusText(): string {
    return this.apiStatus.isOnline ? 'Live Data' : 'Offline';
  }

  get statusClass(): string {
    return this.apiStatus.isOnline ? 'live-indicator online me-1' : 'live-indicator offline me-1';
  }
}
