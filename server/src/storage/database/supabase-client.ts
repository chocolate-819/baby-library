import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;
let supabaseClient: SupabaseClient | null = null;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded) {
    return;
  }
  // dotenv 已在文件顶部通过 import 'dotenv/config' 加载
  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials | null {
  loadEnv();

  // 支持多种环境变量名称
  const url = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('Warning: Supabase credentials not configured. Database features will be limited.');
    return null;
  }

  return { url, anonKey };
}

function getSupabaseClient(token?: string): SupabaseClient {
  if (supabaseClient && !token) {
    return supabaseClient;
  }

  const credentials = getSupabaseCredentials();

  if (!credentials) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }

  const { url, anonKey } = credentials;

  if (token) {
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  supabaseClient = createClient(url, anonKey, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

export { loadEnv, getSupabaseCredentials, getSupabaseClient };
