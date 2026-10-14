/**
 * Login screen — port of the reference index.html #screen-login and the
 * login handler in app.js (demo account, 900ms fake delay, session flag).
 */

import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { C, shadow } from '@/constants/theme';
import { Icon } from '@/lib/icons';
import { getSession, setSession } from '@/lib/storage';
import { Btn, PressableScale, Spinner } from '@/components/ui';

const DEMO = { email: 'demo@budget.app', pass: 'budget123' };

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Already signed in? Go straight to the app, like the reference's boot().
  useEffect(() => {
    let mounted = true;
    getSession().then((session) => {
      if (mounted && session === '1') router.replace('/main');
    });
    return () => {
      mounted = false;
    };
  }, []);

  const submit = () => {
    if (busyRef.current) return;
    setError(false);
    busyRef.current = true;
    setBusy(true);
    setTimeout(() => {
      const ok = email.trim().toLowerCase() === DEMO.email && password === DEMO.pass;
      busyRef.current = false;
      setBusy(false);
      if (ok) {
        void setSession('1').then(() => router.replace('/main'));
      } else {
        setError(true);
      }
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Icon name="wallet" size={38} color={C.onPrimaryContainer} />
          </View>
          <Text style={styles.title}>Budget Tracker</Text>
          <Text style={styles.sub}>Sign in to continue</Text>
        </View>
        <View style={styles.form}>
          <FieldRow icon="mail">
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={C.text3}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </FieldRow>
          <FieldRow icon="lock">
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={C.text3}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <PressableScale onPress={() => setShowPass((s) => !s)} accessibilityLabel="Show or hide password" style={styles.eye}>
              <Icon name={showPass ? 'eyeOff' : 'eye'} size={20} color={C.text3} />
            </PressableScale>
          </FieldRow>
          {error ? <Text style={styles.error}>Incorrect email or password</Text> : null}
          <Btn block disabled={busy} onPress={submit}>
            {busy ? <Spinner /> : 'Sign in'}
          </Btn>
          <Text style={styles.hint}>Demo account · demo@budget.app · budget123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Icon name={icon} size={20} color={C.text3} />
      {children}
    </View>
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 54,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: C.outline2,
    borderRadius: 16,
    backgroundColor: C.surface2,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: C.text, padding: 0 },
  eye: { padding: 4 },
  error: { color: C.red, fontSize: 13.5, paddingLeft: 6 },
  hint: { color: C.text3, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
});
