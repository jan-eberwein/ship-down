import fs from 'fs';
import path from 'path';

async function testSupabase() {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
  let supabaseUrl = '';
  let serviceRoleKey = '';

  for (const line of envContent.split('\n')) {
    if (line.startsWith('SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = line.split('=')[1].trim();
  }

  console.log(`URL: ${supabaseUrl}`);
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars in .env');
    return;
  }

  const endpoint = `${supabaseUrl}/rest/v1/rooms?select=*`;
  
  console.log('Fetching from:', endpoint);

  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    }
  });

  console.log('Status:', response.status);
  
  if (!response.ok) {
    console.error('Error:', await response.text());
    return;
  }

  const data = await response.json();
  console.log(`Found ${data.length} rooms.`);
  if (data.length > 0) {
    console.log('Sample room code:', data[0].room_code);
    console.log('Sample updated_at:', data[0].updated_at);
  }
}

testSupabase();
