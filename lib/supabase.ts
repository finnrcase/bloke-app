import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { Database } from '@/types/database';

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    })
  : null;
