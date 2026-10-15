import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OverlayProvider } from '@/components/overlays';
import { APP_MAX_WIDTH, C } from '@/constants/theme';
import { AppProvider, useApp } from '@/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The reference app is light-only.
const LightOnlyTheme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, text: C.text, primary: C.primary },
};

function RootNavigator() {
  const { hydrated } = useApp();
  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  return (
    <View style={styles.outer}>
      <View style={styles.frame}>
        <OverlayProvider>
          <Stack screenOptions={{ headerShown: false, animation: Platform.OS === 'web' ? 'none' : 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="main" />
          </Stack>
        </OverlayProvider>
      </View>
    </View>
  );
}

// The reference app puts this exact stack on `body`. React Native Web ships its
// own default stack on every <Text>, which resolves to a different face on
// Linux/Windows — so force the reference stack on web to keep glyphs identical.
const REF_FONT = "'Roboto', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

/**
 * Web-only rules that React Native Web has no equivalent for:
 * - the reference font stack (see above);
 * - the reference's focus rings: `input { outline: none }` plus
 *   `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }`
 *   (styles.css:39-42). Without the first rule the UA paints its own blue
 *   outline inside the field on top of the green `.field:focus-within` ring.
 */
const REF_WEB_CSS = `
body, body * { font-family: ${REF_FONT} !important; }
input, input:focus-visible { outline: none; }
:focus-visible { outline: 2px solid ${C.primary}; outline-offset: 2px; }
`;

function useWebReferenceStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.createElement('style');
    el.setAttribute('data-ref-styles', '1');
    el.textContent = REF_WEB_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

export default function RootLayout() {
  useWebReferenceStyles();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={LightOnlyTheme}>
        <AppProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: C.outer,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: APP_MAX_WIDTH,
    backgroundColor: C.bg,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 0 1px rgba(32,38,36,.06), 0 24px 80px rgba(32,38,36,.18)' }
      : null),
  },
});
