import { execSync } from 'child_process';
import { Pool } from 'pg';

async function ensureSeed() {
  // Create a new pool using the DATABASE_URL environment variable
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {

    // Check if any business exists
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) FROM business');
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
