// Get comprehensive database overview
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getDatabaseOverview() {
  console.log('🔍 DATABASE OVERVIEW\n');
  console.log('='.repeat(80));

  try {
    // 1. Auth Users
    console.log('\n📧 AUTH USERS');
    console.log('-'.repeat(80));
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log(`Total auth users: ${authUsers.users.length}`);
    authUsers.users.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.user_metadata?.name || 'N/A'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    });

    // 2. User Table
    console.log('\n\n👤 USER TABLE RECORDS');
    console.log('-'.repeat(80));
    const { data: dbUsers, error: userError } = await supabase
      .from('User')
      .select('id, email, name, role, createdAt');

    if (userError) {
      console.log('❌ Error:', userError.message);
    } else {
      console.log(`Total User records: ${dbUsers.length}`);
      dbUsers.forEach((user, i) => {
        console.log(`\n${i + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
      });
    }

    // 3. Check for orphaned auth users
    console.log('\n\n⚠️  ORPHANED AUTH USERS (No User record)');
    console.log('-'.repeat(80));
    const dbUserIds = new Set((dbUsers || []).map(u => u.id));
    const orphaned = authUsers.users.filter(u => !dbUserIds.has(u.id));

    if (orphaned.length === 0) {
      console.log('✅ None - All auth users have User records');
    } else {
      console.log(`Found ${orphaned.length} orphaned auth users:`);
      orphaned.forEach((user, i) => {
        console.log(`\n${i + 1}. ${user.email} (ID: ${user.id})`);
      });
    }

    // 4. Tests
    console.log('\n\n📝 TESTS');
    console.log('-'.repeat(80));
    const { data: tests, error: testError } = await supabase
      .from('Test')
      .select('id, userId, title, status, createdAt')
      .order('createdAt', { ascending: false })
      .limit(10);

    if (testError) {
      console.log('❌ Error:', testError.message);
    } else {
      console.log(`Total recent tests: ${tests.length}`);
      tests.forEach((test, i) => {
        const user = dbUsers?.find(u => u.id === test.userId);
        console.log(`\n${i + 1}. ${test.title}`);
        console.log(`   User: ${user?.email || test.userId}`);
        console.log(`   Status: ${test.status}`);
        console.log(`   Created: ${new Date(test.createdAt).toLocaleString()}`);
      });
    }

    // 5. RLS Status
    console.log('\n\n🔒 ROW LEVEL SECURITY STATUS');
    console.log('-'.repeat(80));

    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status');

    // Try alternative query
    const tables = ['User', 'Test', 'Answer', 'Progress', 'StudyNote'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`${table}: ❌ ${error.message}`);
      } else {
        console.log(`${table}: ✅ Accessible`);
      }
    }

    // 6. Database Triggers
    console.log('\n\n⚡ DATABASE TRIGGERS');
    console.log('-'.repeat(80));
    console.log('Checking for handle_new_user trigger...');

    // Check if trigger exists by trying to query pg_catalog
    console.log('Note: Trigger status requires SQL query in Supabase Dashboard');
    console.log('Run this SQL to check:');
    console.log('  SELECT * FROM pg_trigger WHERE tgname = \'on_auth_user_created\';');

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Auth Users: ${authUsers.users.length}`);
    console.log(`✓ User Records: ${dbUsers?.length || 0}`);
    console.log(`⚠ Orphaned Users: ${orphaned.length}`);
    console.log(`✓ Tests: ${tests?.length || 0}`);

    if (orphaned.length > 0) {
      console.log('\n🔧 ACTION NEEDED:');
      console.log('Run SQL to create missing User records:');
      console.log('\nINSERT INTO public."User" (id, email, name, "createdAt", "updatedAt", password)');
      console.log('SELECT id::text, email, COALESCE(raw_user_meta_data->>\'name\', split_part(email, \'@\', 1)), NOW(), NOW(), NULL');
      console.log('FROM auth.users WHERE id::text NOT IN (SELECT id FROM public."User");');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

getDatabaseOverview();
