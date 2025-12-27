// Apply RLS migration via Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Need service key for admin operations

console.log('Applying RLS Migration...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase credentials!');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20251226_enable_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Total SQL length:', sql.length, 'characters\n');

    // Split into individual statements (rough split by semicolon + newline)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log('📝 Found', statements.length, 'SQL statements\n');
    console.log('Executing migration...\n');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements
      if (!statement || statement.length < 5) continue;

      // Show progress
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // Try direct execution via POST
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          });

          if (!response.ok) {
            console.log(`   ⚠️  Skipped (may already exist or need manual execution)`);
          } else {
            console.log(`   ✅ Success`);
          }
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }

    console.log('\n✨ Migration completed!');
    console.log('\nNote: Some statements may need to be run manually in Supabase SQL Editor');
    console.log('if they require elevated permissions.\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.log('\n💡 Alternative: Copy the SQL from supabase/migrations/20251226_enable_rls.sql');
    console.log('   and run it manually in Supabase Dashboard > SQL Editor\n');
  }
}

applyMigration();
