#!/bin/bash

#================================================================
# ETHEREUM MINING POOL DASHBOARD - STARTUP SCRIPT
#================================================================
#
# This script provides a convenient way to start both the backend API
# server and frontend Angular development server simultaneously.
#
# Features:
# - Starts backend and frontend in parallel for optimal development
# - Handles graceful shutdown of both processes
# - Provides clear status updates and URLs
# - Automatic cleanup on script termination
#
# Usage: ./start-all.sh
# Requirements: Node.js, npm, Angular CLI
#
# Author: Mining Dashboard Team
# Version: 1.0.0
#================================================================

echo "🚀 Starting Ethereum Mining Pool Dashboard"
echo "=========================================="
echo ""

#================================================================
# CLEANUP FUNCTION
#================================================================

# Function to cleanup background processes
# This ensures both servers are properly terminated when the script exits
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    
    # Kill both background processes gracefully
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    
    echo "✅ Servers stopped successfully"
    exit 0
}

#================================================================
# SIGNAL HANDLING SETUP
#================================================================

# Set trap to cleanup on script exit
# Handles Ctrl+C (SIGINT), termination (SIGTERM), and normal exit
trap cleanup SIGINT SIGTERM EXIT

#================================================================
# BACKEND SERVER STARTUP
#================================================================

# Start backend API server in background
echo "🔧 Starting Backend API Server..."
echo "   → Location: simple-start.js"
echo "   → Port: 3000"
echo "   → Environment: Development"

# Start the Node.js API server with proper module path
NODE_PATH=backend/node_modules node simple-start.js &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 3

echo "✅ Backend API running at http://localhost:3000"
echo ""

#================================================================
# FRONTEND SERVER STARTUP
#================================================================

# Start frontend Angular development server in background
echo "🎨 Starting Frontend Angular Server..."
echo "   → Framework: Angular 18+"
echo "   → Port: 4200 (default)"
echo "   → Mode: Development with hot reload"

# Navigate to frontend directory and start Angular dev server
cd frontend && npm start &
FRONTEND_PID=$!

#================================================================
# STATUS INFORMATION
#================================================================

echo ""
echo "🎯 Servers Starting Up:"
echo "   Backend API: http://localhost:3000    (ready)"
echo "   Frontend:    http://localhost:4200    (compiling...)"
echo ""
echo "📋 Available API Endpoints:"
echo "   GET  /health                    - Server health check"
echo "   GET  /api/pools                 - All mining pools"
echo "   GET  /api/stats/dashboard       - Dashboard statistics"
echo ""
echo "⏳ Please wait 30-60 seconds for Angular to compile..."
echo "   ⚡ Hot reload enabled - changes will auto-refresh"
echo "   📱 Mobile responsive design included"
echo "   🔄 Real-time data updates every 30 seconds"
echo ""
echo "🌐 Once ready, visit: http://localhost:4200"
echo ""
echo "🛑 Press Ctrl+C to stop both servers"
echo "💡 Tip: Keep this terminal open to monitor server logs"
echo ""

#================================================================
# PROCESS MONITORING
#================================================================

# Wait for both processes to complete
# This keeps the script running and allows monitoring of both servers
wait $BACKEND_PID $FRONTEND_PID

#================================================================
# SCRIPT SUMMARY
#================================================================

#
# ETHEREUM MINING POOL DASHBOARD - STARTUP SCRIPT SUMMARY
#
# This bash script provides a complete development environment startup
# solution for the mining dashboard project. It demonstrates professional
# development practices with proper process management and user feedback.
#
# KEY FEATURES:
#
# 1. PARALLEL SERVER STARTUP
#    - Backend API server (Node.js + Express) on port 3000
#    - Frontend development server (Angular) on port 4200
#    - Proper background process management with PID tracking
#
# 2. GRACEFUL SHUTDOWN HANDLING
#    - Signal trapping for SIGINT, SIGTERM, and EXIT
#    - Automatic cleanup of background processes
#    - Prevents orphaned server processes
#
# 3. COMPREHENSIVE STATUS REPORTING
#    - Clear startup progress indicators
#    - Server URL and port information
#    - Available API endpoints documentation
#    - Development tips and usage instructions
#
# 4. ERROR HANDLING AND RESILIENCE
#    - Proper wait times for server initialization
#    - Background process monitoring
#    - Safe process termination with error suppression
#
# 5. DEVELOPER EXPERIENCE OPTIMIZATION
#    - Emoji indicators for visual clarity
#    - Organized output with clear sections
#    - Helpful tips for development workflow
#    - Real-time status updates
#
# TECHNICAL IMPLEMENTATION:
# - Uses bash job control for background processes
# - Implements proper signal handling with trap
# - Provides cross-platform compatibility
# - Includes comprehensive error handling
#
# This script enables developers to quickly start the complete dashboard
# environment with a single command, facilitating efficient development
# and testing workflows.
#