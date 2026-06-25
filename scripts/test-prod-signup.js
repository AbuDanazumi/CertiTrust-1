import { createClient } from '@supabase/supabase-js';

const url = 'https://wauupoylwkheoknmtzzs.supabase.co';
const key = 'sb_publishable_6LKqs-TWBvJRj1G3z3Sa5g_SpmzNJeK';

const supabase = createClient(url, key);

async function testSignup() {
  const email = `test-univ-${Math.floor(Math.random() * 1000000)}@gmail.com`;
  console.log('Starting signup for:', email);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: {
        display_name: 'Test University Client',
        intended_role: 'institution',
        account_type: 'institution',
        organization_name: null,
        onboarding_payload: {
          institution_name: 'Test University Live',
          email: email,
          phone: '1234567890',
          website: 'https://univ.edu',
          country: 'US',
          institution_type: 'Higher Education',
          address: '123 Univ St',
          city: 'Univ City',
          state_province: 'Univ State',
        }
      }
    }
  });

  if (error) {
    console.error('Signup failed:');
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log('Signup succeeded!');
    console.log(JSON.stringify(data, null, 2));
  }
}

testSignup();
