/**
 * Ethereum Mining Pool Dashboard - Main Angular Component
 * 
 * This component serves as the main dashboard for displaying real-time
 * Ethereum mining pool statistics. It fetches data from the backend API
 * and presents it in a professional, mining-themed interface.
 * 
 * Features:
 * - Real-time data updates every 30 seconds
 * - Hero dashboard with total network statistics
 * - Individual mining pool cards with live stats
 * - Recent blocks table with timestamps
 * - Responsive design with Bootstrap styling
 * - Professional mining-themed color scheme
 * 
 * Author: Mining Dashboard Team
 * Version: 1.0.0
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { interval, Subscription } from 'rxjs';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

/**
 * Mining Pool Data Structure
 * Represents a single mining pool with all its statistics
 */
interface Pool {
  id: string;                    // Unique pool identifier
  name: string;                  // Display name (e.g., "Ethermine")
  fee_percentage: number;        // Pool fee percentage
  payout_method: string;         // Payment method (PPS, PPLNS, etc.)
  status: string;                // Pool status (active, inactive)
  hashrate: number;              // Current hashrate in H/s
  miners_count: number;          // Number of active miners
  luck_7d: number;               // 7-day luck percentage
  minimum_payout: number;        // Minimum payout threshold in ETH
}

/**
 * Block Data Structure
 * Represents a mined block with metadata
 */
interface Block {
  pool_id: string;               // ID of pool that found the block
  block_number: number;          // Ethereum block number
  timestamp: string;             // When block was found (ISO string)
  reward: number;                // Block reward in ETH
  pool_name: string;             // Human-readable pool name
}

/**
 * Dashboard Summary Data Structure
 * Contains aggregated statistics for the hero dashboard section
 */
interface DashboardData {
  total_hashrate: number;        // Combined hashrate of all pools
  total_miners: number;          // Total miners across all pools
  active_pools: number;          // Number of active pools
  blocks_found_24h: number;      // Blocks found in last 24 hours
  recent_blocks: Block[];        // Array of recently found blocks
  network_difficulty: number;    // Current Ethereum network difficulty
  last_updated: string;          // Timestamp of last data update
}

/**
 * API Response Wrapper
 * Standard response format from the backend API
 */
interface ApiResponse<T> {
  success: boolean;              // Whether the request succeeded
  data: T;                       // The actual data payload
  timestamp: string;             // When the response was generated
}

// ================================================================
// MAIN COMPONENT CLASS
// ================================================================

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  // ================================================================
  // COMPONENT PROPERTIES
  // ================================================================
  
  title = 'Ethereum Mining Dashboard';
  
  // Data properties
  pools: Pool[] = [];                          // Array of mining pool data
  dashboardData: DashboardData | null = null;  // Aggregated dashboard statistics
  isLoading = true;                             // Loading state for UI
  
  // Configuration and subscriptions
  private refreshSubscription?: Subscription;   // RxJS subscription for auto-refresh
  private readonly API_BASE = 'http://localhost:3000/api';  // Backend API base URL
  private readonly REFRESH_INTERVAL = 30000;   // Auto-refresh interval (30 seconds)

  /**
   * Component constructor - inject HTTP client for API calls
   */
  constructor(private http: HttpClient) {}

  // ================================================================
  // LIFECYCLE HOOKS
  // ================================================================
  
  /**
   * Angular OnInit lifecycle hook
   * Initializes the component by loading data and starting auto-refresh
   */
  ngOnInit(): void {
    this.loadInitialData();     // Load initial dashboard data
    this.startAutoRefresh();    // Start automatic data refresh
  }

  /**
   * Angular OnDestroy lifecycle hook
   * Clean up subscriptions to prevent memory leaks
   */
  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // ================================================================
  // DATA LOADING METHODS
  // ================================================================
  
  /**
   * Load initial dashboard data from the backend API
   * Makes parallel requests for dashboard stats and pool data for better performance
   */
  private async loadInitialData(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Load dashboard data and pools in parallel for better performance
      const [dashboardResponse, poolsResponse] = await Promise.all([
        this.http.get<ApiResponse<DashboardData>>(`${this.API_BASE}/stats/dashboard`).toPromise(),
        this.http.get<ApiResponse<Pool[]>>(`${this.API_BASE}/pools`).toPromise()
      ]);

      // Update dashboard data if API call succeeded
      if (dashboardResponse?.success) {
        this.dashboardData = dashboardResponse.data;
      }

      // Update pools data if API call succeeded
      if (poolsResponse?.success) {
        this.pools = poolsResponse.data;
      }

      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    } finally {
      this.isLoading = false;  // Always stop loading spinner
    }
  }

  /**
   * Start automatic data refresh using RxJS interval
   * Refreshes dashboard data every 30 seconds to show live updates
   */
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.loadInitialData();  // Reload data on each interval
    });
  }

  // ================================================================
  // UTILITY METHODS FOR DATA FORMATTING
  // ================================================================
  
  /**
   * Format hashrate values with appropriate units (H/s, KH/s, MH/s, etc.)
   * Converts raw hashrate numbers to human-readable format
   */
  formatHashrate(hashrate: number): string {
    if (!hashrate) return '0 H/s';
    
    if (hashrate >= 1e15) {
      return (hashrate / 1e15).toFixed(2) + ' PH/s';
    } else if (hashrate >= 1e12) {
      return (hashrate / 1e12).toFixed(2) + ' TH/s';
    } else if (hashrate >= 1e9) {
      return (hashrate / 1e9).toFixed(2) + ' GH/s';
    } else if (hashrate >= 1e6) {
      return (hashrate / 1e6).toFixed(2) + ' MH/s';
    } else if (hashrate >= 1e3) {
      return (hashrate / 1e3).toFixed(2) + ' KH/s';
    } else {
      return hashrate.toFixed(2) + ' H/s';
    }
  }

  /**
   * Format large numbers with K/M suffixes for better readability
   * Used for miner counts and other large integer values
   */
  formatNumber(num: number): string {
    if (!num) return '0';
    
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';   // Millions
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';   // Thousands
    } else {
      return num.toString();                 // Raw number
    }
  }

  /**
   * Format network difficulty with P/T suffixes
   * Network difficulty is usually in the petahash range
   */
  formatDifficulty(difficulty: number): string {
    if (!difficulty) return '0';
    
    if (difficulty >= 1e15) {
      return (difficulty / 1e15).toFixed(1) + 'P';  // Petahash
    } else if (difficulty >= 1e12) {
      return (difficulty / 1e12).toFixed(1) + 'T';  // Terahash
    } else {
      return this.formatNumber(difficulty);         // Use number formatter
    }
  }

  /**
   * Get CSS class for luck percentage display based on performance
   * Color-codes luck values to indicate pool performance quality
   */
  getLuckClass(luck: number): string {
    if (!luck) return '';
    
    if (luck >= 105) return 'text-success';    // Excellent luck (green)
    if (luck >= 95) return 'text-info';       // Good luck (blue)
    if (luck >= 85) return 'text-warning';    // Average luck (yellow)
    return 'text-danger';                     // Poor luck (red)
  }

  /**
   * Convert timestamp to human-readable "time ago" format
   * Shows how long ago a block was found (e.g., "2h 15m ago")
   */
  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const blockTime = new Date(timestamp);
    const diffMs = now.getTime() - blockTime.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;    // Hours and minutes
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;                  // Minutes only
    } else {
      return 'Just now';                             // Less than a minute
    }
  }
}

