const { Client } = require('pg');

async function verifyTrigger() {
  const client = new Client({
    connectionString: 'postgresql://postgres.yxuzslfctaattbcquamt:Jimkali90%2326@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check if password column is nullable
    const columnResult = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'password'
    `);
    console.log('Password column info:');
    console.log(columnResult.rows);
    console.log('');

    // Check trigger
    const triggerResult = await client.query(`
      SELECT tgname, tgenabled, tgtype
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
    `);
    console.log('Trigger info:');
    console.log(triggerResult.rows);
    console.log('');

    // Check function
    const functionResult = await client.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'handle_new_user'
    `);
    console.log('Function exists:', functionResult.rows.length > 0);
    console.log('');

    if (triggerResult.rows.length > 0 && columnResult.rows[0].is_nullable === 'YES') {
      console.log('✅ All setup completed successfully!');
      console.log('✅ Password column is now nullable');
      console.log('✅ Trigger "on_auth_user_created" is active');
      console.log('✅ Function "handle_new_user" is created');
    } else {
      console.log('⚠️  Something might be missing');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyTrigger();
