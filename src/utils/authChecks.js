import { supabase } from '../supabaseClient';

// Backed by the `check_email_status` Postgres function — see
// supabase/sql/check_email_status.sql for what it does and why (and how
// to install it; the app works without it, just with less specific
// error messages — see the try/catch around every call site of this).
//
// Returns 'not_registered' | 'password' | 'google'.
export async function checkEmailStatus(email) {
  const { data, error } = await supabase.rpc('check_email_status', {
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}
