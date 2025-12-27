// Clean all user records from auth and database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanAllUsers() {
  console.log('🧹 Cleaning all user records...\n');

  try {
    // 1. Get all auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log(`Found ${authUsers.users.length} auth users`);

    // 2. Delete all User records from database first
    console.log('\n📊 Deleting User records from database...');
    const { error: dbError } = await supabase
      .from('User')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (dbError) {
      console.error('❌ Error deleting User records:', dbError.message);
    } else {
      console.log('✅ All User records deleted from database');
    }

    // 3. Delete all auth users
    console.log('\n🔑 Deleting auth users...');
    let deletedCount = 0;
    for (const user of authUsers.users) {
      console.log(`Deleting: ${user.email} (${user.id})`);

      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Deleted`);
        deletedCount++;
      }
    }

    console.log('\n✨ Cleanup complete!');
    console.log(`   Deleted ${deletedCount}/${authUsers.users.length} auth users`);
    console.log('   Deleted all User records from database');

    console.log('\n📝 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Sign up with a fresh account');
    console.log('   3. The trigger will auto-create the User record');
    console.log('   4. Test creating a test!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

cleanAllUsers();
