#!/bin/bash

# Ethereum Mining Pool Dashboard - Setup Script
# This script sets up the development environment and starts both frontend and backend

echo "🚀 Setting up Ethereum Mining Pool Dashboard..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d 'v' -f 2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Angular 18+ requires Node.js 18+."
    echo "   Please upgrade Node.js or use Angular 17 compatible version."
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..

# Initialize database
echo "💾 Initializing database..."
cd backend
npx ts-node src/database/migrate.ts
cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🔧 Available commands:"
echo "  npm run dev              - Start both frontend and backend in development mode"
echo "  npm run frontend:dev     - Start only frontend (http://localhost:4200)"
echo "  npm run backend:dev      - Start only backend (http://localhost:3000)"
echo "  npm run build           - Build both frontend and backend for production"
echo ""
echo "🌐 Development URLs:"
echo "  Frontend: http://localhost:4200"
echo "  Backend API: http://localhost:3000"
echo "  API Health Check: http://localhost:3000/health"
echo ""
echo "📊 API Endpoints:"
echo "  GET /api/pools                    - Get all mining pools"
echo "  GET /api/pools/:id                - Get specific pool details"
echo "  GET /api/pools/:id/history        - Get pool historical data"
echo "  GET /api/pools/compare            - Compare multiple pools"
echo "  GET /api/stats/dashboard          - Get dashboard statistics"
echo "  POST /api/alerts/subscribe        - Subscribe to alerts"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""