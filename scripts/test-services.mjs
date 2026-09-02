import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually for this test script
const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
const envVars = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const tmdbToken = envVars.EXPO_PUBLIC_TMDB_TOKEN;
const rawSupabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing TMDB...');
try {
  const res = await fetch('https://api.themoviedb.org/3/movie/popular?page=1', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tmdbToken}`,
    },
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`TMDB Success! Fetched ${data.results?.length} popular movies. First movie: "${data.results?.[0]?.title}"`);
  } else {
    console.error('TMDB Error:', data);
  }
} catch (e) {
  console.error('TMDB Fetch Exception:', e);
}

console.log('Testing Supabase URL resolution...');
let supabaseUrl = rawSupabaseUrl;
if (supabaseUrl.includes('/dashboard/project/')) {
  const match = supabaseUrl.match(/\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
}
console.log(`Resolved Supabase URL: ${supabaseUrl}`);

try {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`Supabase Success! Fetched ${data?.length} profiles:`, data);
  } else {
    console.log('Supabase response:', res.status, data);
  }
} catch (e) {
  console.error('Supabase Fetch Exception:', e);
}
