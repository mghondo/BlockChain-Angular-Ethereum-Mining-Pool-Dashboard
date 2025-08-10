const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Ethereum Mining Pool Dashboard...');
console.log('📁 Working directory:', process.cwd());

// Create basic development database
const dbPath = path.join(__dirname, 'backend', 'dev.db');
if (!fs.existsSync(dbPath)) {
  console.log('💾 Creating development database...');
  // Simple database creation will be handled by the server
}

// Start the backend server
const backendPath = path.join(__dirname, 'backend', 'src', 'server.ts');
console.log('🔧 Starting backend server...');
console.log('📂 Backend path:', backendPath);

if (!fs.existsSync(backendPath)) {
  console.error('❌ Backend server file not found:', backendPath);
  process.exit(1);
}

const serverProcess = spawn('npx', [
  'ts-node', 
  backendPath
], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'sqlite:./dev.db',
    DATABASE_TYPE: 'sqlite',
    DEV_SEED_DATA: 'true'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
});

serverProcess.on('exit', (code) => {
  console.log(`🔌 Server process exited with code ${code}`);
});

console.log('');
console.log('✅ Server starting...');
console.log('🌐 Backend will be available at: http://localhost:3000');
console.log('📊 API Health Check: http://localhost:3000/health');
console.log('');
console.log('Press Ctrl+C to stop the server');