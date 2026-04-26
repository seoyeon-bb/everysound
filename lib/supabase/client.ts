import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser: SupabaseClient | null =
  URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

export const isSupabaseClientConfigured = Boolean(URL && KEY);
