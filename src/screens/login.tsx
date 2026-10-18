/**
 * Login screen — port of the reference index.html #screen-login. Authentication
 * goes through the backend's OAuth2 password flow; the returned bearer token is
 * held in memory only, so the user signs in again on every cold start.
 */

import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { C, shadow } from '@/constants/theme';
import { Icon } from '@/lib/icons';
import { useAuth } from '@/lib/auth';
import { Btn, Field, PressableScale, Spinner } from '@/components/ui';

export default function LoginScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Already signed in? Go straight to the app, like the reference's boot().
  useEffect(() => {
    if (auth.ready && auth.token) router.replace('/main');
  }, [auth.ready, auth.token]);

  const submit = () => {
    if (busyRef.current) return;
    setError(false);
    busyRef.current = true;
    setBusy(true);
    auth
      .signIn(email.trim(), password)
      .then(() => router.replace('/main'))
      .catch(() => setError(true))
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Icon name="wallet" size={38} color={C.onPrimaryContainer} />
          </View>
          <Text style={styles.title}>Budget Tracker</Text>
          <Text style={styles.sub}>Sign in to continue</Text>
        </View>
        <View style={styles.form}>
          <Field
            icon="mail"
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            icon="lock"
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            trailing={
              <PressableScale onPress={() => setShowPass((s) => !s)} accessibilityLabel="Show or hide password" style={styles.eye}>
                <Icon name={showPass ? 'eyeOff' : 'eye'} size={20} color={C.text3} />
              </PressableScale>
            }
          />
          {error ? <Text style={styles.error}>Incorrect email or password</Text> : null}
          <Btn block disabled={busy} onPress={submit}>
            {busy ? <Spinner /> : 'Sign in'}
          </Btn>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  hero: { alignItems: 'center', marginTop: -48, marginBottom: 38 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(1),
  },
  title: { fontSize: 26, fontWeight: '800', marginTop: 20, letterSpacing: 0.2, color: C.text },
  sub: { color: C.text2, fontSize: 14.5, marginTop: 7 },
  form: { width: '100%', maxWidth: 340, gap: 14 },
  eye: { padding: 4 },
  error: { color: C.red, fontSize: 13.5, paddingLeft: 6 },
});
