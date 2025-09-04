import { execSync } from 'child_process';
import { Pool } from 'pg';

async function ensureSeed() {
  // Create a new pool using the DATABASE_URL environment variable
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    const client = await pool.connect();
    try {
      // First, check if the businesses table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'businesses'
        );
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      
      if (!tableExists) {
        console.log('Database tables not found. Running initialization script...');
        // Run the init-db script to create tables
        execSync('npx tsx scripts/init-db.ts', { stdio: 'inherit' });
        console.log('Database initialization completed');
      }
      
      // Check if any business exists
      const result = await client.query('SELECT COUNT(*) FROM businesses');
      const businessCount = parseInt(result.rows[0].count, 10);
      
      if (businessCount === 0) {
        console.log('No business found. Running seed script...');
        // Run the seed script using npx
        execSync('npx tsx scripts/seed.ts', { stdio: 'inherit' });
        console.log('Seed completed successfully');
      } else {
        console.log('Business exists, no need to seed');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error ensuring seed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run in production
if (process.env.NODE_ENV === 'production') {
  ensureSeed();
}
