import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fill these in — Project Settings → API in your Supabase dashboard.
// For production, prefer environment variables (Expo supports the
// EXPO_PUBLIC_ prefix natively since SDK 49): create a `.env` file with
//   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxx
// and this file will pick them up automatically. Never commit real
// keys — the anon key is safe for client use ONLY because Row Level
// Security is enabled on every table (see README).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
