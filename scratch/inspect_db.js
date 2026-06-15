const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: depts, error: dErr } = await supabase
    .from('departments')
    .select('*');
  
  if (dErr) {
    console.error('Error fetching departments:', dErr);
  } else {
    console.log('--- Departments in Database ---');
    console.log(depts);
  }

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, department_id');

  if (pErr) {
    console.error('Error fetching profiles:', pErr);
  } else {
    console.log('\n--- Profiles in Database ---');
    console.log(profiles);
  }
}

main();
