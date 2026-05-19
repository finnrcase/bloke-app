import Constants from 'expo-constants';

type PublicEnv = {
  isDemoMode: boolean;
  mapboxToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type PublicEnvName =
  | 'EXPO_PUBLIC_DEMO_MODE'
  | 'EXPO_PUBLIC_MAPBOX_TOKEN'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_SUPABASE_URL';

function readPublicEnv(name: PublicEnvName) {
  const processValue = getProcessEnv(name);
  const extraValue = Constants.expoConfig?.extra?.[name];

  if (typeof processValue === 'string' && processValue.length > 0) {
    return processValue;
  }

  if (typeof extraValue === 'string' && extraValue.length > 0) {
    return extraValue;
  }

  return '';
}

function getProcessEnv(name: PublicEnvName) {
  if (name === 'EXPO_PUBLIC_DEMO_MODE') {
    return process.env.EXPO_PUBLIC_DEMO_MODE;
  }

  if (name === 'EXPO_PUBLIC_MAPBOX_TOKEN') {
    return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  }

  if (name === 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
    return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }

  return process.env.EXPO_PUBLIC_SUPABASE_URL;
}

function readBooleanEnv(name: PublicEnvName) {
  return readPublicEnv(name).toLowerCase() === 'true';
}

export const env: PublicEnv = {
  isDemoMode: readBooleanEnv('EXPO_PUBLIC_DEMO_MODE'),
  mapboxToken: readPublicEnv('EXPO_PUBLIC_MAPBOX_TOKEN'),
  supabaseUrl: readPublicEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};

export function assertSupabaseEnv() {
  if (env.isDemoMode) {
    return;
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or set EXPO_PUBLIC_DEMO_MODE=true for a local demo.',
    );
  }
}
