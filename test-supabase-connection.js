// Quick test to verify Supabase configuration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ ERROR: Supabase credentials are missing!');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if Supabase is reachable
    console.log('\n1. Testing Supabase connection...');
    const { data, error } = await supabase.from('User').select('count').limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);

      if (error.message.includes('JWT')) {
        console.log('\n💡 This looks like an authentication issue.');
        console.log('   Check that your NEXT_PUBLIC_SUPABASE_ANON_KEY is correct.');
      }

      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('\n💡 The User table might not exist yet.');
        console.log('   Run: npx prisma db push');
      }
    } else {
      console.log('✅ Connection successful!');
    }

    // Test 2: Try to sign up
    console.log('\n2. Testing Auth signup...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User'
        }
      }
    });

    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);

      if (signupError.message.includes('Email confirmation')) {
        console.log('\n💡 Email confirmation is required!');
        console.log('   Go to Supabase Dashboard > Authentication > Settings');
        console.log('   Disable "Enable email confirmations" for development');
      }

      if (signupError.message.includes('rate limit')) {
        console.log('\n💡 Rate limited. Try again in a few minutes.');
      }
    } else {
      console.log('✅ Signup successful!');
      console.log('   User ID:', signupData.user?.id);
      console.log('   Email confirmed:', signupData.user?.confirmed_at ? 'Yes' : 'No (requires confirmation)');

      // Clean up test user
      if (signupData.user) {
        await supabase.auth.signOut();
      }
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
  }
}

testConnection();
