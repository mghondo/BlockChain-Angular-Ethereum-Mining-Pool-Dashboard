import { DatabaseService } from '../services/DatabaseService';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting database migration...');
  
  try {
    const dbService = new DatabaseService();
    await dbService.initialize();
    
    // Seed development data if enabled
    if (process.env.DEV_SEED_DATA === 'true' || process.env.NODE_ENV === 'development') {
      const seedPath = path.join(__dirname, '../../database/seeds/01_initial_data.sql');
      
      if (fs.existsSync(seedPath)) {
        console.log('🌱 Loading seed data...');
        const seedData = fs.readFileSync(seedPath, 'utf8');
        
        const statements = seedData
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          try {
            await dbService.execute(statement);
          } catch (error: any) {
            if (!error.message.includes('UNIQUE constraint failed') && 
                !error.message.includes('already exists')) {
              console.warn('⚠️  Seed statement warning:', error.message);
            }
          }
        }
        
        console.log('✅ Seed data loaded successfully');
      }
    }
    
    await dbService.close();
    console.log('✅ Database migration completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}