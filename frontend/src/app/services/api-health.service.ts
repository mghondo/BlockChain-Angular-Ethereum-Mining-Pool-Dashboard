import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, catchError, of } from 'rxjs';
import { map, timeout } from 'rxjs/operators';

export interface ApiHealthStatus {
  isOnline: boolean;
  lastChecked: Date;
  responseTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private readonly API_URL = 'http://localhost:3000';
  private readonly HEALTH_CHECK_INTERVAL = 5000; // Check every 5 seconds
  private readonly REQUEST_TIMEOUT = 3000; // 3 second timeout

  private healthStatusSubject = new BehaviorSubject<ApiHealthStatus>({
    isOnline: true, // Start optimistic
    lastChecked: new Date()
  });

  public healthStatus$ = this.healthStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    // Initial health check
    this.performHealthCheck();

    // Periodic health checks
    interval(this.HEALTH_CHECK_INTERVAL).subscribe(() => {
      this.performHealthCheck();
    });
  }

  private performHealthCheck(): void {
    const startTime = Date.now();
    
    this.http.get(`${this.API_URL}/health`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map(() => {
          const responseTime = Date.now() - startTime;
          return {
            isOnline: true,
            lastChecked: new Date(),
            responseTime
          };
        }),
        catchError((error) => {
          console.warn('API Health Check Failed:', error.message || error);
          return of({
            isOnline: false,
            lastChecked: new Date()
          });
        })
      )
      .subscribe(status => {
        this.healthStatusSubject.next(status);
      });
  }

  getCurrentStatus(): ApiHealthStatus {
    return this.healthStatusSubject.value;
  }

  isApiOnline(): boolean {
    return this.healthStatusSubject.value.isOnline;
  }
}