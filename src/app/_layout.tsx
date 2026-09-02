import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as useFrauncesFonts, Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ProfileProvider } from '../contexts/ProfileContext';
import { colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
  });

  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fontsLoaded = frauncesLoaded && interLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ProfileProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgBase },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="list/[id]" />
        <Stack.Screen name="movie/[id]" />
      </Stack>
    </ProfileProvider>
  );
}
