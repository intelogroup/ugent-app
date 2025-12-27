const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    connectionString: 'postgresql://postgres.yxuzslfctaattbcquamt:Jimkali90%2326@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check auth.users
    const authUsersResult = await client.query(`
      SELECT id, email, created_at
      FROM auth.users
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('Recent auth.users:');
    console.log(authUsersResult.rows);
    console.log('');

    // Check public.User
    const publicUsersResult = await client.query(`
      SELECT id, email, name, "createdAt"
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);
    console.log('Recent public.User records:');
    console.log(publicUsersResult.rows);
    console.log('');

    // Compare counts
    const authCount = await client.query('SELECT COUNT(*) FROM auth.users');
    const publicCount = await client.query('SELECT COUNT(*) FROM "User"');

    console.log(`Auth users count: ${authCount.rows[0].count}`);
    console.log(`Public User count: ${publicCount.rows[0].count}`);

    if (authCount.rows[0].count !== publicCount.rows[0].count) {
      console.log('\n⚠️  Mismatch! Some auth users might not have User records.');

      // Find users in auth but not in public.User
      const missingResult = await client.query(`
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN "User" u ON au.id::text = u.id
        WHERE u.id IS NULL
      `);

      if (missingResult.rows.length > 0) {
        console.log('\nUsers in auth.users but NOT in public.User:');
        console.log(missingResult.rows);
      }
    } else {
      console.log('\n✅ All auth users have corresponding User records!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
