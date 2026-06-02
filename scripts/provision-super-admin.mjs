/**
 * One-time super admin provisioning (run locally, never commit secrets).
 *
 *   $env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   $env:SUPER_ADMIN_EMAIL="you@example.com"
 *   $env:SUPER_ADMIN_PASSWORD="your-secure-password"
 *   node scripts/provision-super-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error(
    "Missing env. Set SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}

let userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;

if (!userId) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    console.error("createUser failed:", createError.message);
    process.exit(1);
  }
  userId = created.user.id;
  console.log("Created auth user:", userId);
} else {
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    console.error("updateUserById failed:", updateError.message);
    process.exit(1);
  }
  console.log("User already exists; password updated:", userId);
}

const { data: granted, error: grantError } = await admin.rpc("grant_super_admin", { _email: email });
if (grantError) {
  console.error("grant_super_admin failed:", grantError.message);
  process.exit(1);
}

console.log("Super admin role granted. User id:", granted ?? userId);
console.log("Sign in at /super-admin/login");
