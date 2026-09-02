import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentProfileKey, getProfiles, setCurrentProfileKey, clearCurrentProfileKey } from '../services/profiles';
import { Profile } from '../types';

interface ProfileContextType {
  currentUser: Profile | null;
  availableProfiles: Profile[];
  isLoading: boolean;
  setCurrentUser: (profile: Profile | null) => Promise<void>;
  switchProfile: (profileKey: string) => Promise<void>;
  logoutProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<Profile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initializeProfile() {
      try {
        const [profiles, savedKey] = await Promise.all([
          getProfiles().catch(() => [] as Profile[]),
          getCurrentProfileKey().catch(() => null),
        ]);

        setAvailableProfiles(profiles);

        if (savedKey) {
          const matched = profiles.find((p) => p.key === savedKey);
          if (matched) {
            setCurrentUserState(matched);
          } else {
            // Fallback profile if server did not return it yet
            setCurrentUserState({
              key: savedKey,
              display_name: savedKey === 'ana' ? 'Cowana' : savedKey === 'luisa' ? 'Cowluisa' : savedKey,
              color_hex: savedKey === 'ana' ? '#4FC7C2' : '#E4699A',
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize ProfileContext:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeProfile();
  }, []);

  const switchProfile = async (profileKey: string): Promise<void> => {
    try {
      await setCurrentProfileKey(profileKey);
      let matched = availableProfiles.find((p) => p.key === profileKey);
      if (!matched) {
        matched = {
          key: profileKey,
          display_name: profileKey === 'ana' ? 'Cowana' : profileKey === 'luisa' ? 'Cowluisa' : profileKey,
          color_hex: profileKey === 'ana' ? '#4FC7C2' : '#E4699A',
        };
      }
      setCurrentUserState(matched);
    } catch (error) {
      console.error('Failed to switch profile:', error);
      throw error;
    }
  };

  const setCurrentUser = async (profile: Profile | null): Promise<void> => {
    try {
      if (profile) {
        await setCurrentProfileKey(profile.key);
      } else {
        await clearCurrentProfileKey();
      }
      setCurrentUserState(profile);
    } catch (error) {
      console.error('Failed to set current user:', error);
      throw error;
    }
  };

  const logoutProfile = async (): Promise<void> => {
    try {
      await clearCurrentProfileKey();
      setCurrentUserState(null);
    } catch (error) {
      console.error('Failed to log out profile:', error);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        currentUser,
        availableProfiles,
        isLoading,
        setCurrentUser,
        switchProfile,
        logoutProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
