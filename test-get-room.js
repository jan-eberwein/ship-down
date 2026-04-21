import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
for (const line of envContent.split('\n')) {
  if (line.startsWith('SUPABASE_URL=')) process.env.SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) process.env.SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1].trim();
}

async function run() {
  // Use dynamic import to load the ts compiled module if possible, or just mock getRoom
  const url = `${process.env.SUPABASE_URL}/rest/v1/rooms?select=state&room_code=eq.KB4MY9&limit=1`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('GET Status:', response.status);
  const data = await response.json();
  console.log('GET Data:', JSON.stringify(data, null, 2));
}

run();
