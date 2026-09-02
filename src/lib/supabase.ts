import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

function resolveSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return '';
  }
  const trimmed = rawUrl.trim();
  // If the dashboard URL was pasted (e.g. https://supabase.com/dashboard/project/<ref>), extract ref to build API URL
  const dashboardMatch = trimmed.match(/\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return trimmed;
}

const rawSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ||
  '';

const rawSupabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ||
  '';

export const supabaseUrl = resolveSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = rawSupabaseAnonKey.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Warning: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing in the environment configuration.'
  );
}

import { Platform } from 'react-native';

const isServer = Platform.OS === 'web' && typeof window === 'undefined';

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
