import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.error(
    'Supabase environment variables are missing.\n' +
    'Required variables:\n' +
    '  VITE_SUPABASE_URL       — your Supabase project URL (e.g. https://xxxx.supabase.co)\n' +
    '  VITE_SUPABASE_ANON_KEY  — your Supabase anon/publishable key\n' +
    'Add them to the .env file in the project root.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: window.localStorage,
      storageKey: 'aqlli-navbat-auth',
      debug: false,
    },
  }
);

export const isSupabaseConfigured = isConfigured;
export const supabaseConfigError = isConfigured
  ? null
  : 'Supabase sozlanmagan. Loyiha ildizida .env fayl yarating va VITE_SUPABASE_URL hamda VITE_SUPABASE_ANON_KEY qiymatlarini kiriting.';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  url: string;
}> {
  if (!isConfigured) {
    return {
      success: false,
      message: 'Environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
      url: '',
    };
  }
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { success: false, message: `Auth check failed: ${error.message}`, url: supabaseUrl };
    }
    return { success: true, message: 'Supabase connection is working.', url: supabaseUrl };
  } catch (err) {
    return {
      success: false,
      message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      url: supabaseUrl,
    };
  }
}

export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface NavbatService {
  id: string;
  name: string;
  description: string | null;
  average_time: number;
  prefix: string;
  is_active: boolean;
  created_at: string;
}

export interface NavbatQueueSettings {
  id: string;
  service_id: string | null;
  organization_id: string | null;
  current_number: number;
  prefix: string;
  is_open: boolean;
  updated_at: string;
}

export type OrganizationType = 'clinic' | 'bank';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType | string;
  slug: string | null;
  prefix: string | null;
  is_active: boolean;
  description: string | null;
  logo_url: string | null;
  created_at: string;
}

export type QueueStatus = 'waiting' | 'serving' | 'completed' | 'skipped' | 'cancelled';

export interface NavbatQueue {
  id: string;
  queue_number: string;
  service_id: string | null;
  organization_id: string | null;
  user_id: string;
  status: QueueStatus;
  estimated_wait_time: number;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface NavbatQueueWithService extends NavbatQueue {
  service: NavbatService | null;
  organization: Organization | null;
}

export interface NavbatQueueWithDetails extends NavbatQueue {
  service: NavbatService | null;
  organization: Organization | null;
  profile: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
