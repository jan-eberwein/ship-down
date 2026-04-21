import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
let supabaseUrl = '';
let serviceRoleKey = '';

for (const line of envContent.split('\n')) {
  if (line.startsWith('SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
}

async function run() {
  const url = `${supabaseUrl}/rest/v1/rooms?select=room_code,updated_at`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log('Rooms in DB:', data.map(r => r.room_code).join(', '));
}

run();
