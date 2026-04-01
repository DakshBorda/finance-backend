/**
 * Quick script to create the finance_db database in PostgreSQL.
 * Run this once before running migrations if the database doesn't exist.
 * 
 * Usage: node scripts/create-db.js
 */
const { Client } = require('pg');

async function createDatabase() {
  // Connect to the default 'postgres' database to create our target DB
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Daksh@011',
    database: 'postgres',
  });

  try {
    await client.connect();
    
    // Check if the database already exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'finance_db'"
    );

    if (result.rows.length === 0) {
      await client.query('CREATE DATABASE finance_db');
      console.log('Database "finance_db" created successfully.');
    } else {
      console.log('Database "finance_db" already exists.');
    }
  } catch (error) {
    console.error('Error creating database:', error.message);
    console.log('\nMake sure PostgreSQL is running and credentials are correct.');
    console.log('You can update credentials in this script or create the database manually:');
    console.log('  psql -U postgres -c "CREATE DATABASE finance_db;"');
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
