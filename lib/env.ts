import Constants from 'expo-constants';

type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function readPublicEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const processValue = process.env[name];
  const extraValue = Constants.expoConfig?.extra?.[name];

  if (typeof processValue === 'string' && processValue.length > 0) {
    return processValue;
  }

  if (typeof extraValue === 'string' && extraValue.length > 0) {
    return extraValue;
  }

  return '';
}

export const env: PublicEnv = {
  supabaseUrl: readPublicEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};

export function assertSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
}
