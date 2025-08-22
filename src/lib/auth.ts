import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';

export async function getCurrentUser() {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile;
}

export async function createProfile(userId: string, fullName?: string, role: 'ADMIN' | 'LEADER' = 'LEADER') {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      role,
      full_name: fullName,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'ADMIN';
}

export function isLeader(profile: Profile | null): boolean {
  return profile?.role === 'LEADER';
}