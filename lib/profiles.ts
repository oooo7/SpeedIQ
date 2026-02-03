import type { SupabaseClient } from "@supabase/supabase-js";

import type { Profile, ProfileUpdate } from "@/types/profile";

type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
};

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<SupabaseResult<Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return {
    data: data ?? null,
    error: error?.message ?? null,
  };
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: ProfileUpdate
): Promise<SupabaseResult<Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  return {
    data: data ?? null,
    error: error?.message ?? null,
  };
}
