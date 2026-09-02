import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Home, ListChecks } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../constants/theme';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBlurFallback]} />
      )}

      <View style={styles.tabsContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const isHome = route.name === 'home';
          const label = isHome ? 'Início' : 'Listas';
          const Icon = isHome ? Home : ListChecks;

          const activeColor = colors.gold;
          const inactiveColor = colors.textTertiary;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                <Icon
                  size={22}
                  color={isFocused ? activeColor : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? activeColor : inactiveColor },
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="lists" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    backgroundColor: 'rgba(22, 20, 28, 0.85)',
    overflow: 'hidden',
  },
  androidBlurFallback: {
    backgroundColor: '#16141CEE',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 80,
  },
  iconWrapper: {
    padding: 4,
    borderRadius: 12,
  },
  iconWrapperActive: {
    backgroundColor: colors.goldSoft,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 3,
  },
  tabLabelActive: {
    fontFamily: fonts.bodySemibold,
  },
});
