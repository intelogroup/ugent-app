// Fix missing User records for existing auth users
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserRecords() {
  console.log('🔍 Checking for missing User records...\n');

  try {
    // 1. Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    console.log(`Found ${authUsers.users.length} auth users\n`);

    // 2. Get all User records
    const { data: dbUsers, error: dbError } = await supabase
      .from('User')
      .select('id');

    if (dbError) {
      console.error('❌ Error fetching User records:', dbError.message);
      return;
    }

    const dbUserIds = new Set(dbUsers.map(u => u.id));
    console.log(`Found ${dbUsers.length} User records in database\n`);

    // 3. Find auth users without User records
    const missingUsers = authUsers.users.filter(u => !dbUserIds.has(u.id));

    if (missingUsers.length === 0) {
      console.log('✅ All auth users have corresponding User records!');
      console.log('\n💡 If you\'re still getting "User not found", try:');
      console.log('   1. Logging out completely');
      console.log('   2. Signing up with a NEW email address');
      return;
    }

    console.log(`⚠️  Found ${missingUsers.length} auth users without User records:\n`);

    // 4. Create missing User records
    for (const authUser of missingUsers) {
      const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';

      console.log(`Creating User record for: ${authUser.email}`);
      console.log(`  - ID: ${authUser.id}`);
      console.log(`  - Name: ${name}`);

      const { data, error } = await supabase
        .from('User')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

      if (error) {
        console.error(`  ❌ Error:`, error.message);
      } else {
        console.log(`  ✅ Created!\n`);
      }
    }

    console.log('\n✨ Done! User records have been synced.');
    console.log('\n📝 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. You should now be able to create tests!');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

fixUserRecords();
