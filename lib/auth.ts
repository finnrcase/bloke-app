import { supabase } from '@/lib/supabase';

// Typed wrappers around Supabase email/password auth. Each returns a flat
// { error: string | null, ... } shape so screens never repeat the
// "supabase not configured" guard or unwrap `{ data, error }` themselves.

const NOT_CONFIGURED =
  'Supabase is not configured. Add your Expo public Supabase env vars.';

export type SignUpResult = { error: string | null; hasSession: boolean };
export type SignInResult = { error: string | null; userId: string | null };
export type SignOutResult = { error: string | null };

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  if (!supabase) {
    return { error: NOT_CONFIGURED, hasSession: false };
  }

  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

  if (error) {
    return { error: error.message, hasSession: false };
  }

  return { error: null, hasSession: Boolean(data.session) };
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  if (!supabase) {
    return { error: NOT_CONFIGURED, userId: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message, userId: null };
  }

  return { error: null, userId: data.user.id };
}

export async function signOutUser(): Promise<SignOutResult> {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}
