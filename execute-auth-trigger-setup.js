const { Client } = require('pg');
const fs = require('fs');

async function executeSQL() {
  const client = new Client({
    connectionString: 'postgresql://postgres.yxuzslfctaattbcquamt:Jimkali90%2326@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read SQL file
    const sql = fs.readFileSync('setup_auth_trigger.sql', 'utf8');

    // Execute SQL
    console.log('Executing SQL...\n');
    const result = await client.query(sql);

    console.log('SQL executed successfully!');
    console.log('\nResults:');
    console.log(result);

  } catch (error) {
    console.error('Error executing SQL:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeSQL();
