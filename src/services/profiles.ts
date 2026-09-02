import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

import { Platform } from 'react-native';

const PROFILE_STORAGE_KEY = '@moovie:current_profile_key';

/**
 * Fetches all available user profiles (ana and luisa).
 */
export async function getProfiles(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('key, display_name, color_hex')
      .order('display_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    return (data as Profile[]) || [];
  } catch (error: any) {
    throw new Error(`Error in getProfiles: ${error.message}`);
  }
}

/**
 * Retrieves the currently active profile key stored locally in AsyncStorage.
 */
export async function getCurrentProfileKey(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return null;
  }
  try {
    return await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  } catch (error: any) {
    throw new Error(`Failed to read current profile key from storage: ${error.message}`);
  }
}

/**
 * Persists the active profile key in AsyncStorage.
 */
export async function setCurrentProfileKey(key: string): Promise<void> {
  if (!key) {
    throw new Error('A valid profile key must be provided.');
  }

  try {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, key);
  } catch (error: any) {
    throw new Error(`Failed to save current profile key to storage: ${error.message}`);
  }
}

/**
 * Clears the active profile key from local storage.
 */
export async function clearCurrentProfileKey(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (error: any) {
    throw new Error(`Failed to clear current profile key from storage: ${error.message}`);
  }
}
