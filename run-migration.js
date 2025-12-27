// Run SQL migration using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration...\n');

  const migrations = [
    {
      name: 'Make password nullable',
      sql: 'ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;'
    },
    {
      name: 'Create handle_new_user function',
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
          INSERT INTO public."User" (id, email, name, "createdAt", "updatedAt", password)
          VALUES (
            NEW.id::text,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            NOW(),
            NOW(),
            NULL
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    },
    {
      name: 'Create trigger on auth.users',
      sql: `
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
    }
  ];

  for (const migration of migrations) {
    console.log(`Running: ${migration.name}...`);

    try {
      // Use fetch to call Supabase REST API with raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: migration.sql })
      });

      const result = await response.text();

      if (!response.ok) {
        console.log(`  ⚠️  Response: ${result}`);
        console.log(`  Note: This might need to be run in Supabase SQL Editor\n`);
      } else {
        console.log(`  ✅ Success\n`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}\n`);
    }
  }

  console.log('\n📋 Migration Summary:');
  console.log('The migration needs to be run in Supabase SQL Editor.');
  console.log('\nCopy and paste this complete SQL:\n');
  console.log('='.repeat(80));

  const completeSql = `
-- Make password nullable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Create function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "createdAt", "updatedAt", password)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW(),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger was created
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
`;

  console.log(completeSql);
  console.log('='.repeat(80));
  console.log('\n✅ Run this in: https://yxuzslfctaattbcquamt.supabase.co/project/yxuzslfctaattbcquamt/sql/new\n');
}

runMigration();
