import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Testing supabase upload...');
  const fileContent = 'dummy image data';
  const filePath = 'test-ot-id/' + Date.now() + '.jpg';

  const { data, error } = await supabase.storage
    .from('ot-evidencias')
    .upload(filePath, fileContent, {
      contentType: 'image/jpeg'
    });

  if (error) {
    console.error('Upload failed!', error);
  } else {
    console.log('Upload succeeded!', data);
  }
}

run();
