import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');

const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function testSignup() {
    console.log("Attempting signup...");
    const { data, error } = await supabase.auth.signUp({
        email: 'test_signup_script_12345@test.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Test Setup User',
                account_type: 'client'
            }
        }
    });

    if (error) {
        console.error("SIGNUP ERROR:", error);
    } else {
        console.log("SIGNUP SUCCESS:", data);
    }
}

testSignup();
