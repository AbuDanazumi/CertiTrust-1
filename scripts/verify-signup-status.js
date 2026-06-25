import { createClient } from '@supabase/supabase-js';

const url = 'https://wauupoylwkheoknmtzzs.supabase.co';
const key = 'sb_publishable_6LKqs-TWBvJRj1G3z3Sa5g_SpmzNJeK';

const supabase = createClient(url, key);

async function verifyStatus() {
  const email = 'test-univ-507662@gmail.com';
  console.log('Checking onboarding status for:', email);
  
  const { data, error } = await supabase.rpc('check_onboarding_status', {
    _email: email
  });

  if (error) {
    console.error('RPC failed:', error);
  } else {
    console.log('Onboarding status result:');
    console.log(JSON.stringify(data, null, 2));
  }
}

verifyStatus();
