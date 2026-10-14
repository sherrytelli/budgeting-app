/**
 * Shared UI primitives styled after the reference styles.css
 * (.btn, .icon-btn, .field, .helper, .segmented, .quiet-row, .spin).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { C, shadow } from '@/constants/theme';
import { Icon } from '@/lib/icons';

/* ---------- press feedback (reference: .btn:active scale(.98)) ---------- */

export function PressableScale({
  onPress,
  disabled,
  style,
  children,
  accessibilityLabel,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) => Animated.timing(scale, { toValue: v, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => to(0.98)}
      onPressOut={() => to(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- buttons ---------- */

export function Btn({
  variant = 'filled',
  danger = false,
  block = false,
  disabled = false,
  onPress,
  children,
  style,
}: {
  variant?: 'filled' | 'text';
  danger?: boolean;
  block?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const filled = variant === 'filled';
  const base: ViewStyle = filled
    ? {
        height: 52,
        paddingHorizontal: 24,
        borderRadius: 999,
        backgroundColor: disabled ? C.btnDisabledBg : pressed ? C.primaryPress : C.primary,
        ...(disabled ? {} : shadow(1)),
      }
    : {
        height: 42,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: pressed ? (danger ? C.redBg : 'rgba(46,122,107,.08)') : 'transparent',
      };
  const textColor = filled ? (disabled ? C.btnDisabledText : C.onPrimary) : danger ? C.red : C.primary;
  const text: TextStyle = {
    color: textColor,
    fontSize: filled ? 15.5 : 14.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  };
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      style={[base, styles.btnCenter, block && styles.block, style]}>
      {typeof children === 'string' || typeof children === 'number' ? <Text style={text}>{children}</Text> : children}
    </Pressable>
  );
}

export function IconBtn({
  name,
  danger = false,
  onPress,
  label,
  size = 19,
  style,
}: {
  name: string;
  danger?: boolean;
  onPress?: () => void;
  label: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const color = pressed ? (danger ? C.red : C.primary) : C.text2;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconBtn, pressed && (danger ? styles.iconBtnDanger : styles.iconBtnHover), style]}>
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

/* ---------- fields ---------- */

export function Field({
  icon,
  prefix,
  trailing,
  ...inputProps
}: {
  icon?: string;
  prefix?: string;
  trailing?: ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocus]}>
      {icon ? <Icon name={icon} size={20} color={C.text3} style={styles.fieldLead} /> : null}
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={C.text3}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
      />
      {trailing}
    </View>
  );
}

export function SelectField({
  icon,
  value,
  placeholder,
  isPlaceholder = false,
  onPress,
}: {
  icon?: string;
  value: ReactNode;
  placeholder?: string;
  isPlaceholder?: boolean;
  onPress?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      style={[styles.field, pressed && styles.fieldFocus]}>
      {icon ? <Icon name={icon} size={20} color={C.text3} style={styles.fieldLead} /> : null}
      <View style={styles.selectVal}>
        {isPlaceholder && placeholder ? (
          <Text style={styles.placeholder} numberOfLines={1}>
            {placeholder}
          </Text>
        ) : (
          value
        )}
      </View>
      <Icon name="chevD" size={18} color={C.text3} />
    </Pressable>
  );
}

export function Helper({ error, children }: { error?: boolean; children: ReactNode }) {
  return <Text style={[styles.helper, error && styles.helperError]}>{children}</Text>;
}

export function QuietRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <View style={styles.quietRow}>
      <Icon name={icon} size={17} color={C.text3} />
      <Text style={styles.quietText}>{children}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const sel = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="button"
            style={[styles.segment, sel && styles.segmentSel]}>
            <Text style={[styles.segmentText, sel && styles.segmentTextSel]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- spinner (reference: .spin) ---------- */

export function Spinner({ size = 20 }: { size?: number }) {
  const [rot] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,.45)',
        borderTopColor: '#fff',
        transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  // Reference .btn { align-items: center; justify-content: center; gap: 8px }
  btnCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnHover: { backgroundColor: 'rgba(46,122,107,.10)' },
  iconBtnDanger: { backgroundColor: C.redBg },
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
  fieldFocus: Platform.select({
    web: { borderColor: C.primary, boxShadow: '0 0 0 3px rgba(46,122,107,.12)' },
    default: { borderColor: C.primary },
  })!,
  fieldLead: { flexShrink: 0 },
  prefix: { fontSize: 14.5, fontWeight: '600', color: C.text2, marginRight: 2 },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: C.text, padding: 0 },
  placeholder: { color: C.text3, fontSize: 15.5 },
  selectVal: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  helper: { fontSize: 12.5, color: C.text3, marginTop: 7, paddingLeft: 6 },
  helperError: { color: C.red },
  quietRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 2, paddingHorizontal: 4 },
  quietText: { color: C.text2, fontSize: 14 },
  segmented: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.outline2,
    backgroundColor: C.surface2,
    overflow: 'hidden',
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentSel: { backgroundColor: C.primaryContainer },
  segmentText: { fontSize: 14.5, fontWeight: '600', color: C.text2 },
  segmentTextSel: { color: C.onPrimaryContainer },
});