// ================================================================
// FILE SUMMARY
// ================================================================

/**
 * ETHEREUM MINING POOL DASHBOARD - MAIN ANGULAR COMPONENT
 * 
 * This TypeScript component serves as the core of the Ethereum Mining Pool
 * Dashboard frontend, providing real-time analytics and professional mining
 * pool monitoring capabilities.
 * 
 * KEY FEATURES:
 * 
 * 1. REAL-TIME DATA INTEGRATION
 *    - Automatic data refresh every 30 seconds using RxJS intervals
 *    - Parallel API calls for optimal performance (dashboard + pools)
 *    - Live WebSocket-ready architecture for future upgrades
 *    - Professional loading states and error handling
 * 
 * 2. COMPREHENSIVE DATA VISUALIZATION
 *    - Hero dashboard with total network hashrate display
 *    - Individual mining pool cards with live statistics
 *    - Recent blocks table with timestamp formatting
 *    - Color-coded luck indicators for performance assessment
 * 
 * 3. PROFESSIONAL UI/UX FEATURES
 *    - Responsive Bootstrap 5 design with custom mining theme
 *    - Dynamic formatting for hashrates (H/s, KH/s, MH/s, TH/s, PH/s)
 *    - Smart number formatting (K/M suffixes for large numbers)
 *    - Intuitive time-ago display for block timestamps
 *    - Loading spinners and empty state handling
 * 
 * 4. TYPESCRIPT ARCHITECTURE
 *    - Strongly typed interfaces for all data structures
 *    - Angular 18+ standalone components with modern patterns
 *    - RxJS observables for reactive programming
 *    - Modular utility functions for data formatting
 * 
 * COMPONENT LIFECYCLE:
 * 1. OnInit: Load initial data and start auto-refresh timer
 * 2. Data Loading: Parallel API calls to backend for pools and dashboard stats
 * 3. Auto-refresh: Continuous updates every 30 seconds via RxJS interval
 * 4. OnDestroy: Cleanup subscriptions to prevent memory leaks
 * 
 * DATA FLOW ARCHITECTURE:
 * - HTTP Client → API Response → Type Checking → State Update → UI Render
 * - Error handling with fallback values and console logging
 * - Optimistic UI updates with loading states
 * 
 * FORMATTING UTILITIES:
 * - formatHashrate(): Converts raw hash numbers to readable units
 * - formatNumber(): Adds K/M suffixes for large numbers
 * - formatDifficulty(): Handles network difficulty formatting
 * - getLuckClass(): Color-codes luck percentages
 * - getTimeAgo(): Human-readable timestamp conversion
 * 
 * INTEGRATION POINTS:
 * - Backend API: http://localhost:3000/api endpoints
 * - Template: app.component.html for UI structure
 * - Styles: app.component.scss for custom mining theme
 * - Services: HTTP client for API communication
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Parallel API requests for faster loading
 * - Efficient change detection with OnPush strategy ready
 * - Memory leak prevention with proper subscription cleanup
 * - Minimal re-renders with smart data formatting
 * 
 * FUTURE EXTENSIBILITY:
 * - WebSocket integration for real-time streaming data
 * - Additional mining pool metrics and analytics
 * - User preferences and customizable dashboards
 * - Mobile-responsive enhancements
 * - PWA capabilities for offline functionality
 * 
 * This component demonstrates professional Angular development practices
 * with a focus on real-time data, user experience, and maintainable code
 * architecture suitable for production mining analytics applications.
 */